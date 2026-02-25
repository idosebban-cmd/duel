const { v4: uuidv4 } = require('uuid');
const characters = require('../data/characters.json');

// In-memory game store
const games = new Map();

function getGame(gameId) {
  return games.get(gameId) || null;
}

function getAllGames() {
  return games;
}

function initializeGame(matchId, player1Id, player1Name, player1Avatar, player2Id, player2Name, player2Avatar) {
  const gameId = uuidv4();

  // Assign unique secret characters
  const shuffled = [...characters].sort(() => Math.random() - 0.5);
  const secretChar1 = shuffled[0];
  const secretChar2 = shuffled[1];

  const gameState = {
    gameId,
    matchId,
    player1: {
      userId: player1Id,
      name: player1Name,
      avatar: player1Avatar,
      secretCharacterId: secretChar1.id,
      flippedCards: [],
      ready: true, // Woman (initiator) is auto-ready
    },
    player2: {
      userId: player2Id,
      name: player2Name,
      avatar: player2Avatar,
      secretCharacterId: secretChar2.id,
      flippedCards: [],
      ready: false,
    },
    characters,
    currentTurn: player1Id, // Player 1 (woman) goes first
    phase: 'lobby',
    lobbyExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    currentQuestion: null,
    currentAnswer: null,
    turnPhase: 'ask', // ask | answer | flip | done
    turnHistory: [],
    winner: null,
    createdAt: new Date(),
    finishedAt: null,
  };

  games.set(gameId, gameState);
  return gameState;
}

function setPlayerReady(gameId, userId) {
  const game = games.get(gameId);
  if (!game) return null;

  if (game.player1.userId === userId) game.player1.ready = true;
  else if (game.player2.userId === userId) game.player2.ready = true;

  return game;
}

function startGame(gameId) {
  const game = games.get(gameId);
  if (!game) return null;
  game.phase = 'playing';
  game.turnPhase = 'ask';
  return game;
}

function askQuestion(gameId, userId, question) {
  const game = games.get(gameId);
  if (!game) return { error: 'Game not found' };
  if (game.phase !== 'playing') return { error: 'Game not in playing phase' };
  if (game.currentTurn !== userId) return { error: 'Not your turn' };
  if (game.turnPhase !== 'ask') return { error: 'Not in ask phase' };

  game.currentQuestion = question;
  game.currentAnswer = null;
  game.turnPhase = 'answer';

  return { game };
}

function answerQuestion(gameId, userId, answer) {
  const game = games.get(gameId);
  if (!game) return { error: 'Game not found' };
  if (game.phase !== 'playing') return { error: 'Game not in playing phase' };
  // The answerer is the non-current-turn player
  const isAnswerer =
    (game.currentTurn === game.player1.userId && game.player2.userId === userId) ||
    (game.currentTurn === game.player2.userId && game.player1.userId === userId);
  if (!isAnswerer) return { error: 'Not your turn to answer' };
  if (game.turnPhase !== 'answer') return { error: 'Not in answer phase' };

  game.currentAnswer = answer;
  game.turnPhase = 'flip';

  // Record in history
  game.turnHistory.push({
    asker: game.currentTurn,
    question: game.currentQuestion,
    answer,
    timestamp: new Date(),
  });

  return { game };
}

function flipCards(gameId, userId, cardIds) {
  const game = games.get(gameId);
  if (!game) return { error: 'Game not found' };
  if (game.currentTurn !== userId) return { error: 'Not your turn' };
  if (game.turnPhase !== 'flip') return { error: 'Not in flip phase' };

  const player = game.player1.userId === userId ? game.player1 : game.player2;

  // Add new flipped cards (avoid duplicates)
  for (const cardId of cardIds) {
    if (!player.flippedCards.includes(cardId)) {
      player.flippedCards.push(cardId);
    }
  }

  return { game };
}

function endTurn(gameId, userId) {
  const game = games.get(gameId);
  if (!game) return { error: 'Game not found' };
  if (game.currentTurn !== userId) return { error: 'Not your turn' };
  if (game.turnPhase !== 'flip') return { error: 'Must be in flip phase to end turn' };

  // Switch turns
  game.currentTurn =
    game.currentTurn === game.player1.userId ? game.player2.userId : game.player1.userId;
  game.turnPhase = 'ask';
  game.currentQuestion = null;
  game.currentAnswer = null;

  return { game };
}

function makeGuess(gameId, userId, guessedCharId) {
  const game = games.get(gameId);
  if (!game) return { error: 'Game not found' };
  if (game.phase !== 'playing') return { error: 'Game not in playing phase' };
  if (game.currentTurn !== userId) return { error: 'Not your turn' };

  const isPlayer1 = game.player1.userId === userId;
  const opponentSecretId = isPlayer1
    ? game.player2.secretCharacterId
    : game.player1.secretCharacterId;

  const correct = guessedCharId === opponentSecretId;
  const winner = correct ? userId : (isPlayer1 ? game.player2.userId : game.player1.userId);

  game.winner = winner;
  game.phase = 'finished';
  game.finishedAt = new Date();

  return { game, correct, winner };
}

function cancelGame(gameId) {
  const game = games.get(gameId);
  if (!game) return null;
  game.phase = 'cancelled';
  game.finishedAt = new Date();
  return game;
}

function deleteGame(gameId) {
  games.delete(gameId);
}

// Get safe game state for a specific player (hides opponent's secret)
function getPlayerView(game, userId) {
  const isPlayer1 = game.player1.userId === userId;
  const me = isPlayer1 ? game.player1 : game.player2;
  const opponent = isPlayer1 ? game.player2 : game.player1;

  return {
    gameId: game.gameId,
    matchId: game.matchId,
    me: {
      ...me,
      secretCharacterId: me.secretCharacterId,
    },
    opponent: {
      userId: opponent.userId,
      name: opponent.name,
      avatar: opponent.avatar,
      flippedCards: opponent.flippedCards,
      ready: opponent.ready,
      // Never expose opponent's secret character during play
    },
    characters: game.characters,
    currentTurn: game.currentTurn,
    phase: game.phase,
    lobbyExpiresAt: game.lobbyExpiresAt,
    currentQuestion: game.currentQuestion,
    currentAnswer: game.currentAnswer,
    turnPhase: game.turnPhase,
    turnHistory: game.turnHistory,
    winner: game.winner,
    createdAt: game.createdAt,
    finishedAt: game.finishedAt,
  };
}

// Get full game state for game over (reveals secrets)
function getRevealedView(game) {
  return {
    gameId: game.gameId,
    player1: game.player1,
    player2: game.player2,
    characters: game.characters,
    winner: game.winner,
    phase: game.phase,
    turnHistory: game.turnHistory,
    createdAt: game.createdAt,
    finishedAt: game.finishedAt,
  };
}

function validateQuestion(question) {
  if (!question || typeof question !== 'string') return 'Question is required';
  const trimmed = question.trim();
  if (trimmed.length < 5) return 'Question too short (min 5 characters)';
  if (trimmed.length > 100) return 'Question too long (max 100 characters)';
  if (!trimmed.endsWith('?')) return 'Yes/no questions must end with "?"';
  return null;
}

module.exports = {
  getGame,
  getAllGames,
  initializeGame,
  setPlayerReady,
  startGame,
  askQuestion,
  answerQuestion,
  flipCards,
  endTurn,
  makeGuess,
  cancelGame,
  deleteGame,
  getPlayerView,
  getRevealedView,
  validateQuestion,
};
