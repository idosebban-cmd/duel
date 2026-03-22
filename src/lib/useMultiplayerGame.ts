/**
 * useMultiplayerGame – Realtime-based async multiplayer for turn-based games.
 *
 * Responsibilities:
 *  - Look up the match to resolve opponentId
 *  - Create or join a game record in the DB
 *  - Subscribe to Supabase Realtime for state changes (fallback to polling on disconnect)
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
  setPlayerPresent,
} from './database';
import { supabase } from './supabase';
import type { GameRow } from './database';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  /** True when both players have signalled presence on the game screen */
  bothPresent: boolean;
  /** True when the opponent abandoned (game status='abandoned' and winner is not me) */
  opponentLeft: boolean;
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
  /** Fallback polling interval in ms when Realtime is disconnected (default 2500) */
  fallbackPollInterval?: number;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useMultiplayerGame<S>({
  matchId,
  gameType,
  initialState,
  enabled = true,
  fallbackPollInterval = 2500,
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

  // ── Presence: signal "I've loaded the game screen" once ──────────────────
  const presenceSentRef = useRef(false);
  useEffect(() => {
    if (!enabled || !gameRow?.id || !myUserId || presenceSentRef.current) return;
    presenceSentRef.current = true;
    setPlayerPresent(gameRow.id, myUserId);
  }, [enabled, gameRow?.id, myUserId]);

  // ── Realtime subscription with fallback polling ──────────────────────────
  useEffect(() => {
    if (!enabled || !gameRow?.id || !supabase) return;
    // Stop subscribing once the game has a winner
    if (gameRow.winner) return;

    const sb = supabase; // narrowed non-null for closures
    const gameId = gameRow.id;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;
    let channelRef: RealtimeChannel | null = null;

    function applyUpdate(updated: GameRow) {
      const local = gameRowRef.current;
      // Skip if local updated_at is newer (prevents optimistic state being overwritten by self-echo)
      if (local?.updated_at && updated.updated_at && local.updated_at > updated.updated_at) {
        console.log('[useMultiplayerGame] Realtime: skipping stale update (local is newer)');
        return;
      }
      if (updated.updated_at !== local?.updated_at) {
        console.log('[useMultiplayerGame] Realtime: STATE CHANGE — current_turn:', updated.current_turn, 'winner:', updated.winner);
        gameRowRef.current = updated;
        setGameRow({ ...updated });
      }
    }

    function startFallbackPoll() {
      if (fallbackTimer) return;
      console.log('[useMultiplayerGame] Starting fallback poll');
      fallbackTimer = setInterval(async () => {
        try {
          const updated = await getGame(gameId);
          if (updated) applyUpdate(updated);
        } catch (err) {
          console.error('[useMultiplayerGame] Fallback poll error:', err);
        }
      }, fallbackPollInterval);
    }

    function stopFallbackPoll() {
      if (fallbackTimer) {
        console.log('[useMultiplayerGame] Stopping fallback poll');
        clearInterval(fallbackTimer);
        fallbackTimer = null;
      }
    }

    function subscribe() {
      const channel = sb
        .channel(`game-${gameId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'games',
            filter: `id=eq.${gameId}`,
          },
          (payload) => {
            const updated = payload.new as GameRow;
            applyUpdate(updated);
          },
        )
        .subscribe((status) => {
          console.log('[useMultiplayerGame] Realtime status:', status);
          if (status === 'SUBSCRIBED') {
            // On reconnect: fetch once to reconcile missed events, then stop fallback
            getGame(gameId).then((updated) => {
              if (updated) applyUpdate(updated);
              stopFallbackPoll();
            });
          } else if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            startFallbackPoll();
            // Attempt resubscribe after a short delay
            setTimeout(() => {
              if (channelRef === channel) {
                sb.removeChannel(channel);
                channelRef = subscribe();
              }
            }, 3000);
          }
        });

      return channel;
    }

    channelRef = subscribe();

    return () => {
      stopFallbackPoll();
      if (channelRef) {
        sb.removeChannel(channelRef);
        channelRef = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, gameRow?.id, gameRow?.winner, fallbackPollInterval]);

  // ── Derived values ───────────────────────────────────────────────────────
  const myRole: PlayerRole =
    gameRow && gameRow.player1_id === myUserId ? 'player1' : 'player2';

  const isMyTurn =
    !!gameRow && gameRow.current_turn === myUserId && !gameRow.winner;

  // ── Presence derived values ────────────────────────────────────────────
  const gameState = gameRow ? (gameRow.state as Record<string, unknown>) : null;
  const presentMap = (gameState?.present ?? {}) as Record<string, boolean>;
  const bothPresent = !!gameRow
    && !!presentMap[gameRow.player1_id]
    && !!presentMap[gameRow.player2_id];
  const opponentLeft = !!gameRow
    && gameRow.status === 'abandoned'
    && !!gameRow.winner
    && gameRow.winner !== myRole;

  // ── submitMove ──────────────────────────────────────────────────────────
  const submitMove = useCallback(
    async (moveData: object, newState: S, winner?: string | null) => {
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

      // Persist — on failure, fetch canonical state and revert optimistic update
      try {
        await submitGameMove(
          row.id,
          myUserId,
          moveData,
          newState as object,
          nextTurn,
          winner ?? null,
        );
      } catch (err) {
        console.error('[useMultiplayerGame] submitMove RPC failed, fetching canonical state:', err);
        try {
          const canonical = await getGame(row.id);
          if (canonical) {
            gameRowRef.current = canonical;
            setGameRow({ ...canonical });
          }
        } catch (fetchErr) {
          console.error('[useMultiplayerGame] Failed to fetch canonical state:', fetchErr);
        }
      }
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
      bothPresent: false,
      opponentLeft: false,
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
    bothPresent,
    opponentLeft,
    submitMove,
  };
}
