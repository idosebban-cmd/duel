// ─────────────────────────────────────────────────────────────────────────────
// Dot Dash – shared TypeScript types
// ─────────────────────────────────────────────────────────────────────────────

export type Direction = 'up' | 'down' | 'left' | 'right';
export type GamePhase = 'lobby' | 'playing' | 'finished';

export interface DDDot {
  x: number;
  y: number;
}

export interface DDPlayer {
  userId:     string;
  name:       string;
  avatar:     string | null;
  x:          number;
  y:          number;
  direction:  Direction;
  score:      number;
  lives:      number;
  invincible: boolean;
  ready:      boolean;
}

export interface DDGhost {
  id:    string;
  color: string;
  label: string;
  x:     number;
  y:     number;
}

export interface DDGameState {
  gameId:      string;
  phase:       GamePhase;
  maze:        string[];          // 21 rows, each 19 chars
  dots:        DDDot[];
  player1:     DDPlayer;
  player2:     DDPlayer;
  ghosts:      DDGhost[];
  tick:        number;
  winner:      string | null;
  finalScores: { player1: number; player2: number } | null;
}

export interface DDLobbyState {
  player1:       { userId: string; name: string; avatar: string | null; ready: boolean };
  player2:       { userId: string; name: string; avatar: string | null; ready: boolean };
  timeRemaining: number;
  gameId:        string;
}

export interface DDGameOverPayload {
  winner:      string;
  forfeit?:    boolean;
  finalScores: { player1: number; player2: number };
  gameState:   DDGameState;
}
