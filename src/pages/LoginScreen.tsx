import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { profileRowExistsForUser } from '../lib/database';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { SignupLegalConsent } from '../components/legal/SignupLegalConsent';
import { getEmailRedirectTo, getOAuthRedirectTo, getPasswordResetRedirectTo } from '../lib/authRedirect';

function hasOAuthRedirectHash(): boolean {
  const hash = window.location.hash;
  return hash.includes('access_token=') || hash.includes('error=');
}

function friendlyOAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('provider') && lower.includes('not enabled'))
    return 'Google sign-in is not set up yet. Please use email instead.';
  if (lower.includes('network') || lower.includes('fetch'))
    return 'Network error — check your connection and try again.';
  return message;
}

// ─── CRT corner brackets ──────────────────────────────────────────────────────

function CrtBrackets() {
  const corner = 'absolute w-6 h-6 pointer-events-none';
  const border = '2px solid rgba(78,255,196,0.35)';
  return (
    <>
      <div className={`${corner} top-3 left-3`}   style={{ borderTop: border, borderLeft: border }} />
      <div className={`${corner} top-3 right-3`}  style={{ borderTop: border, borderRight: border }} />
      <div className={`${corner} bottom-3 left-3`}  style={{ borderBottom: border, borderLeft: border }} />
      <div className={`${corner} bottom-3 right-3`} style={{ borderBottom: border, borderRight: border }} />
    </>
  );
}

// ─── Floating background icons ────────────────────────────────────────────────

const FLOATING = [
  { src: '/icons/Star.png',           size: 28, x: '8%',  y: '12%', dur: 7.2, delay: 0 },
  { src: '/icons/Lightning bolt.png', size: 22, x: '88%', y: '18%', dur: 5.8, delay: 1 },
  { src: '/icons/Heart.png',          size: 24, x: '15%', y: '72%', dur: 8.1, delay: 2 },
  { src: '/icons/Star.png',           size: 18, x: '80%', y: '65%', dur: 6.5, delay: 0.5 },
  { src: '/icons/Lightning bolt.png', size: 20, x: '50%', y: '8%',  dur: 7.0, delay: 1.5 },
  { src: '/icons/Heart.png',          size: 16, x: '92%', y: '82%', dur: 5.5, delay: 3 },
];

// ─── Eye icon ─────────────────────────────────────────────────────────────────

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M1 9C1 9 3.5 3.5 9 3.5C14.5 3.5 17 9 17 9C17 9 14.5 14.5 9 14.5C3.5 14.5 1 9 1 9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M1 9C1 9 3.5 3.5 9 3.5C14.5 3.5 17 9 17 9C17 9 14.5 14.5 9 14.5C3.5 14.5 1 9 1 9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 16L16 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// ─── Login screen ─────────────────────────────────────────────────────────────

