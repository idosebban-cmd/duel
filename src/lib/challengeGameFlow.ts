import { createOrJoinGame, getMatchById, initializeGame } from './database';

export type CanonicalGameType =
  | 'guess_who'
  | 'connect_four'
  | 'draughts'
  | 'battleship'
  | 'word_blitz'
  | 'dot_dash'
  | 'maze_race'
  | 'hangman';

export interface RouteResolution {
  canonicalGameType: CanonicalGameType;
  path: string;
}

export interface PrepareAcceptedChallengeInput {
  matchId: string;
  gameType: string;
  myUserId: string;
}

export interface PrepareAcceptedChallengeResult {
  ok: boolean;
  gameId: string | null;
  error: string | null;
}

export function normalizeGameType(rawGameType: string): CanonicalGameType | null {
  switch (rawGameType) {
    case 'guess_who':
    case 'guess-who':
      return 'guess_who';
    case 'connect_four':
    case 'connect-four':
      return 'connect_four';
    case 'draughts':
      return 'draughts';
    case 'battleship':
      return 'battleship';
    case 'word_blitz':
    case 'word-blitz':
      return 'word_blitz';
    case 'dot_dash':
    case 'dot-dash':
      return 'dot_dash';
    case 'maze_race':
    case 'maze-race':
      return 'maze_race';
    case 'hangman':
    case 'hang-man':
      return 'hangman';
    default:
      return null;
  }
}

export function resolveGameRoute(rawGameType: string, matchId: string): RouteResolution | null {
  const canonicalGameType = normalizeGameType(rawGameType);
  if (!canonicalGameType) return null;

  switch (canonicalGameType) {
    case 'word_blitz':
      return { canonicalGameType, path: `/games/word-blitz/${matchId}` };
    case 'draughts':
      return { canonicalGameType, path: `/games/draughts/${matchId}` };
    case 'connect_four':
      return { canonicalGameType, path: `/games/connect-four/${matchId}` };
    case 'battleship':
      return { canonicalGameType, path: `/games/battleship/${matchId}` };
    case 'dot_dash':
      return { canonicalGameType, path: `/dotdash/${matchId}/play` };
    case 'maze_race':
      return { canonicalGameType, path: `/mazerace/${matchId}/lobby` };
    case 'guess_who':
      return { canonicalGameType, path: `/game/${matchId}/play` };
    case 'hangman':
      return { canonicalGameType, path: `/games/hangman/${matchId}` };
    default:
      return null;
  }
}

/**
 * Shared accepted-challenge setup flow.
 * This is added in Phase 1 and intentionally not wired yet.
 */
export async function prepareAcceptedChallenge(
  input: PrepareAcceptedChallengeInput,
): Promise<PrepareAcceptedChallengeResult> {
  const canonicalGameType = normalizeGameType(input.gameType);
  if (!canonicalGameType) {
    return { ok: false, gameId: null, error: `Unsupported game type: ${input.gameType}` };
  }

  const match = await getMatchById(input.matchId);
  if (!match) {
    return { ok: false, gameId: null, error: 'Match not found' };
  }

  const opponentId = match.user_a === input.myUserId ? match.user_b : match.user_a;
  if (!opponentId || opponentId === input.myUserId) {
    return { ok: false, gameId: null, error: 'Invalid opponent' };
  }

  const row = await createOrJoinGame(
    input.matchId,
    canonicalGameType,
    input.myUserId,
    opponentId,
  );
  if (!row) {
    return { ok: false, gameId: null, error: 'Failed to create or join game' };
  }

  const initialized = await initializeGame(row.id);
  if (!initialized) {
    return { ok: false, gameId: row.id, error: 'Failed to initialize game' };
  }

  return { ok: true, gameId: row.id, error: null };
}
