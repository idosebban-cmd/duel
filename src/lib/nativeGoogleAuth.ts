import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';

const IOS_CLIENT_ID = '462754188770-o0asc8ftvkskfv7qr5el9buvqon8q5fg.apps.googleusercontent.com';
const WEB_CLIENT_ID = '462754188770-2381i9o1p09viqm9peq2r6euvivjkph5.apps.googleusercontent.com';

let initialized = false;

async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  await SocialLogin.initialize({
    google: {
      iOSClientId: IOS_CLIENT_ID,
      iOSServerClientId: WEB_CLIENT_ID,
      webClientId: WEB_CLIENT_ID,
    },
  });
  initialized = true;
}

/**
 * On native platforms (iOS/Android), performs Google Sign-In via the native SDK
 * (ASWebAuthenticationSession on iOS) and returns an ID token for Supabase.
 * On web, returns null so the caller can fall back to the OAuth redirect flow.
 */
export async function getNativeGoogleIdToken(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;

  await ensureInitialized();

  const result = await SocialLogin.login({
    provider: 'google',
    options: {
      scopes: ['profile', 'email'],
    },
  });

  if (result.result.responseType === 'offline') {
    throw new Error('Google sign-in returned offline response without ID token.');
  }

  const idToken = result.result.idToken;
  if (!idToken) {
    throw new Error('Google sign-in did not return an ID token.');
  }

  return idToken;
}
