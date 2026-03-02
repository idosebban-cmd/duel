'use strict';

const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const dotDash = require('../services/dotDashService');

// POST /api/dotdash/create
// Body: { player1Id, player1Name, player1Avatar?, player2Id?, player2Name? }
router.post('/create', (req, res) => {
  const { player1Id, player1Name, player1Avatar, player2Id, player2Name, player2Avatar } = req.body;

  if (!player1Id) return res.status(400).json({ error: 'player1Id required' });

  const gameId = uuidv4();
  const game = dotDash.createGame(
    gameId,
    { userId: player1Id, name: player1Name || 'Player 1', avatar: player1Avatar || null },
    { userId: player2Id || 'player2', name: player2Name || 'Opponent', avatar: player2Avatar || null },
  );

  res.json({ gameId: game.gameId, message: 'Dot Dash lobby created' });
});

// POST /api/dotdash/:gameId/join
// Body: { userId, name, avatar? }
router.post('/:gameId/join', (req, res) => {
  const { userId, name, avatar } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const game = dotDash.getGame(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (game.phase !== 'lobby') return res.status(400).json({ error: 'Game already started' });

  // Player 1 re-joining – nothing to register
  if (game.player1.userId === userId) return res.json({ gameId: game.gameId });

  // Claim player 2 slot
  if (game.player2.userId === userId || game.player2.userId === 'player2') {
    game.player2.userId = userId;
    game.player2.name   = name   || game.player2.name;
    game.player2.avatar = avatar || game.player2.avatar;
    return res.json({ gameId: game.gameId });
  }

  res.status(400).json({ error: 'Game is full' });
});

// GET /api/dotdash/:gameId
router.get('/:gameId', (req, res) => {
  const game = dotDash.getGame(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  res.json({ gameId: game.gameId, phase: game.phase });
});

module.exports = router;
