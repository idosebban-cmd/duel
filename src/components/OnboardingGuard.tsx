import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();

  // While auth is still loading, show the children (no flash)
  if (loading) return <>{children}</>;

  // If user is already authenticated, skip onboarding
  if (user) return <Navigate to="/discover" replace />;

  return <>{children}</>;
}
