import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function usePostGameRedirect({
  isMultiplayer,
  matchId,
  phase,
}: {
  isMultiplayer: boolean;
  matchId: string | null;
  phase: string;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isMultiplayer || !matchId || phase !== 'result') return;
    const timer = setTimeout(() => {
      navigate('/chat', { state: { matchId } });
    }, 4000);
    return () => clearTimeout(timer);
  }, [isMultiplayer, matchId, phase, navigate]);
}
