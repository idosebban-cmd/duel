export interface MRPlayer {
  userId: string;
  name: string;
  x: number;
  y: number;
  ready: boolean;
}

export interface MRGameState {
  gameId: string;
  matchId: string;
  phase: 'lobby' | 'countdown' | 'playing' | 'finished';
  maze: number[][] | null;
  mazeIndex: number;
  player1: MRPlayer;
  player2: MRPlayer;
  winner: string | null;
  startedAt: number | null;
  finishedAt: number | null;
}

export interface MRLobbyReady {
  player1Ready: boolean;
  player2Ready: boolean;
}

export interface MRGameOverPayload {
  winner: string;
  finalState: MRGameState;
  forfeit?: boolean;
}

export type MRDirection = 'up' | 'down' | 'left' | 'right';
