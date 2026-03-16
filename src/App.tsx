import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { preloadImages } from './utils/preloadImages';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { useOnboardingStore } from './store/onboardingStore';
import { ProtectedRoute } from './components/ProtectedRoute';
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
import { GameSetup } from './pages/game/GameSetup';
import { LobbyScreen } from './pages/game/LobbyScreen';
import { GameBoard } from './pages/game/GameBoard';
import { GameResult } from './pages/game/GameResult';
import { DotDashSetup } from './pages/game/DotDashSetup';
import { DotDashLobby } from './pages/game/DotDashLobby';
import { DotDashBoard } from './pages/game/DotDashBoard';
import { DotDashResult } from './pages/game/DotDashResult';
import { GamePicker } from './pages/game/GamePicker';
import { LandingPage } from './pages/LandingPage';
import { DiscoverScreen } from './pages/DiscoverScreen';
import { ChatScreen } from './pages/ChatScreen';
import { LoginScreen } from './pages/LoginScreen';
import { MatchesScreen } from './pages/MatchesScreen';
import { ProfileScreen } from './pages/ProfileScreen';
import { WordBlitz } from './pages/game/WordBlitz';
import { Draughts } from './pages/game/Draughts';
import { ConnectFour } from './pages/game/ConnectFour';
import { Battleship } from './pages/game/Battleship';

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setUserId(session?.user?.id ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setSession, setLoading, setUserId]);

  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Landing page */}
          <Route path="/landing" element={<LandingPage />} />

          {/* Welcome screen (public — entry point) */}
          <Route path="/" element={<Navigate to="/onboarding/welcome" replace />} />
          <Route path="/onboarding/welcome" element={<WelcomeScreen />} />

          {/* Onboarding (protected — requires sign-up first) */}
          <Route path="/onboarding/avatar" element={<ProtectedRoute><AvatarSelection /></ProtectedRoute>} />
          <Route path="/onboarding/basics" element={<ProtectedRoute><BasicsForm /></ProtectedRoute>} />
          <Route path="/onboarding/photos" element={<ProtectedRoute><PhotoUpload /></ProtectedRoute>} />
          <Route path="/onboarding/games" element={<ProtectedRoute><GameSelection /></ProtectedRoute>} />
          <Route path="/onboarding/relationship-goals" element={<ProtectedRoute><RelationshipGoals /></ProtectedRoute>} />
          <Route path="/onboarding/preferences" element={<ProtectedRoute><PreferencesStep /></ProtectedRoute>} />
          <Route path="/onboarding/lifestyle" element={<ProtectedRoute><LifestyleQuestions /></ProtectedRoute>} />
          <Route path="/onboarding/bio" element={<ProtectedRoute><BioStep /></ProtectedRoute>} />
          <Route path="/onboarding/prompts" element={<ProtectedRoute><PromptsSelection /></ProtectedRoute>} />
          <Route path="/onboarding/preview" element={<ProtectedRoute><PlayerCardPreview /></ProtectedRoute>} />

          {/* Login */}
          <Route path="/login" element={<LoginScreen />} />

          {/* Protected routes */}
          <Route path="/discover" element={<ProtectedRoute><DiscoverScreen /></ProtectedRoute>} />
          <Route path="/matches" element={<ProtectedRoute><MatchesScreen /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatScreen /></ProtectedRoute>} />
          <Route path="/play" element={<ProtectedRoute><GamePicker /></ProtectedRoute>} />

          {/* Guess Who game */}
          <Route path="/game" element={<ProtectedRoute><GameSetup /></ProtectedRoute>} />
          <Route path="/game/:gameId/lobby" element={<ProtectedRoute><LobbyScreen /></ProtectedRoute>} />
          <Route path="/game/:gameId/play" element={<ProtectedRoute><GameBoard /></ProtectedRoute>} />
          <Route path="/game/:gameId/result" element={<ProtectedRoute><GameResult /></ProtectedRoute>} />

          {/* Word Blitz */}
          <Route path="/games/word-blitz/:matchId" element={<ProtectedRoute><WordBlitz /></ProtectedRoute>} />
          <Route path="/games/word-blitz" element={<ProtectedRoute><WordBlitz /></ProtectedRoute>} />

          {/* Draughts */}
          <Route path="/games/draughts/:matchId" element={<ProtectedRoute><Draughts /></ProtectedRoute>} />
          <Route path="/games/draughts" element={<ProtectedRoute><Draughts /></ProtectedRoute>} />

          {/* Connect Four */}
          <Route path="/games/connect-four/:matchId" element={<ProtectedRoute><ConnectFour /></ProtectedRoute>} />
          <Route path="/games/connect-four" element={<ProtectedRoute><ConnectFour /></ProtectedRoute>} />

          {/* Battleship */}
          <Route path="/games/battleship/:matchId" element={<ProtectedRoute><Battleship /></ProtectedRoute>} />
          <Route path="/games/battleship" element={<ProtectedRoute><Battleship /></ProtectedRoute>} />

          {/* Dot Dash */}
          <Route path="/dotdash" element={<ProtectedRoute><DotDashSetup /></ProtectedRoute>} />
          <Route path="/dotdash/:gameId/lobby" element={<ProtectedRoute><DotDashLobby /></ProtectedRoute>} />
          <Route path="/dotdash/:gameId/play" element={<ProtectedRoute><DotDashBoard /></ProtectedRoute>} />
          <Route path="/dotdash/:gameId/result" element={<ProtectedRoute><DotDashResult /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/onboarding/welcome" replace />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}
