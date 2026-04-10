'use strict';

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const mazeRace = require('../services/mazeRaceService');

router.post('/create', (req, res) => {
  const {
    gameId: requestedGameId,
    player1Id,
    player1Name,
    player2Id,
    player2Name,
  } = req.body;

  if (!player1Id) return res.status(400).json({ error: 'player1Id required' });

  if (requestedGameId) {
    const existing = mazeRace.getGame(requestedGameId);
    // If existing is null (e.g. server restart / memory cleared), fall through and
    // create a fresh lobby for the same id — never 404 on POST /create.
    if (existing) {
      if (existing.phase === 'finished') {
        mazeRace.deleteGame(requestedGameId);
      } else {
        return res.json({
          gameId: existing.gameId,
          message: 'Maze Race lobby already exists',
        });
      }
    }
  }

  const gameId = requestedGameId || uuidv4();
  mazeRace.createGame(
    gameId,
    player1Id,
    player2Id || 'player2',
    player1Name || 'Player 1',
    player2Name || 'Opponent',
  );

  res.json({ gameId, message: 'Maze Race lobby created' });
});

router.get('/:gameId', (req, res) => {
  const game = mazeRace.getGame(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  res.json({ gameId: game.gameId, phase: game.phase });
});

module.exports = router;
