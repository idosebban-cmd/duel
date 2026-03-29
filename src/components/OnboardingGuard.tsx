import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  const hasCompletedOnboardingProfile = useOnboardingStore((s) => s.hasCompletedOnboardingProfile);

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

  return <>{children}</>;
}
