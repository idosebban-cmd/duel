import { useEffect, useRef, useState, useCallback, type MutableRefObject } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { abandonGame, deleteGame } from './database';

const STATUS_AFTER_MS = 30_000;
const PROMPT_AFTER_MS = 60_000;
const AUTO_ABANDON_AFTER_MS = 120_000;

export interface UseNoShowGuardOptions {
  enabled: boolean;
  matchId: string;
  gameId: string | null;
  /** Latest games.status from useMultiplayerGame */
  gameStatus: string | null | undefined;
  /** Set true when GameTitleCard has finished (anchor for timers) */
  titleCardComplete: boolean;
  /** Increments when opponent-originated game row activity is detected */
  opponentActivityTick: number;
  opponentDisplayName: string;
  navigate: NavigateFunction;
  /** True while title overlay is visible — unmount cleanup only runs if still true */
  titleCardActiveRef: MutableRefObject<boolean>;
}

export interface UseNoShowGuardResult {
  waitingLineVisible: boolean;
  promptVisible: boolean;
  dismissPrompt: () => void;
  cancelWaiting: () => Promise<void>;
}

function clearTimerIds(ids: ReturnType<typeof setTimeout>[]) {
  ids.forEach((id) => clearTimeout(id));
}

/**
 * Staged no-show UX after title card completes:
 * 30s — subtle status line
 * 60s — dismissible prompt + cancel
 * 120s — auto-abandon + navigate with flash
 *
 * Resets when opponentActivityTick changes (opponent-originated game updates).
 */
export function useNoShowGuard({
  enabled,
  matchId,
  gameId,
  gameStatus,
  titleCardComplete,
  opponentActivityTick,
  opponentDisplayName,
  navigate,
  titleCardActiveRef,
}: UseNoShowGuardOptions): UseNoShowGuardResult {
  const [waitingLineVisible, setWaitingLineVisible] = useState(false);
  const [promptVisible, setPromptVisible] = useState(false);

  const timerIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const opponentNameRef = useRef(opponentDisplayName);
  opponentNameRef.current = opponentDisplayName;

  const resetTimers = useCallback(() => {
    clearTimerIds(timerIdsRef.current);
    timerIdsRef.current = [];
    setWaitingLineVisible(false);
    setPromptVisible(false);
  }, []);

  const runAutoAbandon = useCallback(async () => {
    if (!gameId) return;
    try {
      await abandonGame(gameId);
    } catch {
      // Best-effort; still navigate
    }
    navigate(`/match/${matchId}`, {
      state: { flash: `Game cancelled — ${opponentNameRef.current} didn't show up.` },
    });
  }, [gameId, matchId, navigate]);

  const cancelWaiting = useCallback(async () => {
    resetTimers();
    if (!gameId) return;
    try {
      await abandonGame(gameId);
    } catch {
      // Best-effort
    }
    navigate(`/match/${matchId}`);
  }, [gameId, matchId, navigate, resetTimers]);

  const dismissPrompt = useCallback(() => {
    setPromptVisible(false);
  }, []);

  // Start / restart timeline when anchor is ready or opponent activity resets the clock
  useEffect(() => {
    if (!enabled || !titleCardComplete) {
      resetTimers();
      return;
    }

    resetTimers();

    const t1 = setTimeout(() => setWaitingLineVisible(true), STATUS_AFTER_MS);
    const t2 = setTimeout(() => setPromptVisible(true), PROMPT_AFTER_MS);
    const t3 = setTimeout(() => {
      void runAutoAbandon();
    }, AUTO_ABANDON_AFTER_MS);

    timerIdsRef.current = [t1, t2, t3];

    return () => {
      clearTimerIds(timerIdsRef.current);
      timerIdsRef.current = [];
    };
  }, [enabled, titleCardComplete, opponentActivityTick, resetTimers, runAutoAbandon]);

  const gameIdRef = useRef(gameId);
  const gameStatusRef = useRef(gameStatus);
  gameIdRef.current = gameId;
  gameStatusRef.current = gameStatus;

  // Unmount cleanup while title card still active
  useEffect(() => {
    return () => {
      if (!titleCardActiveRef.current) return;
      const gid = gameIdRef.current;
      const status = gameStatusRef.current;
      if (!gid) return;
      if (status === 'pending') {
        void deleteGame(gid);
      } else if (status === 'playing') {
        void abandonGame(gid);
      }
    };
  }, [titleCardActiveRef]);

  return {
    waitingLineVisible,
    promptVisible,
    dismissPrompt,
    cancelWaiting,
  };
}
