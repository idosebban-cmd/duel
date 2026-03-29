import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { profileRowExistsForUser } from '../lib/database';
import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';

/** Users confirmed by DB to have no profiles row this session (avoids refetch on each onboarding step remount). */
const userIdsKnownToHaveNoProfileRow = new Set<string>();

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  const hasCompletedOnboardingProfile = useOnboardingStore((s) => s.hasCompletedOnboardingProfile);
  const [dbResolved, setDbResolved] = useState(
    () => Boolean(user?.id && userIdsKnownToHaveNoProfileRow.has(user.id)),
  );

  useEffect(() => {
    if (loading || !user) {
      setDbResolved(false);
      return;
    }
    if (hasCompletedOnboardingProfile) {
      return;
    }
    if (userIdsKnownToHaveNoProfileRow.has(user.id)) {
      setDbResolved(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      const exists = await profileRowExistsForUser(user.id);
      if (cancelled) return;
      if (exists) {
        useOnboardingStore.getState().markOnboardingCompleteAndClearDraft();
      } else {
        userIdsKnownToHaveNoProfileRow.add(user.id);
        setDbResolved(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user?.id, hasCompletedOnboardingProfile]);

  // While auth is still loading, show the children (no flash)
  if (loading) return <>{children}</>;

  // Must be signed in before profile steps (account is step 2)
  if (!user) {
    return <Navigate to="/onboarding/create-account" replace />;
  }

  // Finished onboarding — go to app
  if (hasCompletedOnboardingProfile) {
    return <Navigate to="/discover" replace />;
  }

  if (!dbResolved) {
    return null;
  }

  return <>{children}</>;
}
