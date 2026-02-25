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
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  errorMessage: string | null;
  isCountingDown: boolean;
  countdownValue: number;
  selectedGuessCharId: string | null;
  pendingFlips: string[]; // card IDs staged to flip

  // Actions
  setIdentity: (userId: string, name: string, avatar: string) => void;
  setGameId: (gameId: string) => void;
  setLobbyState: (lobby: LobbyState) => void;
  setGameState: (state: GameState) => void;
  setGameOver: (payload: GameOverPayload) => void;
  setConnectionStatus: (status: GameStore['connectionStatus']) => void;
  setError: (message: string | null) => void;
  startCountdown: (from: number) => void;
  setSelectedGuess: (charId: string | null) => void;
  togglePendingFlip: (charId: string) => void;
  clearPendingFlips: () => void;

  // Apply question asked (from socket event)
  applyQuestionAsked: (question: string, askedBy: string) => void;
  applyQuestionAnswered: (answer: 'yes' | 'no') => void;
  applyCardsFlipped: (cardIds: string[], flippedBy: string) => void;
  applyTurnChanged: (currentTurn: string) => void;

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
  connectionStatus: 'disconnected' as const,
  errorMessage: null,
  isCountingDown: false,
  countdownValue: 3,
  selectedGuessCharId: null,
  pendingFlips: [],
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setIdentity: (userId, name, avatar) => set({ myUserId: userId, myName: name, myAvatar: avatar }),

  setGameId: (gameId) => set({ gameId }),

  setLobbyState: (lobbyState) => set({ lobbyState }),

  setGameState: (gameState) => set({ gameState }),

  setGameOver: (gameOverPayload) => set({ gameOverPayload }),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  setError: (errorMessage) => set({ errorMessage }),

  startCountdown: (_from) => {
    // Just show the CountdownScreen — it manages its own animation
    // and calls onComplete when done. Don't auto-kill it with a timer.
    set({ isCountingDown: true });
  },

  setSelectedGuess: (selectedGuessCharId) => set({ selectedGuessCharId }),

  togglePendingFlip: (charId) => {
    const { pendingFlips } = get();
    if (pendingFlips.includes(charId)) {
      set({ pendingFlips: pendingFlips.filter((id) => id !== charId) });
    } else {
      set({ pendingFlips: [...pendingFlips, charId] });
    }
  },

  clearPendingFlips: () => set({ pendingFlips: [] }),

  applyQuestionAsked: (question, _askedBy) => {
    const { gameState } = get();
    if (!gameState) return;
    set({
      gameState: {
        ...gameState,
        currentQuestion: question,
        currentAnswer: null,
        turnPhase: 'answer',
      },
    });
  },

  applyQuestionAnswered: (answer) => {
    const { gameState } = get();
    if (!gameState) return;
    set({
      gameState: {
        ...gameState,
        currentAnswer: answer,
        turnPhase: 'flip',
      },
    });
  },

  applyCardsFlipped: (cardIds, flippedBy) => {
    const { gameState, myUserId } = get();
    if (!gameState) return;

    // If opponent flipped, update opponent's flipped list
    // If I flipped, update my flipped list (server already confirmed)
    const wasMe = flippedBy === myUserId;
    const newGameState = { ...gameState };

    if (wasMe) {
      newGameState.me = {
        ...newGameState.me,
        flippedCards: [...new Set([...newGameState.me.flippedCards, ...cardIds])],
      };
    } else {
      newGameState.opponent = {
        ...newGameState.opponent,
        flippedCards: [...new Set([...newGameState.opponent.flippedCards, ...cardIds])],
      };
    }

    set({ gameState: newGameState });
  },

  applyTurnChanged: (currentTurn) => {
    const { gameState } = get();
    if (!gameState) return;
    set({
      gameState: {
        ...gameState,
        currentTurn,
        turnPhase: 'ask',
        currentQuestion: null,
        currentAnswer: null,
      },
      pendingFlips: [],
    });
  },

  reset: () => set(initialState),
}));
