import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

export function useIncomingChallengeBadge(userId: string | null | undefined): boolean {
  const [hasIncomingPendingChallenge, setHasIncomingPendingChallenge] = useState(false);

  const refresh = useCallback(async () => {
    if (!supabase || !userId) {
      setHasIncomingPendingChallenge(false);
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const { count } = await supabase
        .from('challenges')
        .select('id', { count: 'exact', head: true })
        .eq('to_user', userId)
        .eq('status', 'pending')
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

      setHasIncomingPendingChallenge((count ?? 0) > 0);
    } catch {
      // Best-effort indicator only.
    }
  }, [userId]);

  useEffect(() => {
    if (!supabase || !userId) return;
    const sb = supabase;
    void refresh();

    const channel = sb
      .channel(`incoming-challenges-badge-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'challenges', filter: `to_user=eq.${userId}` },
        () => { void refresh(); },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'challenges', filter: `to_user=eq.${userId}` },
        () => { void refresh(); },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'challenges', filter: `to_user=eq.${userId}` },
        () => { void refresh(); },
      )
      .subscribe();

    const interval = setInterval(() => {
      void refresh();
    }, 30_000);

    return () => {
      clearInterval(interval);
      sb.removeChannel(channel);
    };
  }, [refresh, userId]);

  return hasIncomingPendingChallenge;
}
