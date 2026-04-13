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
  const onboardingUserId = useOnboardingStore((s) => s.userId);
  const pendingEmailVerification = useOnboardingStore((s) => s.pendingEmailVerification);
  const name = useOnboardingStore((s) => s.name);
  const completedSteps = useOnboardingStore((s) => s.completedSteps);

  const profileCompletedForCurrentUser =
    hasCompletedOnboardingProfile && onboardingUserId === user?.id;

  const hasLocalProgress =
    !pendingEmailVerification && (name.trim().length > 0 || completedSteps.length > 0);
  const [dbResolved, setDbResolved] = useState(
    () => (hasLocalProgress
      ? true
      : Boolean(user?.id && userIdsKnownToHaveNoProfileRow.has(user.id))),
  );

  useEffect(() => {
    if (loading || !user) {
      setDbResolved(false);
      return;
    }
    if (profileCompletedForCurrentUser) {
      return;
    }
    if (hasLocalProgress) {
      setDbResolved(true);
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
        useOnboardingStore.getState().setUserId(user.id);
      } else {
        userIdsKnownToHaveNoProfileRow.add(user.id);
        setDbResolved(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user?.id, profileCompletedForCurrentUser, hasLocalProgress]);

  if (loading) return <>{children}</>;

  if (!user) {
    return <Navigate to="/onboarding/create-account" replace />;
  }

  if (profileCompletedForCurrentUser) {
    return <Navigate to="/discover" replace />;
  }

  if (!dbResolved) {
    return null;
  }

  return <>{children}</>;
}
