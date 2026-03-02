import { create } from 'zustand';
import type { DDGameState, DDLobbyState, DDGameOverPayload } from '../types/dotDash';

interface DotDashStore {
  // Identity
  myUserId:   string | null;
  myName:     string | null;
  myAvatar:   string | null;

  // State
  lobbyState:      DDLobbyState | null;
  gameState:       DDGameState  | null;
  gameOverPayload: DDGameOverPayload | null;
  errorMessage:    string | null;

  // Actions
  setIdentity:      (userId: string, name: string, avatar: string) => void;
  setLobbyState:    (s: DDLobbyState) => void;
  setGameState:     (s: DDGameState)  => void;
  setGameOver:      (p: DDGameOverPayload) => void;
  setError:         (msg: string | null) => void;
  reset:            () => void;
}

export const useDotDashStore = create<DotDashStore>((set) => ({
  myUserId:        null,
  myName:          null,
  myAvatar:        null,
  lobbyState:      null,
  gameState:       null,
  gameOverPayload: null,
  errorMessage:    null,

  setIdentity: (userId, name, avatar) =>
    set({ myUserId: userId, myName: name, myAvatar: avatar }),

  setLobbyState: (s) => set({ lobbyState: s }),

  setGameState: (s) => set({ gameState: s }),

  setGameOver: (p) =>
    set({ gameOverPayload: p, gameState: p.gameState }),

  setError: (msg) => set({ errorMessage: msg }),

  reset: () =>
    set({
      lobbyState:      null,
      gameState:       null,
      gameOverPayload: null,
      errorMessage:    null,
    }),
}));
