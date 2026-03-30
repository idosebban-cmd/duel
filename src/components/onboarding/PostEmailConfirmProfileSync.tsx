import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useOnboardingStore } from '../../store/onboardingStore';

/**
 * After the user confirms their email, Supabase establishes a session with a non-null JWT.
 * If onboarding data was held locally while waiting for confirmation, persist it once.
 */
export function PostEmailConfirmProfileSync() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const inFlightRef = useRef(false);

  useEffect(() => {
    const state = useOnboardingStore.getState();
    console.log('[PostEmailConfirmSync] running', {
      uid: session?.user?.id,
      pendingEmailVerification: state.pendingEmailVerification,
      userId: state.userId,
      name: state.name,
      character: state.character,
      email: session?.user?.email,
    });

    const uid = session?.user?.id;
    if (!uid) return;

    if (!state.pendingEmailVerification) return;
    if (state.userId !== uid) return;
    if (inFlightRef.current) return;

    inFlightRef.current = true;

    void (async () => {
      try {
        useOnboardingStore.getState().clearPendingEmailVerification();
        navigate('/onboarding/avatar', { replace: true });
      } catch (err) {
        console.error('[PostEmailConfirmProfileSync]', err);
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [session?.user?.id, session?.user?.email, navigate]);

  return null;
}
