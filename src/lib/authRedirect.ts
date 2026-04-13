import { Capacitor } from '@capacitor/core';

/** Canonical native redirect for Supabase email confirmation, resend, OAuth return, and password reset. */
export const NATIVE_AUTH_REDIRECT = 'app.playduel://';

const WEB_POST_CONFIRM_PATH = '/onboarding/create-account';

function webOrigin(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

/**
 * Email confirmation, signup resend, and password reset emails — must match Supabase Dashboard redirect allowlist.
 */
export function getEmailRedirectTo(): string {
  if (Capacitor.isNativePlatform()) {
    return NATIVE_AUTH_REDIRECT;
  }
  return `${webOrigin()}${WEB_POST_CONFIRM_PATH}`;
}

/**
 * Google OAuth return URL.
 * Native: `app.playduel:///path` (empty host, path /path — matches intent filter scheme).
 * Web: defaults to /onboarding/create-account; callers can override with `webPath` (must be in Supabase redirect allowlist).
 */
export function getOAuthRedirectTo(webPath?: string): string {
  if (Capacitor.isNativePlatform()) {
    const path = WEB_POST_CONFIRM_PATH.replace(/^\//, '');
    return `app.playduel:///${path}`;
  }
  return `${webOrigin()}${webPath ?? WEB_POST_CONFIRM_PATH}`;
}

/**
 * Password reset link destination (web: /login; native: custom scheme so the app opens).
 */
export function getPasswordResetRedirectTo(): string {
  if (Capacitor.isNativePlatform()) {
    return 'app.playduel:///login';
  }
  return `${webOrigin()}/login`;
}
