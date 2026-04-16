import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';

let initialized = false;

async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  await SocialLogin.initialize({
    apple: {
      clientId: 'app.playduel',
      redirectUrl: '',
    },
  });
  initialized = true;
}

/**
 * On native platforms (iOS), performs Sign in with Apple via the native SDK
 * and returns an ID token for Supabase.
 * On web, returns null so the caller can show a "not available" message.
 *
 * Apple only returns the user's name on the very first sign-in. If present,
 * it is persisted to localStorage so onboarding can pick it up later.
 */
export async function getNativeAppleIdToken(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;

  await ensureInitialized();

  const result = await SocialLogin.login({
    provider: 'apple',
    options: {
      scopes: ['name', 'email'],
    },
  });

  // Apple only sends the user's name on the first login — persist it
  const profile = result.result.profile;
  if (profile) {
    const givenName = profile.givenName ?? '';
    const familyName = profile.familyName ?? '';
    const fullName = [givenName, familyName].filter(Boolean).join(' ');
    if (fullName) {
      try {
        localStorage.setItem('apple_user_name', fullName);
      } catch {
        // localStorage unavailable — not critical
      }
    }
  }

  const idToken = result.result.idToken;
  if (!idToken) {
    throw new Error('Apple sign-in did not return an ID token.');
  }

  return idToken;
}
