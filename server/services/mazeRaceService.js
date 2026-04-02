'use strict';

const mazes = require('../data/mazeRaceMazes');

const games = new Map();

const DIR_DELTA = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

const P1_START = mazes.P1_START;
const P1_EXIT = mazes.P1_EXIT;
const P2_START = { x: P1_EXIT.x, y: P1_EXIT.y };
const P2_EXIT = { x: P1_START.x, y: P1_START.y };

function makePlayer(userId, name) {
  return {
    userId,
    name: name || 'Player',
    x: -1,
    y: -1,
    ready: false,
  };
}

function createGame(gameId, player1Id, player2Id, p1Name, p2Name) {
  const game = {
    gameId,
    matchId: gameId,
    phase: 'lobby',
    maze: null,
    mazeIndex: -1,
    player1: makePlayer(player1Id, p1Name),
    player2: makePlayer(player2Id || 'player2', p2Name),
    winner: null,
    startedAt: null,
    finishedAt: null,
    lobbyExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
  };
  games.set(gameId, game);
  return game;
}

function getGame(gameId) {
  return games.get(gameId) || null;
}

function deleteGame(gameId) {
  games.delete(gameId);
}

function setPlayerReady(gameId, userId) {
  const game = getGame(gameId);
  if (!game) return null;
  const p = game.player1.userId === userId ? game.player1 : game.player2;
  p.ready = true;
  return game;
}

function startGame(gameId) {
  const game = getGame(gameId);
  if (!game) return null;
  game.mazeIndex = -1;
  game.maze = mazes.cloneMaze(mazes.generateMaze());
  game.player1.x = P1_START.x;
  game.player1.y = P1_START.y;
  game.player2.x = P2_START.x;
  game.player2.y = P2_START.y;
  game.phase = 'playing';
  game.startedAt = Date.now();
  return game;
}

function movePlayer(gameId, userId, direction) {
  const game = getGame(gameId);
  if (!game || game.phase !== 'playing' || !game.maze) {
    return { moved: false, won: false };
  }
  if (!DIR_DELTA[direction]) return { moved: false, won: false };

  if (game.player1.userId !== userId && game.player2.userId !== userId) {
    return { moved: false, won: false };
  }
  const p = game.player1.userId === userId ? game.player1 : game.player2;

  const { dx, dy } = DIR_DELTA[direction];
  const nx = p.x + dx;
  const ny = p.y + dy;

  if (nx < 0 || ny < 0 || nx >= mazes.COLS || ny >= mazes.ROWS) {
    return { moved: false, won: false };
  }
  if (game.maze[ny][nx] !== 0) {
    return { moved: false, won: false };
  }

  p.x = nx;
  p.y = ny;

  const isP1 = game.player1.userId === userId;
  const won = isP1
    ? p.x === P1_EXIT.x && p.y === P1_EXIT.y
    : p.x === P2_EXIT.x && p.y === P2_EXIT.y;

  if (won) {
    game.phase = 'finished';
    game.winner = userId;
    game.finishedAt = Date.now();
  }

  return { moved: true, won };
}

function serializeGame(game) {
  return {
    gameId: game.gameId,
    matchId: game.matchId,
    phase: game.phase,
    maze: game.maze ? game.maze.map((row) => row.slice()) : null,
    mazeIndex: game.mazeIndex,
    player1: {
      userId: game.player1.userId,
      name: game.player1.name,
      x: game.player1.x,
      y: game.player1.y,
      ready: game.player1.ready,
    },
    player2: {
      userId: game.player2.userId,
      name: game.player2.name,
      x: game.player2.x,
      y: game.player2.y,
      ready: game.player2.ready,
    },
    winner: game.winner,
    startedAt: game.startedAt,
    finishedAt: game.finishedAt,
  };
}

module.exports = {
  createGame,
  getGame,
  deleteGame,
  setPlayerReady,
  startGame,
  movePlayer,
  serializeGame,
};
