import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function usePostGameRedirect({
  isMultiplayer,
  matchId,
  phase,
  block = false,
}: {
  isMultiplayer: boolean;
  matchId: string | null;
  phase: string;
  /** When true, do not start the auto-redirect timer (e.g. first-game feedback modal open). */
  block?: boolean;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (block || !isMultiplayer || !matchId || phase !== 'result') return;
    const timer = setTimeout(() => {
      navigate(`/match/${matchId}`);
    }, 4000);
    return () => clearTimeout(timer);
  }, [block, isMultiplayer, matchId, phase, navigate]);
}
