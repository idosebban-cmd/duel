'use strict';

const dotDash = require('../services/dotDashService');
const { noopSocketLobbyLog } = require('../socketLobbyLog');
const { noopSocketRoomDebug } = require('../socketRoomDebug');

// gameId → NodeJS interval handle
const gameLoops = new Map();
// userId → socketId  (for disconnect detection)
const userSockets = new Map();
// gameId → { disconnect timers per userId }
const disconnectTimers = new Map();
const pendingLobbyStartByGameId = new Map();
// gameId → { resolve, timer } — pending game starts waiting for room presence
const pendingPresenceChecks = new Map();

function setupDotDashHandlers(io, log = noopSocketLobbyLog, roomDbg = noopSocketRoomDebug) {
  io.on('connection', (socket) => {

    // ── JOIN LOBBY ────────────────────────────────────────────────────────────
    socket.on('dd_join_lobby', ({ gameId, userId }) => {
      const game = dotDash.getGame(gameId);
      if (!game) {
        log.playerJoinLobby('dotdash', { gameId, userId, ok: false, detail: 'game_not_found' });
        socket.emit('dd_error', { message: 'Game not found' });
        return;
      }

      const isP1 = game.player1.userId === userId;
      const isP2 = game.player2.userId === userId;
      if (!isP1 && !isP2) {
        log.playerJoinLobby('dotdash', { gameId, userId, ok: false, detail: 'not_in_game' });
        socket.emit('dd_error', { message: 'Not in this game' });
        return;
      }

      // Idempotent guard: if this socket already joined this game, just re-send state
      if (socket.data.ddGameId === gameId && socket.data.ddUserId === userId) {
        log.playerJoinLobby('dotdash', { gameId, userId, ok: true, detail: 'duplicate_join_ignored', phase: game.phase });
        emitLobbyUpdate(io, gameId, game);
        // Still resolve pending presence checks and push game state on duplicate joins
        resolvePresenceCheck(gameId);
        if (game.phase === 'playing') {
          socket.emit('dd_game_started', { gameState: dotDash.serializeGame(game) });
        }
        return;
      }

      userSockets.set(userId, socket.id);
      socket.data.ddUserId  = userId;
      socket.data.ddGameId  = gameId;
      socket.join(`dd:${gameId}`);

      let resumedFromDisconnect = false;
      // Cancel any pending disconnect forfeit
      const dt = disconnectTimers.get(gameId);
      if (dt && dt[userId]) {
        clearTimeout(dt[userId]);
        delete dt[userId];
        resumedFromDisconnect = true;
        socket.to(`dd:${gameId}`).emit('dd_opponent_reconnected');
      }

      log.playerJoinLobby('dotdash', { gameId, userId, ok: true, phase: game.phase });
      if (resumedFromDisconnect) {
        log.playerReconnect('dotdash', {
          gameId,
          userId,
          restored: true,
          phase: game.phase,
          player1Ready: game.player1.ready,
          player2Ready: game.player2.ready,
          detail: 'lobby_room_rejoined',
        });
      }

      emitLobbyUpdate(io, gameId, game);

      // If a game start is pending on room presence, re-check now (event-driven)
      resolvePresenceCheck(gameId);

      // If game already started, push current state so late-joiners can navigate
      if (game.phase === 'playing') {
        socket.emit('dd_game_started', {
          gameState: dotDash.serializeGame(game),
        });
      }
    });

    // ── PLAYER READY ──────────────────────────────────────────────────────────
    socket.on('dd_player_ready', ({ gameId, userId }) => {
      const game = dotDash.setPlayerReady(gameId, userId);
      if (!game) { socket.emit('dd_error', { message: 'Game not found' }); return; }

      log.playerReady('dotdash', {
        gameId,
        userId,
        player1Ready: game.player1.ready,
        player2Ready: game.player2.ready,
      });
      emitLobbyUpdate(io, gameId, game);

      if (game.player1.ready && game.player2.ready && game.phase === 'lobby') {
        if (pendingLobbyStartByGameId.has(gameId)) {
          return;
        }
        pendingLobbyStartByGameId.set(gameId, true);

        const roomName = `dd:${gameId}`;
        const p1Id = game.player1.userId;
        const p2Id = game.player2.userId;

        // Event-driven wait: verify both players are in the room (up to 5 s)
        waitForBothInRoom(io, roomName, gameId, p1Id, p2Id, 5000).then((bothIn) => {
          const g = dotDash.getGame(gameId);
          if (!g || g.phase !== 'lobby') {
            pendingLobbyStartByGameId.delete(gameId);
            return;
          }
          if (!bothIn) {
            // Timeout — reset pending flag so players can retry
            pendingLobbyStartByGameId.delete(gameId);
            log.bothReadyGameStarting('dotdash', { gameId, detail: 'presence_timeout' });
            emitLobbyUpdate(io, gameId, g);
            return;
          }

          log.bothReadyGameStarting('dotdash', { gameId });
          // 3-2-1 countdown then start
          io.to(roomName).emit('dd_game_starting', { countdown: 3 });
          setTimeout(async () => {
            pendingLobbyStartByGameId.delete(gameId);
            // Re-verify room presence after countdown in case a player dropped
            const stillBothIn = await areBothInRoom(io, roomName, p1Id, p2Id);
            if (!stillBothIn) {
              // Wait up to 5 s for the missing player to rejoin
              const recovered = await waitForBothInRoom(io, roomName, gameId, p1Id, p2Id, 5000);
              if (!recovered) {
                const latest = dotDash.getGame(gameId);
                if (latest) emitLobbyUpdate(io, gameId, latest);
                return;
              }
            }
            const started = dotDash.startGame(gameId);
            if (!started) return;
            io.to(roomName).emit('dd_game_started', {
              gameState: dotDash.serializeGame(started),
            });
            startGameLoop(io, gameId, roomDbg);
          }, 4000);
        });
      }
    });

    // ── PLAYER MOVE ───────────────────────────────────────────────────────────
    socket.on('dd_move', ({ gameId, userId, direction }) => {
      dotDash.queueDirection(gameId, userId, direction);
    });

    // ── FORFEIT (manual exit) ─────────────────────────────────────────────────
    socket.on('dd_forfeit', ({ gameId, userId }) => {
      const game = dotDash.getGame(gameId);
      if (!game || game.phase !== 'playing') return;
      const opponentId = game.player1.userId === userId
        ? game.player2.userId : game.player1.userId;
      endGame(io, gameId, opponentId, true);
    });

    // ── DISCONNECT ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const userId  = socket.data.ddUserId;
      const gameId  = socket.data.ddGameId;
      if (!userId || !gameId) return;

      userSockets.delete(userId);

      const game = dotDash.getGame(gameId);
      const phase = game ? game.phase : 'game_missing';
      log.playerDisconnect('dotdash', {
        gameId,
        disconnectedUserId: userId,
        phase,
      });
      if (!game || game.phase === 'finished') return;

      socket.to(`dd:${gameId}`).emit('dd_opponent_disconnected', {
        message: 'Opponent disconnected — waiting 30 s…',
      });

      // 30 s grace period then forfeit
      if (!disconnectTimers.has(gameId)) disconnectTimers.set(gameId, {});
      disconnectTimers.get(gameId)[userId] = setTimeout(() => {
        const g = dotDash.getGame(gameId);
        if (!g || g.phase !== 'playing') return;
        if (!userSockets.has(userId)) {
          const opponentId = g.player1.userId === userId
            ? g.player2.userId : g.player1.userId;
          endGame(io, gameId, opponentId, true);
        }
      }, 30_000);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME LOOP (20 tps)
// ─────────────────────────────────────────────────────────────────────────────
function startGameLoop(io, gameId, roomDbg = noopSocketRoomDebug) {
  if (gameLoops.has(gameId)) return;

  const interval = setInterval(() => {
    const game = dotDash.getGame(gameId);
    if (!game) { stopGameLoop(gameId); return; }
    if (game.phase !== 'playing') { stopGameLoop(gameId); return; }

    const { winner } = dotDash.tick(game);

    roomDbg.logDdGameTickRoom(io, gameId);
    io.to(`dd:${gameId}`).emit('dd_game_tick', {
      gameState: dotDash.serializeGame(game),
    });

    if (winner) {
      stopGameLoop(gameId);
      const state = dotDash.serializeGame(game);
      setTimeout(() => {
        io.to(`dd:${gameId}`).emit('dd_game_over', {
          winner,
          finalScores: state.finalScores,
          gameState:   state,
        });
      }, 200); // slight delay so clients see last tick
    }
  }, 50); // 20 tps

  gameLoops.set(gameId, interval);
  console.log(`[DotDash] Game loop started for ${gameId}`);
}

function stopGameLoop(gameId) {
  if (gameLoops.has(gameId)) {
    clearInterval(gameLoops.get(gameId));
    gameLoops.delete(gameId);
    console.log(`[DotDash] Game loop stopped for ${gameId}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOM PRESENCE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Check if both players have a socket in the given room. */
async function areBothInRoom(io, roomName, player1Id, player2Id) {
  const sockets = await io.in(roomName).fetchSockets();
  const idsInRoom = new Set(sockets.map((s) => s.data.ddUserId));
  return idsInRoom.has(player1Id) && idsInRoom.has(player2Id);
}

/**
 * Event-driven wait for both players to be present in the Socket.IO room.
 * Returns true if both present, false on timeout.
 *
 * The join handler calls `resolvePresenceCheck(gameId)` when a player
 * joins, which re-checks room membership and resolves the promise.
 */
function waitForBothInRoom(io, roomName, gameId, player1Id, player2Id, timeoutMs) {
  return new Promise((resolve) => {
    const check = async () => {
      if (await areBothInRoom(io, roomName, player1Id, player2Id)) {
        cleanup();
        resolve(true);
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      pendingPresenceChecks.delete(gameId);
    };
    pendingPresenceChecks.set(gameId, { check, timer });
    // Initial check — may already be resolved
    check();
  });
}

/** Called from the join handler when a player enters the room. */
function resolvePresenceCheck(gameId) {
  const pending = pendingPresenceChecks.get(gameId);
  if (pending) pending.check();
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function emitLobbyUpdate(io, gameId, game) {
  const timeRemaining = Math.max(0,
    Math.floor((new Date(game.lobbyExpiresAt) - Date.now()) / 1000));
  io.to(`dd:${gameId}`).emit('dd_lobby_updated', {
    player1: {
      userId: game.player1.userId,
      name:   game.player1.name,
      avatar: game.player1.avatar,
      ready:  game.player1.ready,
    },
    player2: {
      userId: game.player2.userId,
      name:   game.player2.name,
      avatar: game.player2.avatar,
      ready:  game.player2.ready,
    },
    timeRemaining,
    gameId,
  });
}

function endGame(io, gameId, winnerId, forfeit = false) {
  stopGameLoop(gameId);
  const game = dotDash.getGame(gameId);
  if (!game) return;

  game.phase    = 'finished';
  game.winner   = winnerId;
  game.finalScores = {
    player1: game.player1.score,
    player2: game.player2.score,
  };

  io.to(`dd:${gameId}`).emit('dd_game_over', {
    winner:      winnerId,
    forfeit:     forfeit || false,
    finalScores: game.finalScores,
    gameState:   dotDash.serializeGame(game),
  });
}

module.exports = { setupDotDashHandlers, stopGameLoop };
