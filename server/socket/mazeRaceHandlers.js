'use strict';

const mazeRace = require('../services/mazeRaceService');
const { noopSocketLobbyLog } = require('../socketLobbyLog');
const { noopSocketRoomDebug } = require('../socketRoomDebug');

const gameLoops = new Map();
const userSockets = new Map();
const disconnectTimers = new Map();

function setupMazeRaceHandlers(io, log = noopSocketLobbyLog, roomDbg = noopSocketRoomDebug) {
  io.on('connection', (socket) => {
    socket.on('mr_join', ({ gameId, userId }) => {
      const game = mazeRace.getGame(gameId);
      if (!game) {
        log.playerJoinLobby('mazerace', { gameId, userId, ok: false, detail: 'game_not_found' });
        socket.emit('mr_error', { message: 'Game not found' });
        socket.emit('mr_game_expired', {});
        return;
      }

      const isP1 = game.player1.userId === userId;
      const isP2 = game.player2.userId === userId;
      if (!isP1 && !isP2) {
        log.playerJoinLobby('mazerace', { gameId, userId, ok: false, detail: 'not_in_game' });
        socket.emit('mr_error', { message: 'Not in this game' });
        return;
      }

      userSockets.set(userId, socket.id);
      socket.data.mrUserId = userId;
      socket.data.mrGameId = gameId;
      socket.join(`mr:${gameId}`);

      let resumedFromDisconnect = false;
      const dt = disconnectTimers.get(gameId);
      if (dt && dt[userId]) {
        clearTimeout(dt[userId]);
        delete dt[userId];
        resumedFromDisconnect = true;
        socket.to(`mr:${gameId}`).emit('mr_opponent_reconnected');
      }

      log.playerJoinLobby('mazerace', { gameId, userId, ok: true, phase: game.phase });
      if (resumedFromDisconnect) {
        log.playerReconnect('mazerace', {
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

    socket.on('mr_ready', ({ gameId, userId }) => {
      const game = mazeRace.setPlayerReady(gameId, userId);
      if (!game) {
        socket.emit('mr_error', { message: 'Game not found' });
        socket.emit('mr_game_expired', {});
        return;
      }

      log.playerReady('mazerace', {
        gameId,
        userId,
        player1Ready: game.player1.ready,
        player2Ready: game.player2.ready,
      });
      emitLobbyUpdate(io, gameId, game);

      if (game.player1.ready && game.player2.ready && game.phase === 'lobby') {
        log.bothReadyGameStarting('mazerace', { gameId });
        game.phase = 'countdown';
        io.to(`mr:${gameId}`).emit('mr_countdown', { count: 3 });
        setTimeout(() => {
          const g = mazeRace.getGame(gameId);
          if (!g || g.phase !== 'countdown') return;
          io.to(`mr:${gameId}`).emit('mr_countdown', { count: 2 });
        }, 1000);
        setTimeout(() => {
          const g = mazeRace.getGame(gameId);
          if (!g || g.phase !== 'countdown') return;
          io.to(`mr:${gameId}`).emit('mr_countdown', { count: 1 });
        }, 2000);
        setTimeout(() => {
          const started = mazeRace.startGame(gameId);
          if (!started) return;
          io.to(`mr:${gameId}`).emit('mr_game_started', {
            gameState: mazeRace.serializeGame(started),
          });
          startGameLoop(io, gameId);
        }, 3000);
      }
    });

    socket.on('mr_move', ({ gameId, userId, direction }) => {
      const { won } = mazeRace.movePlayer(gameId, userId, direction);
      if (won) {
        stopGameLoop(gameId);
        const g = mazeRace.getGame(gameId);
        if (!g) return;
        const finalState = mazeRace.serializeGame(g);
        setTimeout(() => {
          io.to(`mr:${gameId}`).emit('mr_game_over', {
            winner: g.winner,
            finalState,
          });
        }, 200);
      }
    });

    socket.on('mr_forfeit', ({ gameId, userId }) => {
      const game = mazeRace.getGame(gameId);
      if (!game || game.phase !== 'playing') return;
      const opponentId = game.player1.userId === userId
        ? game.player2.userId
        : game.player1.userId;
      endGame(io, gameId, opponentId, true);
    });

    socket.on('disconnect', () => {
      const userId = socket.data.mrUserId;
      const gameId = socket.data.mrGameId;
      if (!userId || !gameId) return;

      userSockets.delete(userId);

      const game = mazeRace.getGame(gameId);
      const phase = game ? game.phase : 'game_missing';
      log.playerDisconnect('mazerace', {
        gameId,
        disconnectedUserId: userId,
        phase,
      });
      if (!game || game.phase === 'finished') return;

      socket.to(`mr:${gameId}`).emit('mr_opponent_disconnected', {});

      if (!disconnectTimers.has(gameId)) disconnectTimers.set(gameId, {});
      disconnectTimers.get(gameId)[userId] = setTimeout(() => {
        const g = mazeRace.getGame(gameId);
        if (!g || g.phase !== 'playing') return;
        if (!userSockets.has(userId)) {
          const opponentId = g.player1.userId === userId
            ? g.player2.userId
            : g.player1.userId;
          endGame(io, gameId, opponentId, true);
        }
      }, 30_000);
    });
  });
}

function startGameLoop(io, gameId) {
  if (gameLoops.has(gameId)) return;

  const interval = setInterval(() => {
    const game = mazeRace.getGame(gameId);
    if (!game) {
      stopGameLoop(gameId);
      return;
    }
    if (game.phase !== 'playing') {
      stopGameLoop(gameId);
      return;
    }

    roomDbg.logMrTickRoom(io, gameId);
    io.to(`mr:${gameId}`).emit('mr_tick', {
      player1: { x: game.player1.x, y: game.player1.y },
      player2: { x: game.player2.x, y: game.player2.y },
    });
  }, 50);

  gameLoops.set(gameId, interval);
  console.log(`[MazeRace] Game loop started for ${gameId}`);
}

function stopGameLoop(gameId) {
  if (gameLoops.has(gameId)) {
    clearInterval(gameLoops.get(gameId));
    gameLoops.delete(gameId);
    console.log(`[MazeRace] Game loop stopped for ${gameId}`);
  }
}

function emitLobbyUpdate(io, gameId, game) {
  io.to(`mr:${gameId}`).emit('mr_lobby_update', {
    player1Ready: game.player1.ready,
    player2Ready: game.player2.ready,
    player1Name: game.player1.name,
    player2Name: game.player2.name,
  });
}

function endGame(io, gameId, winnerId, forfeit = false) {
  stopGameLoop(gameId);
  const game = mazeRace.getGame(gameId);
  if (!game) return;

  game.phase = 'finished';
  game.winner = winnerId;
  game.finishedAt = Date.now();

  const finalState = mazeRace.serializeGame(game);
  io.to(`mr:${gameId}`).emit('mr_game_over', {
    winner: winnerId,
    finalState,
    forfeit: forfeit || false,
  });
}

module.exports = { setupMazeRaceHandlers, stopGameLoop };
