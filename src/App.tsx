import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { preloadImages } from './utils/preloadImages';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { useOnboardingStore } from './store/onboardingStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import { OnboardingGuard } from './components/OnboardingGuard';
import { WelcomeScreen } from './components/onboarding/WelcomeScreen';
import { AvatarSelection } from './components/onboarding/AvatarSelection';
import { BasicsForm } from './components/onboarding/BasicsForm';
import { PhotoUpload } from './components/onboarding/PhotoUpload';
import { GameSelection } from './components/onboarding/GameSelection';
import { RelationshipGoals } from './components/onboarding/RelationshipGoals';
import { PreferencesStep } from './components/onboarding/PreferencesStep';
import { LifestyleQuestions } from './components/onboarding/LifestyleQuestions';
import { BioStep } from './components/onboarding/BioStep';
import { PlayerCardPreview } from './components/onboarding/PlayerCardPreview';
import { PromptsSelection } from './components/onboarding/PromptsSelection';
import { CreateAccountScreen } from './components/onboarding/CreateAccountScreen';
import { GameSetup } from './pages/game/GameSetup';
import { GameBoard } from './pages/game/GameBoard';
import { GameResult } from './pages/game/GameResult';
import { DotDashSetup } from './pages/game/DotDashSetup';
import { DotDashLobby } from './pages/game/DotDashLobby';
import { DotDashBoard } from './pages/game/DotDashBoard';
import { DotDashResult } from './pages/game/DotDashResult';
import { GamePicker } from './pages/game/GamePicker';
import { LandingPage } from './pages/LandingPage';
import { DiscoverScreen } from './pages/DiscoverScreen';
import { LoginScreen } from './pages/LoginScreen';
import { MatchesScreen } from './pages/MatchesScreen';
import { ProfileScreen } from './pages/ProfileScreen';
import { MatchScreen } from './pages/MatchScreen';
import { WordBlitz } from './pages/game/WordBlitz';
import { Draughts } from './pages/game/Draughts';
import { ConnectFour } from './pages/game/ConnectFour';
import { Battleship } from './pages/game/Battleship';
import { getProfile } from './lib/database';
import { supabase as supabaseClient } from './lib/supabase';
import { prepareAcceptedChallenge, resolveGameRoute, normalizeGameType } from './lib/challengeGameFlow';
import { ErrorBoundary } from './components/ErrorBoundary';

const FALLBACK_PROD_SERVER_URL = 'https://duel-fast.onrender.com';
const SERVER_URL = import.meta.env.VITE_SERVER_URL
  || (import.meta.env.DEV ? 'http://localhost:3001' : FALLBACK_PROD_SERVER_URL);

interface ChallengeEventRow {
  id: string;
  from_user: string;
  to_user: string;
  match_id: string;
  game_type: string;
  status: string;
}

interface GlobalChallengeToastState {
  message: string;
  actionLabel: string;
  kind: 'success' | 'error';
  onAction: () => void;
}

const LAST_SEEN_MIN_INTERVAL_MS = 60_000;

