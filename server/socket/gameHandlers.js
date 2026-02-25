const gameService = require('../services/gameService');

// Map userId → socketId for reconnection
const userSockets = new Map();
// Map gameId → Set of userIds in that game room
const gameRooms = new Map();
// Lobby timers
const lobbyTimers = new Map();

function setupGameHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ─── JOIN LOBBY ───────────────────────────────────────────────
    socket.on('join_lobby', ({ gameId, userId }) => {
      const game = gameService.getGame(gameId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      // Register socket
      userSockets.set(userId, socket.id);
      socket.data.userId = userId;
      socket.data.gameId = gameId;

      socket.join(gameId);
      if (!gameRooms.has(gameId)) gameRooms.set(gameId, new Set());
      gameRooms.get(gameId).add(userId);

      console.log(`[Lobby] ${userId} joined game ${gameId}`);

      // Start lobby expiry timer (only once)
      if (!lobbyTimers.has(gameId)) {
        const expiresAt = new Date(game.lobbyExpiresAt).getTime();
        const delay = expiresAt - Date.now();
        const timer = setTimeout(() => {
          const g = gameService.getGame(gameId);
          if (g && g.phase === 'lobby') {
            gameService.cancelGame(gameId);
            io.to(gameId).emit('lobby_expired', { message: 'Time is up! Game cancelled.' });
            lobbyTimers.delete(gameId);
          }
        }, Math.max(delay, 0));
        lobbyTimers.set(gameId, timer);
      }

      // Send current lobby state to the joining player
      const isPlayer1 = game.player1.userId === userId;
      const isPlayer2 = game.player2.userId === userId;
      if (!isPlayer1 && !isPlayer2) {
        socket.emit('error', { message: 'You are not part of this game' });
        return;
      }

      emitLobbyUpdate(io, gameId, game);
    });

    // ─── PLAYER READY ─────────────────────────────────────────────
    socket.on('player_ready', ({ gameId, userId }) => {
      const game = gameService.setPlayerReady(gameId, userId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      console.log(`[Lobby] ${userId} is ready in game ${gameId}`);
      emitLobbyUpdate(io, gameId, game);

      // Both ready → start countdown then game
      if (game.player1.ready && game.player2.ready && game.phase === 'lobby') {
        io.to(gameId).emit('game_starting', { countdown: 3 });

        setTimeout(() => {
          const startedGame = gameService.startGame(gameId);
          if (startedGame) {
            // Send each player their own view
            sendGameStarted(io, gameId, startedGame);

            // Clear lobby timer
            if (lobbyTimers.has(gameId)) {
              clearTimeout(lobbyTimers.get(gameId));
              lobbyTimers.delete(gameId);
            }
          }
        }, 4000); // 3-2-1-GO = 4 seconds
      }
    });

    // ─── CANCEL GAME ─────────────────────────────────────────────
    socket.on('cancel_game', ({ gameId, userId }) => {
      const game = gameService.cancelGame(gameId);
      if (game) {
        io.to(gameId).emit('game_cancelled', { cancelledBy: userId, message: 'Game was cancelled.' });
        if (lobbyTimers.has(gameId)) {
          clearTimeout(lobbyTimers.get(gameId));
          lobbyTimers.delete(gameId);
        }
      }
    });

    // ─── ASK QUESTION ────────────────────────────────────────────
    socket.on('ask_question', ({ gameId, userId, question }) => {
      const validationError = gameService.validateQuestion(question);
      if (validationError) {
        socket.emit('question_error', { message: validationError });
        return;
      }

      const result = gameService.askQuestion(gameId, userId, question);
      if (result.error) {
        socket.emit('error', { message: result.error });
        return;
      }

      console.log(`[Game] ${userId} asked: "${question}" in ${gameId}`);

      // Broadcast to both players
      io.to(gameId).emit('question_asked', {
        question,
        askedBy: userId,
        gameId,
      });
    });

    // ─── ANSWER QUESTION ─────────────────────────────────────────
    socket.on('answer_question', ({ gameId, userId, answer }) => {
      const result = gameService.answerQuestion(gameId, userId, answer);
      if (result.error) {
        socket.emit('error', { message: result.error });
        return;
      }

      console.log(`[Game] ${userId} answered: "${answer}" in ${gameId}`);

      io.to(gameId).emit('question_answered', {
        answer,
        answeredBy: userId,
        gameId,
      });
    });

    // ─── FLIP CARDS ──────────────────────────────────────────────
    socket.on('flip_cards', ({ gameId, userId, cardIds }) => {
      const result = gameService.flipCards(gameId, userId, cardIds);
      if (result.error) {
        socket.emit('error', { message: result.error });
        return;
      }

      io.to(gameId).emit('cards_flipped', {
        flippedBy: userId,
        cardIds,
        gameId,
      });
    });

    // ─── END TURN ────────────────────────────────────────────────
    socket.on('end_turn', ({ gameId, userId }) => {
      const result = gameService.endTurn(gameId, userId);
      if (result.error) {
        socket.emit('error', { message: result.error });
        return;
      }

      const game = result.game;
      console.log(`[Game] Turn changed to ${game.currentTurn} in ${gameId}`);

      io.to(gameId).emit('turn_changed', {
        currentTurn: game.currentTurn,
        gameId,
      });
    });

    // ─── MAKE GUESS ──────────────────────────────────────────────
    socket.on('make_guess', ({ gameId, userId, guessedCharacterId }) => {
      const result = gameService.makeGuess(gameId, userId, guessedCharacterId);
      if (result.error) {
        socket.emit('error', { message: result.error });
        return;
      }

      const { game, correct, winner } = result;
      const revealed = gameService.getRevealedView(game);

      console.log(`[Game] ${userId} guessed ${guessedCharacterId} - correct: ${correct} in ${gameId}`);

      // Send game_over with full reveal to both players
      io.to(gameId).emit('game_over', {
        winner,
        loser: winner === game.player1.userId ? game.player2.userId : game.player1.userId,
        correctCharacter: correct
          ? gameService.getGame(gameId) // already set
          : null,
        player1SecretId: revealed.player1.secretCharacterId,
        player2SecretId: revealed.player2.secretCharacterId,
        guessedCharacterId,
        guessedBy: userId,
        correct,
        characters: game.characters,
        gameId,
      });
    });

    // ─── DISCONNECT ──────────────────────────────────────────────
    socket.on('disconnect', () => {
      const { userId, gameId } = socket.data;
      if (!userId || !gameId) return;

      console.log(`[Socket] Disconnected: ${userId} from ${gameId}`);

      userSockets.delete(userId);

      const game = gameService.getGame(gameId);
      if (!game || game.phase === 'finished' || game.phase === 'cancelled') return;

      // Notify opponent
      socket.to(gameId).emit('opponent_disconnected', {
        message: 'Your opponent disconnected. Waiting 30 seconds...',
        waitTime: 30,
      });

      // Grace period: 30s, then forfeit
      const forfeitTimer = setTimeout(() => {
        const g = gameService.getGame(gameId);
        if (!g || g.phase !== 'playing') return;
        if (!userSockets.has(userId)) {
          // Still disconnected → opponent wins
          const opponentId =
            g.player1.userId === userId ? g.player2.userId : g.player1.userId;
          g.winner = opponentId;
          g.phase = 'finished';
          g.finishedAt = new Date();
          const revealed = gameService.getRevealedView(g);
          io.to(gameId).emit('game_over', {
            winner: opponentId,
            loser: userId,
            player1SecretId: revealed.player1.secretCharacterId,
            player2SecretId: revealed.player2.secretCharacterId,
            forfeit: true,
            characters: g.characters,
            gameId,
          });
        }
      }, 30000);

      // Store timer so we can cancel if they reconnect
      socket.data.forfeitTimer = forfeitTimer;
    });

    // ─── RECONNECT ───────────────────────────────────────────────
    socket.on('rejoin_game', ({ gameId, userId }) => {
      const game = gameService.getGame(gameId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const isPlayer1 = game.player1.userId === userId;
      const isPlayer2 = game.player2.userId === userId;
      if (!isPlayer1 && !isPlayer2) {
        socket.emit('error', { message: 'You are not part of this game' });
        return;
      }

      userSockets.set(userId, socket.id);
      socket.data.userId = userId;
      socket.data.gameId = gameId;
      socket.join(gameId);

      console.log(`[Socket] Reconnected: ${userId} to ${gameId}`);

      // Notify opponent that player is back
      socket.to(gameId).emit('opponent_reconnected', {
        message: 'Opponent reconnected! Game resumed.',
      });

      // Send full game state to reconnected player
      const view = gameService.getPlayerView(game, userId);
      socket.emit('game_rejoined', { gameState: view });
    });
  });
}

function emitLobbyUpdate(io, gameId, game) {
  const timeRemaining = Math.max(0, Math.floor((new Date(game.lobbyExpiresAt) - Date.now()) / 1000));
  io.to(gameId).emit('lobby_updated', {
    player1: { userId: game.player1.userId, name: game.player1.name, avatar: game.player1.avatar, ready: game.player1.ready },
    player2: { userId: game.player2.userId, name: game.player2.name, avatar: game.player2.avatar, ready: game.player2.ready },
    timeRemaining,
    gameId,
  });
}

function sendGameStarted(io, gameId, game) {
  // Send each player their personalized view (with their own secret)
  const sockets = io.sockets.adapter.rooms.get(gameId);
  if (!sockets) return;

  for (const socketId of sockets) {
    const s = io.sockets.sockets.get(socketId);
    if (!s) continue;
    const uid = s.data.userId;
    const view = gameService.getPlayerView(game, uid);
    s.emit('game_started', { gameState: view });
  }
}

module.exports = { setupGameHandlers };
