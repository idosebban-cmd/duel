'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// MAZE DEFINITION  (19 cols × 21 rows)
// '#' = wall    '.' = dot / open floor
// ─────────────────────────────────────────────────────────────────────────────
const MAZE_LAYOUT = [
  '###################', // row  0 – top wall
  '#.......#.#.......#', // row  1
  '#.##.##.#.#.##.##.#', // row  2
  '#.#.............#.#', // row  3
  '#.#.##.#####.##.#.#', // row  4
  '#.................#', // row  5
  '#.##.#.#####.#.##.#', // row  6
  '###.#.##.#.##.#.###', // row  7
  '###.#.#.....#.#.###', // row  8  – ghost spawn cols 7-11
  '###...#.....#...###', // row  9  – ghost spawn cols 7-11
  '###.............###', // row 10  – player spawn (9,10)
  '###...#.....#...###', // row 11
  '###.#.#.....#.#.###', // row 12
  '###.#.##.#.##.#.###', // row 13
  '#.##.#.#####.#.##.#', // row 14
  '#.................#', // row 15
  '#.#.##.#####.##.#.#', // row 16
  '#.#.............#.#', // row 17
  '#.##.##.#.#.##.##.#', // row 18
  '#.......#.#.......#', // row 19
  '###################', // row 20 – bottom wall
];

const MAZE_ROWS = 21;
const MAZE_COLS = 19;
const PLAYER_SPAWN = { x: 9, y: 10 };

// Cells that will never receive dots (ghost house + player spawn)
const NO_DOT_CELLS = new Set([
  '9,10',                                   // player spawn
  '7,8','8,8','9,8','10,8','11,8',           // ghost house top
  '7,9','8,9','9,9','10,9','11,9',           // ghost house bottom
]);

// Ghost patrol waypoints – ghosts float through walls
const GHOST_CONFIGS = [
  {
    id: 'ghost1', color: '#FF3D71', label: 'red',
    startX: 8, startY: 8,
    waypoints: [{ x: 3, y: 3 }, { x: 3, y: 7 }, { x: 7, y: 7 }, { x: 7, y: 3 }],
  },
  {
    id: 'ghost2', color: '#FF9F1C', label: 'orange',
    startX: 10, startY: 8,
    waypoints: [{ x: 1, y: 10 }, { x: 17, y: 10 }],
  },
  {
    id: 'ghost3', color: '#B565FF', label: 'purple',
    startX: 8, startY: 9,
    waypoints: [{ x: 9, y: 1 }, { x: 9, y: 19 }],
  },
  {
    id: 'ghost4', color: '#FFE66D', label: 'yellow',
    startX: 10, startY: 9,
    waypoints: [{ x: 11, y: 3 }, { x: 11, y: 7 }, { x: 15, y: 7 }, { x: 15, y: 3 }],
  },
];

// Tick rates (server runs at 20 tps = 50 ms interval)
const PLAYER_STEP_TICKS = 7;   // ≈ 2.86 cells/sec
const GHOST_STEP_TICKS  = 10;  // = 2.00 cells/sec

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE GAMES
// ─────────────────────────────────────────────────────────────────────────────
const games = new Map(); // gameId → game object

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function isWall(x, y) {
  if (x < 0 || x >= MAZE_COLS || y < 0 || y >= MAZE_ROWS) return true;
  return MAZE_LAYOUT[y][x] === '#';
}

const DIR_DELTA = {
  up:    { dx: 0,  dy: -1 },
  down:  { dx: 0,  dy:  1 },
  left:  { dx: -1, dy:  0 },
  right: { dx: 1,  dy:  0 },
};

function buildDotSet() {
  const dots = new Set();
  for (let y = 0; y < MAZE_ROWS; y++) {
    for (let x = 0; x < MAZE_COLS; x++) {
      if (MAZE_LAYOUT[y][x] === '.' && !NO_DOT_CELLS.has(`${x},${y}`)) {
        dots.add(`${x},${y}`);
      }
    }
  }
  return dots;
}