/** Updates profiles.last_seen while the app is active; throttled to avoid spamming the DB. */
function LastSeenHeartbeat() {
  const location = useLocation();
  const { user } = useAuthStore();
  const lastSentAtRef = useRef(0);
  const inFlightRef = useRef(false);

  const bumpLastSeen = useCallback(async () => {
    if (!supabaseClient || !user?.id) return;
    const now = Date.now();
    if (now - lastSentAtRef.current < LAST_SEEN_MIN_INTERVAL_MS) return;
    if (inFlightRef.current) return;
    lastSentAtRef.current = now;
    inFlightRef.current = true;
    try {
      const { error } = await supabaseClient
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);
      if (error) console.error('[LastSeenHeartbeat] update failed:', error);
    } catch (err) {
      console.error('[LastSeenHeartbeat]', err);
    } finally {
      inFlightRef.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    void bumpLastSeen();
  }, [location.pathname, bumpLastSeen]);

  useEffect(() => {
    const onFocus = () => { void bumpLastSeen(); };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void bumpLastSeen();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [bumpLastSeen]);

  return null;
}

function GlobalChallengeListener() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [toast, setToast] = useState<GlobalChallengeToastState | null>(null);

  const dedupeRef = useRef<Map<string, number>>(new Map());
  const inFlightRef = useRef<Set<string>>(new Set());

  const runSetup = useCallback(async (challenge: ChallengeEventRow): Promise<boolean> => {
    const result = await prepareAcceptedChallenge({
      matchId: challenge.match_id,
      gameType: challenge.game_type,
      myUserId: user?.id ?? '',
    });
    return result.ok;
  }, [user?.id]);

  const showSuccessToast = useCallback(async (challenge: ChallengeEventRow) => {
    const route = resolveGameRoute(challenge.game_type, challenge.match_id);
    if (!route) return;

    let name = 'Someone';
    try {
      const profile = await getProfile(challenge.to_user);
      if (profile.data?.name) name = profile.data.name;
    } catch {
      // Best-effort only.
    }

    setToast({
      kind: 'success',
      message: `${name} accepted your challenge!`,
      actionLabel: 'Join game',
      onAction: async () => {
        setToast(null);

        const normalizedType = normalizeGameType(challenge.game_type);
        if (normalizedType !== 'dot_dash') {
          navigate(route.path);
          return;
        }

        // Dot Dash uses in-memory game state on the Socket.IO server.
        // Create (idempotently) first, keyed by the Duel matchId.
        try {
          const myUserId = user?.id;
          if (!myUserId) throw new Error('Missing user identity');

          const opponentId = challenge.to_user;
          const [p1Id, p2Id] = myUserId < opponentId ? [myUserId, opponentId] : [opponentId, myUserId];

          // Best-effort: fetch my profile name for the lobby.
          let myName = 'Player 1';
          try {
            const myProfile = await getProfile(myUserId);
            if (myProfile.data?.name) myName = myProfile.data.name;
          } catch {
            // ignore
          }

          const p1Name = p1Id === myUserId ? myName : name;
          const p2Name = p2Id === myUserId ? myName : name;

          const res = await fetch(`${SERVER_URL}/api/dotdash/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gameId: challenge.match_id,
              player1Id: p1Id,
              player1Name: p1Name,
              player2Id: p2Id,
              player2Name: p2Name,
            }),
          });

          if (!res.ok) throw new Error(`DotDash create failed: ${res.status}`);
          const created = await res.json().catch(() => null) as { gameId?: string } | null;
          const ddGameId = created?.gameId ?? challenge.match_id;
          navigate(`/dotdash/${ddGameId}/play`);
        } catch (err) {
          console.error('[App] DotDash create failed:', err);
          // Fall back to the resolved route so at least navigation happens.
          navigate(route.path);
        }
      },
    });
  }, [navigate, user?.id]);

  const showRetryToast = useCallback((challenge: ChallengeEventRow) => {
    setToast({
      kind: 'error',
      message: "Couldn't start game — tap to retry",
      actionLabel: 'Retry',
      onAction: async () => {
        const ok = await runSetup(challenge);
        if (ok) {
          await showSuccessToast(challenge);
        }
      },
    });
  }, [runSetup, showSuccessToast]);

  const showIncomingChallengeToast = useCallback(async (challenge: ChallengeEventRow) => {
    let name = 'Someone';
    try {
      const profile = await getProfile(challenge.from_user);
      if (profile.data?.name) name = profile.data.name;
    } catch {
      // Best-effort only.
    }

    setToast({
      kind: 'success',
      message: `${name} challenged you to a game!`,
      actionLabel: 'View',
      onAction: () => {
        setToast(null);
        navigate(`/match/${challenge.match_id}`);
      },
    });
  }, [navigate]);

  useEffect(() => {
    if (!supabase || !user?.id) return;
    const sb = supabase;

    const channel = sb
      .channel(`app-challenges-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'challenges',
          filter: `from_user=eq.${user.id}`,
        },
        async (payload) => {
          const updated = payload.new as ChallengeEventRow;
          if (!updated || updated.status !== 'accepted') return;

          const dedupeKey = `${updated.match_id}:${updated.game_type}`;
          const now = Date.now();
          const last = dedupeRef.current.get(dedupeKey) ?? 0;
          if (now - last < 5000) return;
          dedupeRef.current.set(dedupeKey, now);

          if (inFlightRef.current.has(updated.id)) return;
          inFlightRef.current.add(updated.id);

          try {
            const ok = await runSetup(updated);
            if (ok) {
              await showSuccessToast(updated);
            } else {
              showRetryToast(updated);
            }
          } finally {
            inFlightRef.current.delete(updated.id);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'challenges',
          filter: `to_user=eq.${user.id}`,
        },
        async (payload) => {
          const inserted = payload.new as ChallengeEventRow;
          if (!inserted || inserted.status !== 'pending') return;

          const dedupeKey = `${inserted.match_id}:${inserted.game_type}`;
          const now = Date.now();
          const last = dedupeRef.current.get(dedupeKey) ?? 0;
          if (now - last < 5000) return;
          dedupeRef.current.set(dedupeKey, now);

          await showIncomingChallengeToast(inserted);
        },
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [runSetup, showIncomingChallengeToast, showRetryToast, showSuccessToast, user?.id]);

  if (!toast) return null;

  return (
    <div
      className="fixed top-4 left-1/2 z-[300] -translate-x-1/2 px-4 pointer-events-auto"
      style={{ width: 'min(92vw, 460px)' }}
    >
      <div
        className="rounded-2xl px-3 py-3 flex items-center gap-2"
        style={{
          background: toast.kind === 'success'
            ? 'linear-gradient(135deg, rgba(78,255,196,0.2), rgba(0,217,255,0.2))'
            : 'linear-gradient(135deg, rgba(255,61,113,0.2), rgba(255,107,168,0.2))',
          border: toast.kind === 'success'
            ? '1.5px solid rgba(78,255,196,0.55)'
            : '1.5px solid rgba(255,61,113,0.6)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="flex-1 min-w-0 font-body text-sm text-white/90 pr-1">
          {toast.message}
        </div>
        <button
          type="button"
          onClick={toast.onAction}
          className="shrink-0 px-3 py-2 rounded-lg font-display font-bold text-xs touch-manipulation"
          style={{
            background: toast.kind === 'success'
              ? 'linear-gradient(135deg, #4EFFC4, #00D9FF)'
              : 'linear-gradient(135deg, #FF3D71, #FF6BA8)',
            color: toast.kind === 'success' ? '#0f172a' : '#ffffff',
          }}
        >
          {toast.actionLabel}
        </button>
        <button
          type="button"
          onClick={() => setToast(null)}
          aria-label="Dismiss challenge toast"
          className="shrink-0 min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl flex items-center justify-center font-display font-bold text-lg leading-none touch-manipulation"
          style={{
            background: toast.kind === 'success'
              ? 'rgba(78,255,196,0.12)'
              : 'rgba(255,61,113,0.12)',
            color: toast.kind === 'success' ? '#4EFFC4' : '#FF3D71',
            border: toast.kind === 'success'
              ? '1px solid rgba(78,255,196,0.45)'
              : '1px solid rgba(255,61,113,0.45)',
          }}
        >
          X
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const { setUser, setSession, setLoading } = useAuthStore();
  const { setUserId } = useOnboardingStore();

  useEffect(() => {
    preloadImages();

    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setUserId(session?.user?.id ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setUserId(null);
      } else if (session) {
        setSession(session);
        setUser(session.user);
        setUserId(session.user.id);
      } else {
        // Transient failure (no session, not SIGNED_OUT) — attempt refresh
        supabase!.auth.getSession().then(({ data }) => {
          if (data.session) {
            setSession(data.session);
            setUser(data.session.user);
            setUserId(data.session.user.id);
          } else {
            setSession(null);
            setUser(null);
            setUserId(null);
          }
        });
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setSession, setLoading, setUserId]);

  return (
    <BrowserRouter>
      <LastSeenHeartbeat />
      <GlobalChallengeListener />
      <AnimatePresence mode="wait">
        <ErrorBoundary>
          <Routes>
          {/* Landing page */}
          <Route path="/landing" element={<LandingPage />} />

          {/* Welcome screen (public — entry point) */}
          <Route path="/" element={<Navigate to="/onboarding/welcome" replace />} />
          <Route path="/onboarding/welcome" element={<WelcomeScreen />} />

          {/* Onboarding (unprotected — auth happens at the end) */}
          <Route path="/onboarding/avatar" element={<OnboardingGuard><AvatarSelection /></OnboardingGuard>} />
          <Route path="/onboarding/basics" element={<OnboardingGuard><BasicsForm /></OnboardingGuard>} />
          <Route path="/onboarding/photos" element={<OnboardingGuard><PhotoUpload /></OnboardingGuard>} />
          <Route path="/onboarding/games" element={<OnboardingGuard><GameSelection /></OnboardingGuard>} />
          <Route path="/onboarding/relationship-goals" element={<OnboardingGuard><RelationshipGoals /></OnboardingGuard>} />
          <Route path="/onboarding/preferences" element={<OnboardingGuard><PreferencesStep /></OnboardingGuard>} />
          <Route path="/onboarding/lifestyle" element={<OnboardingGuard><LifestyleQuestions /></OnboardingGuard>} />
          <Route path="/onboarding/bio" element={<OnboardingGuard><BioStep /></OnboardingGuard>} />
          <Route path="/onboarding/prompts" element={<OnboardingGuard><PromptsSelection /></OnboardingGuard>} />
          <Route path="/onboarding/preview" element={<OnboardingGuard><PlayerCardPreview /></OnboardingGuard>} />
          <Route path="/onboarding/create-account" element={<CreateAccountScreen />} />

          {/* Login */}
          <Route path="/login" element={<LoginScreen />} />

          {/* Protected routes */}
          <Route path="/discover" element={<ProtectedRoute><DiscoverScreen /></ProtectedRoute>} />
          <Route path="/matches" element={<ProtectedRoute><MatchesScreen /></ProtectedRoute>} />
          <Route path="/match/:matchId" element={<ProtectedRoute><MatchScreen /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
          <Route path="/play" element={<ProtectedRoute><GamePicker /></ProtectedRoute>} />

          {/* Guess Who game */}
          <Route path="/game" element={<ProtectedRoute><GameSetup /></ProtectedRoute>} />
          <Route path="/game/:gameId/play" element={<ProtectedRoute><ErrorBoundary><GameBoard /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/game/:gameId/result" element={<ProtectedRoute><GameResult /></ProtectedRoute>} />

          {/* Word Blitz */}
          <Route path="/games/word-blitz/:matchId" element={<ProtectedRoute><WordBlitz /></ProtectedRoute>} />
          <Route path="/games/word-blitz" element={<ProtectedRoute><WordBlitz /></ProtectedRoute>} />

          {/* Draughts */}
          <Route path="/games/draughts/:matchId" element={<ProtectedRoute><ErrorBoundary><Draughts /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/games/draughts" element={<ProtectedRoute><ErrorBoundary><Draughts /></ErrorBoundary></ProtectedRoute>} />

          {/* Connect Four */}
          <Route path="/games/connect-four/:matchId" element={<ProtectedRoute><ErrorBoundary><ConnectFour /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/games/connect-four" element={<ProtectedRoute><ErrorBoundary><ConnectFour /></ErrorBoundary></ProtectedRoute>} />

          {/* Battleship */}
          <Route path="/games/battleship/:matchId" element={<ProtectedRoute><ErrorBoundary><Battleship /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/games/battleship" element={<ProtectedRoute><ErrorBoundary><Battleship /></ErrorBoundary></ProtectedRoute>} />

          {/* Dot Dash */}
          <Route path="/dotdash" element={<ProtectedRoute><DotDashSetup /></ProtectedRoute>} />
          <Route path="/dotdash/:gameId/lobby" element={<ProtectedRoute><DotDashLobby /></ProtectedRoute>} />
          <Route path="/dotdash/:gameId/play" element={<ProtectedRoute><ErrorBoundary><DotDashBoard /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/dotdash/:gameId/result" element={<ProtectedRoute><DotDashResult /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/onboarding/welcome" replace />} />
          </Routes>
        </ErrorBoundary>
      </AnimatePresence>
    </BrowserRouter>
  );
}
