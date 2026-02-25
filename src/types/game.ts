export interface CharacterAttributes {
  type: 'unicorn' | 'cat' | 'phoenix' | 'robot' | 'lion' | 'bear' | 'ghost' | 'fox' | 'owl' | 'octopus' | 'calico' | 'dragon';
  wings: boolean;
  glasses: boolean;
  hat: boolean;
  magic: boolean;
  color: 'rainbow' | 'gray' | 'fire' | 'blue' | 'golden' | 'brown' | 'white' | 'orange' | 'purple' | 'green';
}

export interface Character {
  id: string;
  name: string;
  color: string;
  image: string;
  attributes: CharacterAttributes;
}

export interface PlayerState {
  userId: string;
  name: string;
  avatar: string;
  secretCharacterId: string;
  flippedCards: string[];
  ready: boolean;
}

export type GamePhase = 'lobby' | 'playing' | 'finished' | 'cancelled';
export type TurnPhase = 'ask' | 'answer' | 'flip';

export interface TurnHistoryEntry {
  asker: string;
  question: string;
  answer: 'yes' | 'no';
  timestamp: string;
}

export interface GameState {
  gameId: string;
  matchId: string;
  me: PlayerState;
  opponent: {
    userId: string;
    name: string;
    avatar: string;
    flippedCards: string[];
    ready: boolean;
  };
  characters: Character[];
  currentTurn: string; // userId
  phase: GamePhase;
  lobbyExpiresAt: string | null;
  currentQuestion: string | null;
  currentAnswer: 'yes' | 'no' | null;
  turnPhase: TurnPhase;
  turnHistory: TurnHistoryEntry[];
  winner: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface LobbyPlayerInfo {
  userId: string;
  name: string;
  avatar: string;
  ready: boolean;
}

export interface LobbyState {
  player1: LobbyPlayerInfo;
  player2: LobbyPlayerInfo;
  timeRemaining: number;
  gameId: string;
}

export interface GameOverPayload {
  winner: string;
  loser: string;
  player1SecretId: string;
  player2SecretId: string;
  guessedCharacterId?: string;
  guessedBy?: string;
  correct?: boolean;
  forfeit?: boolean;
  characters: Character[];
  gameId: string;
}
