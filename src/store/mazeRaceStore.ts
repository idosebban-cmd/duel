import { create } from 'zustand';
import type { MRGameState, MRLobbyReady, MRGameOverPayload } from '../types/mazeRace';

interface MazeRaceStore {
  myUserId: string | null;
  myName: string | null;

  lobbyReady: MRLobbyReady | null;
  gameState: MRGameState | null;
  gameOverPayload: MRGameOverPayload | null;
  errorMessage: string | null;

  setIdentity: (userId: string, name: string) => void;
  setLobbyReady: (s: MRLobbyReady) => void;
  setGameState: (s: MRGameState | null) => void;
  mergeTickPositions: (p1: { x: number; y: number }, p2: { x: number; y: number }) => void;
  setGameOver: (p: MRGameOverPayload) => void;
  setError: (msg: string | null) => void;
  reset: () => void;
}

export const useMazeRaceStore = create<MazeRaceStore>((set) => ({
  myUserId: null,
  myName: null,
  lobbyReady: null,
  gameState: null,
  gameOverPayload: null,
  errorMessage: null,

  setIdentity: (userId, name) => set({ myUserId: userId, myName: name }),

  setLobbyReady: (s) => set({ lobbyReady: s }),

  setGameState: (s) => set({ gameState: s }),

  mergeTickPositions: (p1, p2) =>
    set((state) => {
      const g = state.gameState;
      if (!g) return state;
      return {
        gameState: {
          ...g,
          player1: { ...g.player1, x: p1.x, y: p1.y },
          player2: { ...g.player2, x: p2.x, y: p2.y },
        },
      };
    }),

  setGameOver: (p) =>
    set({ gameOverPayload: p, gameState: p.finalState }),

  setError: (msg) => set({ errorMessage: msg }),

  reset: () =>
    set({
      lobbyReady: null,
      gameState: null,
      gameOverPayload: null,
      errorMessage: null,
    }),
}));
