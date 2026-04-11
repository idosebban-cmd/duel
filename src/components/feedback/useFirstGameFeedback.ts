import { useEffect, useState } from 'react';
import { countUserCompletedGames, getProfile } from '../../lib/database';

/**
 * Gate the one-time first-game feedback modal.
 * When `enabled` is false, does not fetch (e.g. not on result phase).
 */
export function useFirstGameFeedback(
  userId: string | undefined,
  options?: { enabled?: boolean },
): { show: boolean; loading: boolean } {
  const enabled = options?.enabled ?? true;
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!userId || !enabled) {
      setLoading(false);
      setShow(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setShow(false);

    (async () => {
      try {
        const { data: profile, error: profileError } = await getProfile(userId);
        if (cancelled) return;
        if (profileError || !profile) {
          setLoading(false);
          setShow(false);
          return;
        }
        if (profile.first_game_feedback_completed) {
          setLoading(false);
          setShow(false);
          return;
        }
        const { count, error: countError } = await countUserCompletedGames(userId);
        if (cancelled) return;
        setLoading(false);
        if (countError) {
          setShow(false);
          return;
        }
        setShow(count === 2);
      } catch {
        if (!cancelled) {
          setLoading(false);
          setShow(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, enabled]);

  return { show, loading };
}