function makePlayer(userId, name, avatar, direction) {
  return {
    userId, name, avatar: avatar || null,
    x: PLAYER_SPAWN.x,
    y: PLAYER_SPAWN.y,
    direction,
    nextDirection: null,
    score: 0,
    lives: 3,
    invincible: false,
    invincibleUntil: 0,
    ready: false,
    stepCounter: 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────
function createGame(gameId, p1Info, p2Info) {
  const game = {
    gameId,
    phase: 'lobby',                          // lobby | playing | finished
    maze: MAZE_LAYOUT,
    dots: buildDotSet(),                     // Set<"x,y">
    player1: makePlayer(p1Info.userId, p1Info.name, p1Info.avatar, 'right'),
    player2: makePlayer(p2Info.userId, p2Info.name, p2Info.avatar, 'left'),
    ghosts: GHOST_CONFIGS.map(cfg => ({
      id: cfg.id,
      color: cfg.color,
      label: cfg.label,
      x: cfg.startX,
      y: cfg.startY,
      waypoints: cfg.waypoints,
      waypointIndex: 0,
      stepCounter: 0,
    })),
    tick: 0,
    gameStartedAt: null,
    winner: null,
    finalScores: null,
    lobbyExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
  };
  games.set(gameId, game);
  return game;
}

function getGame(gameId) { return games.get(gameId) || null; }
function deleteGame(gameId) { games.delete(gameId); }

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
  game.phase = 'playing';
  game.gameStartedAt = Date.now();
  return game;
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT
// ─────────────────────────────────────────────────────────────────────────────
function queueDirection(gameId, userId, direction) {
  const game = getGame(gameId);
  if (!game || game.phase !== 'playing') return;
  if (!DIR_DELTA[direction]) return;
  const p = game.player1.userId === userId ? game.player1 : game.player2;
  p.nextDirection = direction;
}

// ─────────────────────────────────────────────────────────────────────────────
// MOVEMENT
// ─────────────────────────────────────────────────────────────────────────────
function stepPlayer(player) {
  player.stepCounter++;
  if (player.stepCounter < PLAYER_STEP_TICKS) return;
  player.stepCounter = 0;

  // Try to turn into the queued direction first
  if (player.nextDirection && player.nextDirection !== player.direction) {
    const d = DIR_DELTA[player.nextDirection];
    if (!isWall(player.x + d.dx, player.y + d.dy)) {
      player.direction = player.nextDirection;
    }
  }
  player.nextDirection = null;

  // Advance in current direction
  const d = DIR_DELTA[player.direction];
  const nx = player.x + d.dx;
  const ny = player.y + d.dy;
  if (!isWall(nx, ny)) {
    player.x = nx;
    player.y = ny;
  }
}

function stepGhost(ghost) {
  ghost.stepCounter++;
  if (ghost.stepCounter < GHOST_STEP_TICKS) return;
  ghost.stepCounter = 0;

  const target = ghost.waypoints[ghost.waypointIndex];

  // Move one cell toward target
  if      (ghost.x < target.x) ghost.x++;
  else if (ghost.x > target.x) ghost.x--;
  else if (ghost.y < target.y) ghost.y++;
  else if (ghost.y > target.y) ghost.y--;

  // Reached waypoint → advance
  if (ghost.x === target.x && ghost.y === target.y) {
    ghost.waypointIndex = (ghost.waypointIndex + 1) % ghost.waypoints.length;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COLLISIONS
// ─────────────────────────────────────────────────────────────────────────────
function collectDot(game, player) {
  const key = `${player.x},${player.y}`;
  if (game.dots.has(key)) {
    game.dots.delete(key);
    player.score += 10;
    return key;
  }
  return null;
}

function respawn(player) {
  player.x = PLAYER_SPAWN.x;
  player.y = PLAYER_SPAWN.y;
  player.nextDirection = null;
  player.invincible = true;
  player.invincibleUntil = Date.now() + 1500;
  player.stepCounter = 0;
}

function checkGhostHit(game, player) {
  // Auto-expire invincibility
  if (player.invincible) {
    if (Date.now() >= player.invincibleUntil) player.invincible = false;
    return false;
  }
  for (const g of game.ghosts) {
    if (g.x === player.x && g.y === player.y) {
      player.lives = Math.max(0, player.lives - 1);
      respawn(player);
      return true;
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// WIN DETECTION
// ─────────────────────────────────────────────────────────────────────────────
function resolveWinner(game) {
  const { player1: p1, player2: p2 } = game;

  if (p1.lives <= 0 && p2.lives <= 0) {
    return p1.score >= p2.score ? p1.userId : p2.userId;
  }
  if (p1.lives <= 0) return p2.userId;
  if (p2.lives <= 0) return p1.userId;

  if (game.dots.size === 0) {
    // Player 1 (woman, always chose the game) wins ties per spec
    return p1.score >= p2.score ? p1.userId : p2.userId;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TICK  (called by socket handler every 50 ms)
// ─────────────────────────────────────────────────────────────────────────────
function tick(game) {
  if (game.phase !== 'playing') return { winner: null, collectedDots: [] };

  game.tick++;

  // Move all entities
  stepPlayer(game.player1);
  stepPlayer(game.player2);
  game.ghosts.forEach(stepGhost);

  // Dot collection (P1 checked first — resolves simultaneous tie)
  const d1 = collectDot(game, game.player1);
  const d2 = collectDot(game, game.player2);
  const collectedDots = [d1, d2].filter(Boolean);

  // Ghost hits
  checkGhostHit(game, game.player1);
  checkGhostHit(game, game.player2);

  // Win check
  const winner = resolveWinner(game);
  if (winner) {
    game.phase = 'finished';
    game.winner = winner;
    game.finalScores = {
      player1: game.player1.score,
      player2: game.player2.score,
    };
  }

  return { winner, collectedDots };
}

// ─────────────────────────────────────────────────────────────────────────────
// SERIALISATION (sent to clients every tick)
// ─────────────────────────────────────────────────────────────────────────────
function serializeGame(game) {
  const { player1: p1, player2: p2 } = game;
  return {
    gameId:   game.gameId,
    phase:    game.phase,
    maze:     game.maze,
    dots:     Array.from(game.dots).map(k => {
      const [x, y] = k.split(',').map(Number);
      return { x, y };
    }),
    player1:  serializePlayer(p1),
    player2:  serializePlayer(p2),
    ghosts:   game.ghosts.map(({ id, color, label, x, y }) => ({ id, color, label, x, y })),
    tick:     game.tick,
    winner:   game.winner,
    finalScores: game.finalScores,
  };
}

function serializePlayer(p) {
  return {
    userId:     p.userId,
    name:       p.name,
    avatar:     p.avatar,
    x:          p.x,
    y:          p.y,
    direction:  p.direction,
    score:      p.score,
    lives:      p.lives,
    invincible: p.invincible,
    ready:      p.ready,
  };
}

module.exports = {
  MAZE_LAYOUT, MAZE_ROWS, MAZE_COLS, PLAYER_SPAWN,
  createGame, getGame, deleteGame,
  setPlayerReady, startGame,
  queueDirection, tick,
  serializeGame,
};
