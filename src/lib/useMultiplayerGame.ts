/**
 * useMultiplayerGame – polling-based async multiplayer for turn-based games.
 *
 * Responsibilities:
 *  - Look up the match to resolve opponentId
 *  - Create or join a game record in the DB
 *  - Poll every `pollInterval` ms for state changes
 *  - Expose `isMyTurn`, `myRole`, `gameState`, `winner`, `submitMove`
 *
 * When `enabled = false` (solo / demo mode) the hook is a no-op.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  getMatchById,
  createOrJoinGame,
  getGame,
  submitGameMove,
} from './database';
import type { GameRow } from './database';

// ── Public types ─────────────────────────────────────────────────────────────

export type PlayerRole = 'player1' | 'player2';

export interface MultiplayerGame<S> {
  /** Supabase games.id, null while loading */
  gameId: string | null;
  /** Full DB row – useful for reading `updated_at`, `winner`, etc. */
  gameRow: GameRow | null;
  /** Typed game state stored in games.state */
  gameState: S | null;
  /** True when it is this user's turn and the game is not over */
  isMyTurn: boolean;
  /** 'player1' if my userId < opponentId, otherwise 'player2' */
  myRole: PlayerRole;
  /** The other player's userId */
  opponentId: string;
  /** 'player1' | 'player2' | 'draw' | null */
  winner: string | null;
  /** True while the initial game row is being created/fetched */
  loading: boolean;
  /** True when the match was not found in the DB — game should use bot mode */
  fallbackToBotMode: boolean;
  /**
   * Optimistically update local state then persist to DB.
   * @param moveData  logged to the moves table for audit / replay
   * @param newState  full new game state (replaces games.state)
   * @param winner    pass 'player1', 'player2', or 'draw' to end the game
   */
  submitMove: (moveData: object, newState: S, winner?: string | null) => void;
}

interface Options<S> {
  matchId: string;
  gameType: string;
  /** Initial state used when creating a new game */
  initialState: S;
  /** Pass false to disable multiplayer (solo / demo mode) */
  enabled?: boolean;
  /** Polling interval in ms (default 2500) */
  pollInterval?: number;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useMultiplayerGame<S>({
  matchId,
  gameType,
  initialState,
  enabled = true,
  pollInterval = 2500,
}: Options<S>): MultiplayerGame<S> {
  const { user } = useAuthStore();
  const myUserId = user?.id ?? '';

  const [gameRow, setGameRow] = useState<GameRow | null>(null);
  const [opponentId, setOpponentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [fallbackToBotMode, setFallbackToBotMode] = useState(false);

  // Stable ref so effects always see the latest row without re-subscribing
  const gameRowRef = useRef<GameRow | null>(null);
  gameRowRef.current = gameRow;

  // ── Initialization ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !myUserId || !matchId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // 1. Resolve opponent from the match row
        const match = await getMatchById(matchId);
        if (cancelled) return;
        if (!match) {
          // Match not found in DB — likely a fake/seed profile match
          console.warn('[useMultiplayerGame] getMatchById returned null for matchId:', matchId, '— setting fallbackToBotMode');
          setFallbackToBotMode(true);
          return;
        }

        const oppId = match.user_a === myUserId ? match.user_b : match.user_a;
        if (!cancelled) setOpponentId(oppId);

        // 2. Create or join the game
        console.log('[useMultiplayerGame] Calling createOrJoinGame — matchId:', matchId, 'gameType:', gameType, 'myUserId:', myUserId, 'oppId:', oppId);
        const row = await createOrJoinGame(
          matchId,
          gameType,
          myUserId,
          oppId,
          initialState as object,
        );
        console.log('[useMultiplayerGame] createOrJoinGame returned:', row);

        if (!cancelled && row) {
          gameRowRef.current = row;
          setGameRow(row);
        }
      } catch {
        // Network error — loading will clear; game shows disconnected state
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, myUserId, matchId, gameType]);

  // ── Polling ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !gameRow?.id) return;
    // Stop polling once the game has a winner
    if (gameRow.winner) return;

    const id = setInterval(async () => {
      try {
        const updated = await getGame(gameRowRef.current!.id);
        console.log('[useMultiplayerGame] Poll — game row:', updated);
        if (!updated) return;
        if (updated.updated_at !== gameRowRef.current?.updated_at) {
          gameRowRef.current = updated;
          setGameRow({ ...updated });
        }
      } catch (err) {
        console.error('[useMultiplayerGame] Poll error:', err);
      }
    }, pollInterval);

    return () => clearInterval(id);
  }, [enabled, gameRow?.id, gameRow?.winner, pollInterval]);

  // ── Derived values ───────────────────────────────────────────────────────
  const myRole: PlayerRole =
    gameRow && gameRow.player1_id === myUserId ? 'player1' : 'player2';

  const isMyTurn =
    !!gameRow && gameRow.current_turn === myUserId && !gameRow.winner;

  // ── submitMove ──────────────────────────────────────────────────────────
  const submitMove = useCallback(
    (moveData: object, newState: S, winner?: string | null) => {
      const row = gameRowRef.current;
      if (!row) return;

      const nextTurn =
        row.current_turn === row.player1_id ? row.player2_id : row.player1_id;

      // Optimistic update
      const optimistic: GameRow = {
        ...row,
        state: newState as Record<string, unknown>,
        current_turn: winner ? '' : nextTurn,
        winner: winner ?? null,
        updated_at: new Date().toISOString(),
      };
      gameRowRef.current = optimistic;
      setGameRow(optimistic);

      // Persist (fire-and-forget; polling will reconcile if it fails)
      submitGameMove(
        row.id,
        myUserId,
        moveData,
        newState as object,
        nextTurn,
        winner ?? null,
      );
    },
    [myUserId],
  );

  // ── No-op return when disabled ───────────────────────────────────────────
  if (!enabled || fallbackToBotMode) {
    return {
      gameId: null,
      gameRow: null,
      gameState: null,
      isMyTurn: false,
      myRole: 'player1',
      opponentId: '',
      winner: null,
      loading: false,
      fallbackToBotMode,
      submitMove: () => {},
    };
  }

  return {
    gameId: gameRow?.id ?? null,
    gameRow,
    gameState: gameRow ? (gameRow.state as S) : null,
    isMyTurn,
    myRole,
    opponentId,
    winner: gameRow?.winner ?? null,
    loading,
    fallbackToBotMode: false,
    submitMove,
  };
}
