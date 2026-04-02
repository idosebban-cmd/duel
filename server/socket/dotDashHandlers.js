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
        log.bothReadyGameStarting('dotdash', { gameId });
        // 3-2-1 countdown then start
        io.to(`dd:${gameId}`).emit('dd_game_starting', { countdown: 3 });
        setTimeout(() => {
          pendingLobbyStartByGameId.delete(gameId);
          const started = dotDash.startGame(gameId);
          if (!started) return;
          io.to(`dd:${gameId}`).emit('dd_game_started', {
            gameState: dotDash.serializeGame(started),
          });
          startGameLoop(io, gameId, roomDbg);
        }, 4000);
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
