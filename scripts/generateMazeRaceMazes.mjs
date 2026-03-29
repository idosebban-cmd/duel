#!/usr/bin/env node
/**
 * Generates 8 symmetric 21x19 mazes (0=open, 1=wall) with BFS path (1,1)->(17,19).
 * Symmetry: maze[y][x] === maze[20-y][18-x]
 */

const ROWS = 21;
const COLS = 19;
const P1_START = { x: 1, y: 1 };
const P1_EXIT = { x: 17, y: 19 };

function bfs(maze, sx, sy, gx, gy) {
  if (maze[sy][sx] !== 0 || maze[gy][gx] !== 0) return false;
  const q = [[sx, sy]];
  const seen = new Set([`${sx},${sy}`]);
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  while (q.length) {
    const [x, y] = q.shift();
    if (x === gx && y === gy) return true;
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      if (maze[ny][nx] !== 0) continue;
      const k = `${nx},${ny}`;
      if (seen.has(k)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return false;
}

function assertSymmetric(maze) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (maze[y][x] !== maze[ROWS - 1 - y][COLS - 1 - x]) {
        throw new Error(`asymmetric at (${x},${y})`);
      }
    }
  }
}

function setSym(maze, x, y, v) {
  maze[y][x] = v;
  maze[ROWS - 1 - y][COLS - 1 - x] = v;
}

/** Greedy: start from open template, add symmetric walls while BFS holds */
function densify(seed) {
  let rng = seed;
  const rand = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    return rng / 0x7fffffff;
  };

  const maze = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      maze[y][x] = 0;
    }
  }
  setSym(maze, P1_START.x, P1_START.y, 0);
  setSym(maze, P1_EXIT.x, P1_EXIT.y, 0);

  const candidates = [];
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      const mx = COLS - 1 - x;
      const my = ROWS - 1 - y;
      if (y * COLS + x <= my * COLS + mx) {
        if ((x === P1_START.x && y === P1_START.y) || (x === P1_EXIT.x && y === P1_EXIT.y)) continue;
        if (x === mx && y === my) candidates.push([x, y]);
        else if (y * COLS + x < my * COLS + mx) candidates.push([x, y]);
      }
    }
  }

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (const [x, y] of candidates) {
    if (maze[y][x] !== 0) continue;
    const mx = COLS - 1 - x;
    const my = ROWS - 1 - y;
    maze[y][x] = 1;
    maze[my][mx] = 1;
    if (!bfs(maze, P1_START.x, P1_START.y, P1_EXIT.x, P1_EXIT.y)) {
      maze[y][x] = 0;
      maze[my][mx] = 0;
    }
  }

  return maze;
}

const MAZES = [];
for (let s = 1; s <= 8; s++) {
  const m = densify(10007 * s + 1337);
  assertSymmetric(m);
  if (!bfs(m, P1_START.x, P1_START.y, P1_EXIT.x, P1_EXIT.y)) {
    throw new Error(`maze ${s} failed BFS`);
  }
  MAZES.push(m);
}

function countWalls(m) {
  let w = 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) if (m[y][x] === 1) w++;
  }
  return w;
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '../server/data/mazeRaceMazes.js');

const header = `'use strict';

// 8 mazes, 21×19, 0=open 1=wall. Each grid is 180° rotationally symmetric
// (m[y][x] === m[20-y][18-x]). Densified via symmetric greedy wall placement
// from full interior open; BFS (1,1)→(17,19) verified per maze.

const MAZES = `;

const footer = `;

const ROWS = 21;
const COLS = 19;
const P1_START = { x: 1, y: 1 };
const P1_EXIT = { x: 17, y: 19 };

function bfs(maze, sx, sy, gx, gy) {
  if (maze[sy][sx] !== 0 || maze[gy][gx] !== 0) return false;
  const q = [[sx, sy]];
  const seen = new Set([\`\${sx},\${sy}\`]);
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  while (q.length) {
    const [x, y] = q.shift();
    if (x === gx && y === gy) return true;
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      if (maze[ny][nx] !== 0) continue;
      const k = \`\${nx},\${ny}\`;
      if (seen.has(k)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return false;
}

function assertSymmetric(maze) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (maze[y][x] !== maze[ROWS - 1 - y][COLS - 1 - x]) {
        throw new Error(\`Maze Race: maze not 180° symmetric at (\${x},\${y})\`);
      }
    }
  }
}

function validateAll() {
  MAZES.forEach((maze, i) => {
    assertSymmetric(maze);
    if (!bfs(maze, P1_START.x, P1_START.y, P1_EXIT.x, P1_EXIT.y)) {
      throw new Error(\`Maze Race: maze \${i} has no path from P1 start to P1 exit\`);
    }
  });
}

validateAll();

function cloneMaze(maze) {
  return maze.map((row) => row.slice());
}

module.exports = {
  MAZES,
  ROWS,
  COLS,
  P1_START,
  P1_EXIT,
  cloneMaze,
  getRandomIndex() {
    return Math.floor(Math.random() * MAZES.length);
  },
};
`;

fs.writeFileSync(outPath, header + JSON.stringify(MAZES) + footer, 'utf8');
console.log('Wrote', outPath, 'wall counts:', MAZES.map(countWalls).join(', '));
