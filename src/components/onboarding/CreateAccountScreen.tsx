import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from '../ui/Icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useOnboardingStore } from '../../store/onboardingStore';
import { upsertProfile, savePhotos } from '../../lib/database';

// Check if URL contains an OAuth redirect hash (access_token, etc.)
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

export function CreateAccountScreen() {
  const navigate = useNavigate();
  const { setUser, setSession } = useAuthStore();
  const store = useOnboardingStore();

  const [mode, setMode] = useState<'main' | 'email'>('main');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  // Track the authenticated user so retry works for both flows
  const [authedUser, setAuthedUser] = useState<{ id: string; email: string } | null>(null);
  const oauthHandled = useRef(false);

  const inputStyle = (focused: boolean) => ({
    background: 'rgba(255,255,255,0.04)',
    border: `2px solid ${focused ? '#4EFFC4' : 'rgba(78,255,196,0.2)'}`,
    color: 'rgba(255,255,255,0.92)',
    boxShadow: focused ? '0 0 16px rgba(78,255,196,0.2), inset 0 0 8px rgba(78,255,196,0.04)' : 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  });

  const saveProfile = async (userId: string, userEmail: string) => {
    console.log('[CreateAccount] Saving profile for user:', userId);
    const { error: profileError } = await upsertProfile(userId, { ...store, email: userEmail });
    if (profileError) {
      console.error('[CreateAccount] upsertProfile failed:', profileError);
      throw new Error(`Failed to save profile: ${profileError.message}`);
    }
    console.log('[CreateAccount] Profile saved');

    if (store.photos.length > 0) {
      await savePhotos(userId, store.photos);
      console.log('[CreateAccount] Photos saved');
    }
  };

  const finishSignUp = async (userId: string, userEmail: string) => {
    setSavingProfile(true);
    setError(null);
    setAuthedUser({ id: userId, email: userEmail });
    try {
      store.setUserId(userId);
      await saveProfile(userId, userEmail);
      navigate('/discover');
      store.reset();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile.';
      setError(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  // ─── Handle Google OAuth redirect return ─────────────────────────────────────
  useEffect(() => {
    if (oauthHandled.current || !supabase || !hasOAuthRedirectHash()) return;
    oauthHandled.current = true;

    setSavingProfile(true);

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          await finishSignUp(session.user.id, session.user.email ?? '');
        } else {
          // Hash present but no session — something went wrong
          setError('Google sign-in did not complete. Please try again.');
          setSavingProfile(false);
        }
      } catch (err) {
        console.error('[CreateAccount] OAuth return error:', err);
        setError('Something went wrong after Google sign-in. Please try again.');
        setSavingProfile(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Google OAuth ────────────────────────────────────────────────────────────
  const handleGoogleSignUp = async () => {
    if (loading || savingProfile) return;
    setError(null);

    if (!supabase) {
      setError('Authentication is not configured.');
      return;
    }

    setLoading(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/onboarding/create-account`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (oauthError) {
        console.error('[CreateAccount] Google OAuth error:', oauthError);
        setError(friendlyOAuthError(oauthError.message));
        setLoading(false);
      }
      // If no error, browser redirects to Google — loading stays true
    } catch (err) {
      console.error('[CreateAccount] Google OAuth threw:', err);
      setError('Google sign-in is not available. Please use email instead.');
      setLoading(false);
    }
  };

  // ─── Email/Password ──────────────────────────────────────────────────────────
  const handleEmailSignUp = async () => {
    if (loading || savingProfile) return;
    setError(null);

    if (!supabase) {
      setError('Authentication is not configured.');
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
    try {
      const { data, error: authError } = await supabase.auth.signUp({ email, password });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      } else if (data.user) {
        setUser(data.user);
      }

      if (data.user) {
        setLoading(false);
        await finishSignUp(data.user.id, data.user.email ?? email);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setError(msg);
      setLoading(false);
    }
  };

  // ─── Retry handler (works for both Google and email flows) ───────────────────
  const handleRetry = async () => {
    if (!authedUser) return;
    await finishSignUp(authedUser.id, authedUser.email);
  };

  // ─── Saving profile state (shown after OAuth redirect or during save) ────────
  if (savingProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: '#12122A' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(78,255,196,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(78,255,196,0.06) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)' }} />

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
            SETTING UP YOUR PROFILE
          </h2>
          <p className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Almost ready to play...
          </p>
        </motion.div>

        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #FF6BA8, #FFE66D, #4EFFC4, #B565FF, #FF6BA8)', boxShadow: '0 0 14px rgba(78,255,196,0.7)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#12122A' }}>
      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(78,255,196,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(78,255,196,0.06) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)' }} />
      {/* Corner brackets */}
      <div className="absolute top-4 left-4 w-8 h-8 border-t-[3px] border-l-[3px] border-electric-mint/40 pointer-events-none" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t-[3px] border-r-[3px] border-electric-mint/40 pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center px-4 sm:px-6 py-4 gap-3">
        <motion.button
          onClick={() => mode === 'email' ? setMode('main') : navigate('/onboarding/preview')}
          className="flex items-center gap-1.5 font-body font-medium text-sm flex-shrink-0"
          style={{ color: 'rgba(255,255,255,0.55)' }}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft size={18} /><span>Back</span>
        </motion.button>
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <span className="font-body text-xs font-bold tracking-widest uppercase" style={{ color: '#4EFFC4' }}>Almost There</span>
          <div className="flex gap-1">
            {[0,1,2,3,4,5,6,7,8,9,10].map((i) => (
              <div key={i} className="h-1.5 rounded-full" style={{ width: i === 10 ? 24 : 8, background: '#FF6BA8' }} />
            ))}
          </div>
        </div>
        <div className="w-14 flex-shrink-0" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6">
        <div className="max-w-sm w-full">
          {/* Header */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div
              className="text-6xl mb-4"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img
                src="/icons/Star.png"
                alt=""
                className="w-16 h-16 mx-auto object-contain"
                style={{ filter: 'drop-shadow(0 0 12px rgba(255,230,109,0.6))' }}
              />
            </motion.div>
            <h1
              className="font-display font-extrabold text-3xl sm:text-4xl mb-2"
              style={{
                background: 'linear-gradient(135deg, #FFE66D, #FF9F1C)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 16px rgba(255,230,109,0.4))',
              }}
            >
              PLAYER CARD READY
            </h1>
            <p className="font-body" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Create your account to start playing
            </p>
          </motion.div>

          {/* Error banner with retry (shown above form for both flows) */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="mb-4 px-4 py-3 rounded-xl font-body text-sm text-center"
                style={{ background: 'rgba(255,107,168,0.1)', border: '1px solid rgba(255,107,168,0.3)', color: '#FF6BA8' }}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <p>{error}</p>
                {authedUser && (
                  <motion.button
                    onClick={handleRetry}
                    className="mt-2 px-4 py-1.5 rounded-lg font-display font-bold text-xs"
                    style={{ background: 'rgba(255,107,168,0.2)', border: '1px solid rgba(255,107,168,0.4)' }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    TAP TO RETRY
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {mode === 'main' ? (
              <motion.div
                key="main"
                className="space-y-4"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
              >
                {/* Google button (primary) */}
                <motion.button
                  onClick={handleGoogleSignUp}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-display font-extrabold text-lg relative overflow-hidden"
                  style={{
                    background: loading ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #4EFFC4 0%, #B565FF 100%)',
                    border: '3px solid rgba(255,255,255,0.25)',
                    boxShadow: loading ? 'none' : '0 0 28px rgba(78,255,196,0.45), 6px 6px 0px rgba(0,0,0,0.4)',
                    color: loading ? 'rgba(255,255,255,0.4)' : '#12122A',
                  }}
                  whileHover={loading ? {} : { scale: 1.03, boxShadow: '0 0 40px rgba(78,255,196,0.6), 6px 6px 0px rgba(0,0,0,0.4)' }}
                  whileTap={loading ? {} : { scale: 0.97 }}
                >
                  <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                  {loading ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                        style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#12122A', borderRadius: '50%' }}
                      />
                      CONNECTING...
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      CONTINUE WITH GOOGLE
                    </>
                  )}
                </motion.button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.12)' }} />
                  <span className="font-body text-xs font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>OR</span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.12)' }} />
                </div>

                {/* Email option (secondary) */}
                <motion.button
                  onClick={() => { setError(null); setMode('email'); }}
                  className="w-full py-4 rounded-2xl font-display font-bold text-base"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '2px solid rgba(255,255,255,0.15)',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                  whileHover={{ scale: 1.02, borderColor: 'rgba(78,255,196,0.4)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  SIGN UP WITH EMAIL
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="email"
                className="space-y-4"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
              >
                {/* Email form */}
                <div
                  className="rounded-2xl px-6 py-6 flex flex-col gap-4"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '2px solid rgba(78,255,196,0.15)',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
                  }}
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="font-body text-xs font-bold" style={{ color: 'rgba(78,255,196,0.7)' }}>EMAIL</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEmailSignUp()}
                      placeholder="player1@email.com"
                      autoComplete="email"
                      className="w-full px-4 py-3 rounded-xl font-body text-sm outline-none placeholder:opacity-30"
                      style={inputStyle(emailFocused)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-body text-xs font-bold" style={{ color: 'rgba(78,255,196,0.7)' }}>PASSWORD</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setPassFocused(true)}
                        onBlur={() => setPassFocused(false)}
                        onKeyDown={(e) => e.key === 'Enter' && handleEmailSignUp()}
                        placeholder="6+ characters"
                        autoComplete="new-password"
                        className="w-full px-4 py-3 pr-12 rounded-xl font-body text-sm outline-none placeholder:opacity-40"
                        style={inputStyle(passFocused)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md"
                        style={{ color: showPass ? '#4EFFC4' : 'rgba(255,255,255,0.3)' }}
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M1 9C1 9 3.5 3.5 9 3.5C14.5 3.5 17 9 17 9C17 9 14.5 14.5 9 14.5C3.5 14.5 1 9 1 9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                          <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                          {!showPass && <path d="M2 16L16 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>}
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <motion.button
                    onClick={handleEmailSignUp}
                    disabled={loading}
                    className="w-full py-4 rounded-xl font-display text-lg relative overflow-hidden"
                    style={{
                      background: loading ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #4EFFC4 0%, #B565FF 100%)',
                      color: loading ? 'rgba(255,255,255,0.4)' : '#12122A',
                      border: '3px solid rgba(255,255,255,0.2)',
                      boxShadow: loading ? 'none' : '0 0 24px rgba(78,255,196,0.4), 4px 4px 0 rgba(0,0,0,0.35)',
                    }}
                    whileHover={loading ? {} : { scale: 1.02 }}
                    whileTap={loading ? {} : { scale: 0.97 }}
                  >
                    <AnimatePresence mode="wait">
                      {loading ? (
                        <motion.span key="loading" className="flex items-center justify-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                            style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#12122A', borderRadius: '50%' }}
                          />
                          CREATING ACCOUNT...
                        </motion.span>
                      ) : (
                        <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          CREATE ACCOUNT
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Log in link */}
          <motion.p
            className="text-center font-body text-sm mt-6"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Already playing?{' '}
            <button
              className="font-semibold hover:underline"
              style={{ color: '#FF6BA8' }}
              onClick={() => navigate('/login?mode=signin')}
            >
              Log in
            </button>
          </motion.p>
        </div>
      </div>

      {/* Neon bottom bar */}
      <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #FF6BA8, #FFE66D, #4EFFC4, #B565FF, #FF6BA8)', boxShadow: '0 0 14px rgba(78,255,196,0.7)' }} />
    </div>
  );
}
