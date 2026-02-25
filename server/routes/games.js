const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const gameService = require('../services/gameService');

// POST /api/games/create - Create a new game lobby
// In production this would be called after a match is made
router.post('/create', (req, res) => {
  const { matchId, player1Id, player1Name, player1Avatar, player2Id, player2Name, player2Avatar } = req.body;

  if (!player1Id || !player2Id) {
    return res.status(400).json({ error: 'player1Id and player2Id are required' });
  }

  const game = gameService.initializeGame(
    matchId || uuidv4(),
    player1Id, player1Name || 'Player 1', player1Avatar || '🎮',
    player2Id, player2Name || 'Player 2', player2Avatar || '🎯'
  );

  res.json({
    gameId: game.gameId,
    matchId: game.matchId,
    message: 'Game lobby created',
  });
});

// POST /api/games/:gameId/join - Register as player 2 in an open lobby
router.post('/:gameId/join', (req, res) => {
  const { userId, name, avatar } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const game = gameService.getGame(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (game.phase !== 'lobby') return res.status(400).json({ error: 'Game is not accepting players' });

  // Already player 1 — nothing to register
  if (game.player1.userId === userId) {
    return res.json({ gameId: game.gameId });
  }

  // Claim the player 2 slot (or re-confirm an existing registration)
  if (game.player2.userId === userId || game.player2.userId === 'player2') {
    game.player2.userId = userId;
    game.player2.name = name || game.player2.name;
    game.player2.avatar = avatar || game.player2.avatar;
    return res.json({ gameId: game.gameId });
  }

  return res.status(400).json({ error: 'Game is full' });
});

// GET /api/games/:gameId - Get game state (for debugging / reconnect)
router.get('/:gameId', (req, res) => {
  const game = gameService.getGame(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  const { userId } = req.query;
  if (userId) {
    return res.json(gameService.getPlayerView(game, userId));
  }
  // Return minimal public info
  res.json({
    gameId: game.gameId,
    phase: game.phase,
    currentTurn: game.currentTurn,
    createdAt: game.createdAt,
  });
});

// GET /api/games - List active games (debug)
router.get('/', (req, res) => {
  const games = [];
  for (const [gameId, game] of gameService.getAllGames()) {
    games.push({ gameId, phase: game.phase, matchId: game.matchId });
  }
  res.json(games);
});

module.exports = router;