export function LoginScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, setSession, user, session } = useAuthStore();

  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const oauthHandled = useRef(false);

  const inputStyle = (focused: boolean) => ({
    background: 'rgba(255,255,255,0.04)',
    border: `2px solid ${focused ? '#4EFFC4' : 'rgba(78,255,196,0.2)'}`,
    color: 'rgba(255,255,255,0.92)',
    boxShadow: focused ? '0 0 16px rgba(78,255,196,0.2), inset 0 0 8px rgba(78,255,196,0.04)' : 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  });

  const routeAfterAuth = async (userId: string) => {
    const { hasCompletedOnboardingProfile } = useOnboardingStore.getState();
    if (hasCompletedOnboardingProfile) {
      navigate('/discover', { replace: true });
      return;
    }
    const exists = await profileRowExistsForUser(userId);
    if (exists) {
      useOnboardingStore.getState().markOnboardingCompleteAndClearDraft();
      navigate('/discover', { replace: true });
    } else {
      navigate('/onboarding/avatar', { replace: true });
    }
  };

  // ─── Route when session appears (covers OAuth return where GoTrue already consumed the hash) ───
  useEffect(() => {
    if (!user || !session) return;
    void routeAfterAuth(user.id);
  }, [user, session]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Handle Google OAuth redirect return ─────────────────────────────────────
  useEffect(() => {
    if (oauthHandled.current || !supabase || !hasOAuthRedirectHash()) return;
    oauthHandled.current = true;

    setOauthBusy(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if ((event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION') || !s?.user) return;
      subscription.unsubscribe();
      setSession(s);
      setUser(s.user);
      setOauthBusy(false);
      void routeAfterAuth(s.user.id);
    });

    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      setOauthBusy(false);
      setError('Google sign-in did not complete. Please try again.');
    }, 15_000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Google OAuth ────────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    if (loading || oauthBusy) return;
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError('Authentication is not configured.');
      return;
    }

    setLoading(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getOAuthRedirectTo(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (oauthError) {
        setError(friendlyOAuthError(oauthError.message));
        setLoading(false);
      }
    } catch (err) {
      console.error('[LoginScreen] Google OAuth threw:', err);
      setError('Google sign-in is not available. Please use email instead.');
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (loading || oauthBusy) return;
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError('Demo mode: authentication is not configured.');
      return;
    }

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    const userId = signInData.user?.id;
    if (!userId) {
      navigate('/onboarding/avatar');
      return;
    }

    const { hasCompletedOnboardingProfile } = useOnboardingStore.getState();
    if (hasCompletedOnboardingProfile) {
      navigate('/discover');
      return;
    }

    const exists = await profileRowExistsForUser(userId);
    if (exists) {
      useOnboardingStore.getState().markOnboardingCompleteAndClearDraft();
      navigate('/discover');
    } else {
      navigate('/onboarding/avatar');
    }
  };

  const handleSignUp = async () => {
    if (loading || oauthBusy) return;
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError('Demo mode: authentication is not configured.');
      return;
    }

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: getEmailRedirectTo() },
    });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
    } else if (data.user) {
      setUser(data.user);
      useOnboardingStore.getState().setPendingEmailVerification({
        userId: data.user.id,
        email: data.user.email ?? email,
      });
    }

    if (data.user) {
      navigate('/onboarding/create-account');
    }
  };

  const handleForgotPassword = async () => {
    if (!supabase) {
      setError('Demo mode: authentication is not configured.');
      return;
    }
    if (!email) {
      setError('Enter your email above first.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordResetRedirectTo(),
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setMessage('Password reset email sent — check your inbox.');
    }
  };

  const handleSubmit = mode === 'signin' ? handleSignIn : handleSignUp;

  if (oauthBusy) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: '#0A1628' }}>
        <motion.div
          className="text-center px-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="w-12 h-12 mx-auto mb-6 rounded-full"
            style={{ border: '3px solid rgba(78,255,196,0.2)', borderTopColor: '#4EFFC4' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
          <h2
            className="font-display font-extrabold text-2xl mb-2"
            style={{ color: '#4EFFC4', textShadow: '0 0 16px rgba(78,255,196,0.5)' }}
          >
            SIGNING YOU IN
          </h2>
          <p className="font-body text-ui-body" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Almost there…
          </p>
        </motion.div>
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #FF6BA8, #FFE66D, #4EFFC4, #B565FF, #FF6BA8)', boxShadow: '0 0 14px rgba(78,255,196,0.7)' }} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-5"
      style={{ background: '#0A1628' }}
    >

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 35%, rgba(78,255,196,0.06) 0%, transparent 65%)' }}
      />

      {/* Floating icons */}
      {FLOATING.map((f, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none"
          style={{ left: f.x, top: f.y }}
          animate={{ y: [0, -10, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: f.dur, delay: f.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <img src={f.src} alt="" style={{ width: f.size, height: f.size, objectFit: 'contain' }} draggable={false} />
        </motion.div>
      ))}

      {/* CRT corners */}
      <div className="fixed inset-0 pointer-events-none z-20">
        <CrtBrackets />
      </div>

      {/* Card */}
      <motion.div
        className="relative w-full max-w-sm"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      >
        {/* ─── Header ────────────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <motion.div
            className="font-logo text-6xl leading-none mb-1"
            style={{
              background: 'linear-gradient(135deg, #FFE66D 0%, #FF9F1C 50%, #FFE66D 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 20px rgba(255,230,109,0.5))',
              textShadow: 'none',
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
          >
            DUEL
          </motion.div>

          <motion.p
            className="font-display text-xl mt-2"
            style={{ color: 'rgba(255,255,255,0.75)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </motion.p>

          <motion.p
            className="font-display text-sm tracking-widest mt-2"
            style={{ color: '#4EFFC4', textShadow: '0 0 10px rgba(78,255,196,0.7)' }}
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          >
            PLAYER 1 START
          </motion.p>
        </div>

        {/* ─── Mode tabs ──────────────────────────────────────────────────── */}
        <div
          className="flex rounded-xl mb-4 p-1"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(78,255,196,0.1)' }}
        >
          {(['signin', 'signup'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setMode(tab); setError(null); setMessage(null); }}
              className="flex-1 py-2 rounded-lg font-display text-sm transition-all"
              style={{
                background: mode === tab ? 'rgba(78,255,196,0.15)' : 'transparent',
                color: mode === tab ? '#4EFFC4' : 'rgba(255,255,255,0.4)',
                boxShadow: mode === tab ? '0 0 12px rgba(78,255,196,0.2)' : 'none',
              }}
            >
              {tab === 'signin' ? 'SIGN IN' : 'SIGN UP'}
            </button>
          ))}
        </div>

        {/* ─── Google OAuth ──────────────────────────────────────────────── */}
        <motion.button
          onClick={() => void handleGoogleSignIn()}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-display font-extrabold text-lg relative overflow-hidden mb-1 ${loading ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
          style={{
            background: loading ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #4EFFC4 0%, #B565FF 100%)',
            border: '3px solid rgba(255,255,255,0.25)',
            boxShadow: loading ? 'none' : '0 0 28px rgba(78,255,196,0.45), 6px 6px 0px rgba(0,0,0,0.4)',
            color: loading ? 'rgba(255,255,255,0.4)' : '#12122A',
          }}
          whileHover={loading ? {} : { scale: 1.03, boxShadow: '0 0 40px rgba(78,255,196,0.6), 6px 6px 0px rgba(0,0,0,0.4)' }}
          whileTap={loading ? {} : { scale: 0.97 }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          CONTINUE WITH GOOGLE
        </motion.button>

        {/* ─── Divider ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-1">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.12)' }} />
          <span className="font-body text-ui-label font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.7)' }}>OR</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.12)' }} />
        </div>

        {/* ─── Form card ──────────────────────────────────────────────────── */}
        <motion.div
          className="relative rounded-2xl px-6 py-7 flex flex-col gap-4"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '2px solid rgba(78,255,196,0.15)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="font-body text-ui-label font-bold" style={{ color: 'rgba(78,255,196,0.7)' }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="player1@email.com"
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl font-body text-ui-body outline-none placeholder:opacity-30"
              style={inputStyle(emailFocused)}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="font-body text-ui-label font-bold" style={{ color: 'rgba(78,255,196,0.7)' }}>
              PASSWORD
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="••••••••"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                className="w-full px-4 py-3 pr-12 rounded-xl font-body text-ui-body outline-none placeholder:opacity-40"
                style={inputStyle(passFocused)}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors"
                style={{ color: showPass ? '#4EFFC4' : 'rgba(255,255,255,0.3)' }}
              >
                <EyeIcon open={showPass} />
              </button>
            </div>
          </div>

          {/* Forgot password (sign in only) */}
          {mode === 'signin' && (
            <div className="text-right -mt-1">
              <button
                className="font-body text-ui-caption hover:underline transition-opacity hover:opacity-100"
                style={{ color: '#4EFFC4', opacity: 0.7 }}
                onClick={handleForgotPassword}
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Error / success message */}
          <AnimatePresence>
            {(error || message) && (
              <motion.p
                className="font-body text-ui-caption text-center px-2 py-2 rounded-lg"
                style={{
                  background: error ? 'rgba(255,107,108,0.1)' : 'rgba(78,255,196,0.1)',
                  color: error ? '#FF6B6C' : '#4EFFC4',
                  border: `1px solid ${error ? 'rgba(255,107,108,0.3)' : 'rgba(78,255,196,0.3)'}`,
                }}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {error ?? message}
              </motion.p>
            )}
          </AnimatePresence>

          {mode === 'signup' && <SignupLegalConsent className="mt-1" />}

          {/* Submit button */}
          <motion.button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 rounded-xl font-display text-xl relative overflow-hidden"
            style={{
              background: loading
                ? 'rgba(255,255,255,0.08)'
                : 'linear-gradient(135deg, #4EFFC4 0%, #B565FF 100%)',
              color: loading ? 'rgba(255,255,255,0.4)' : '#12122A',
              border: '3px solid rgba(255,255,255,0.2)',
              boxShadow: loading ? 'none' : '0 0 24px rgba(78,255,196,0.4), 4px 4px 0 rgba(0,0,0,0.35)',
              transition: 'background 0.3s, box-shadow 0.3s',
            }}
            whileHover={loading ? {} : { scale: 1.02, boxShadow: '0 0 36px rgba(78,255,196,0.55), 4px 4px 0 rgba(0,0,0,0.35)' }}
            whileTap={loading ? {} : { scale: 0.97 }}
          >
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.span
                  key="loading"
                  className="flex items-center justify-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                    style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'rgba(255,255,255,0.6)', borderRadius: '50%' }}
                  />
                  {mode === 'signin' ? 'SIGNING IN...' : 'CREATING...'}
                </motion.span>
              ) : (
                <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {mode === 'signin' ? 'SIGN IN →' : 'CREATE ACCOUNT →'}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>

        {/* ─── Footer ─────────────────────────────────────────────────────── */}
        <motion.p
          className="text-center font-body text-ui-body mt-6"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {mode === 'signin' ? (
            <>
              Don't have an account?{' '}
              <button
                className="font-bold hover:underline"
                style={{ color: '#FF6BA8' }}
                onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                className="font-bold hover:underline"
                style={{ color: '#FF6BA8' }}
                onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
              >
                Sign in
              </button>
            </>
          )}
        </motion.p>
      </motion.div>

      {/* Bottom neon bar */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[3px]"
        style={{
          background: 'linear-gradient(90deg, #FF6BA8, #FFE66D, #4EFFC4, #B565FF, #FF6BA8)',
          boxShadow: '0 0 14px rgba(78,255,196,0.7)',
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}
