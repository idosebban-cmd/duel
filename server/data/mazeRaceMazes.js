'use strict';

// 21×19 grid, 0=open 1=wall. Recursive backtracking per spec: unvisited = wall (1).

const ROWS = 21;
const COLS = 19;
const P1_START = { x: 1, y: 1 };
const P1_EXIT = { x: COLS - 2, y: ROWS - 2 };

const DIRECTIONS = [
  [0, -2],
  [0, 2],
  [-2, 0],
  [2, 0],
];

function shuffleDirections(directions) {
  const copy = directions.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = copy[i];
    copy[i] = copy[j];
    copy[j] = t;
  }
  return copy;
}

function carve(grid, col, row, cols, rows) {
  const directions = shuffleDirections(DIRECTIONS);
  for (let i = 0; i < directions.length; i++) {
    const dc = directions[i][0];
    const dr = directions[i][1];
    const newCol = col + dc;
    const newRow = row + dr;
    if (
      newCol >= 1
      && newCol < cols - 1
      && newRow >= 1
      && newRow < rows - 1
      && grid[newRow][newCol] === 1
    ) {
      grid[row + dr / 2][col + dc / 2] = 0;
      grid[newRow][newCol] = 0;
      carve(grid, newCol, newRow, cols, rows);
    }
  }
}

function generateMaze(cols, rows) {
  if (cols % 2 === 0 || rows % 2 === 0) {
    throw new Error('Maze Race: cols and rows must be odd');
  }
  const grid = Array.from({ length: rows }, () => Array(cols).fill(1));
  const startCol = 1;
  const startRow = 1;
  grid[startRow][startCol] = 0;
  carve(grid, startCol, startRow, cols, rows);
  return grid;
}

function cloneMaze(maze) {
  return maze.map((row) => row.slice());
}

function generateMazeForGame() {
  return generateMaze(COLS, ROWS);
}

module.exports = {
  ROWS,
  COLS,
  P1_START,
  P1_EXIT,
  cloneMaze,
  generateMaze: generateMazeForGame,
};
