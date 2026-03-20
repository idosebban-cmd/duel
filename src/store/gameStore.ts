import { create } from 'zustand';
import type { GameState, LobbyState, GameOverPayload } from '../types/game';

interface GameStore {
  // Identity (set before joining)
  myUserId: string | null;
  myName: string;
  myAvatar: string;

  // Game state
  gameId: string | null;
  lobbyState: LobbyState | null;
  gameState: GameState | null;
  gameOverPayload: GameOverPayload | null;

  // UI state
  errorMessage: string | null;
  isCountingDown: boolean;
  pendingFlips: string[]; // card IDs staged to flip

  // Actions
  setIdentity: (userId: string, name: string, avatar: string) => void;
  setGameId: (gameId: string) => void;
  setLobbyState: (lobby: LobbyState) => void;
  setGameState: (state: GameState) => void;
  setGameOver: (payload: GameOverPayload) => void;
  setError: (message: string | null) => void;
  startCountdown: (from: number) => void;
  togglePendingFlip: (charId: string) => void;
  clearPendingFlips: () => void;

  reset: () => void;
}

const initialState = {
  myUserId: null,
  myName: '',
  myAvatar: '🎮',
  gameId: null,
  lobbyState: null,
  gameState: null,
  gameOverPayload: null,
  errorMessage: null,
  isCountingDown: false,
  pendingFlips: [],
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setIdentity: (userId, name, avatar) => set({ myUserId: userId, myName: name, myAvatar: avatar }),

  setGameId: (gameId) => set({ gameId }),

  setLobbyState: (lobbyState) => set({ lobbyState }),

  setGameState: (gameState) => set({ gameState }),

  setGameOver: (gameOverPayload) => set({ gameOverPayload }),

  setError: (errorMessage) => set({ errorMessage }),

  startCountdown: (_from) => {
    // Just show the CountdownScreen — it manages its own animation
    // and calls onComplete when done. Don't auto-kill it with a timer.
    set({ isCountingDown: true });
  },

  togglePendingFlip: (charId) => {
    const { pendingFlips } = get();
    if (pendingFlips.includes(charId)) {
      set({ pendingFlips: pendingFlips.filter((id) => id !== charId) });
    } else {
      set({ pendingFlips: [...pendingFlips, charId] });
    }
  },

  clearPendingFlips: () => set({ pendingFlips: [] }),

  reset: () => set(initialState),
}));
