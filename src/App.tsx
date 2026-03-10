import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { preloadImages } from './utils/preloadImages';
import { WelcomeScreen } from './components/onboarding/WelcomeScreen';
import { AvatarSelection } from './components/onboarding/AvatarSelection';
import { BasicsForm } from './components/onboarding/BasicsForm';
import { PhotoUpload } from './components/onboarding/PhotoUpload';
import { GameSelection } from './components/onboarding/GameSelection';
import { RelationshipGoals } from './components/onboarding/RelationshipGoals';
import { LifestyleQuestions } from './components/onboarding/LifestyleQuestions';
import { PlayerCardPreview } from './components/onboarding/PlayerCardPreview';
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

export default function App() {
  useEffect(() => { preloadImages(); }, []);

  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Landing page */}
          <Route path="/landing" element={<LandingPage />} />

          {/* Onboarding */}
          <Route path="/" element={<Navigate to="/onboarding/welcome" replace />} />
          <Route path="/onboarding/welcome" element={<WelcomeScreen />} />
          <Route path="/onboarding/avatar" element={<AvatarSelection />} />
          <Route path="/onboarding/basics" element={<BasicsForm />} />
          <Route path="/onboarding/photos" element={<PhotoUpload />} />
          <Route path="/onboarding/games" element={<GameSelection />} />
          <Route path="/onboarding/relationship-goals" element={<RelationshipGoals />} />
          <Route path="/onboarding/lifestyle" element={<LifestyleQuestions />} />
          <Route path="/onboarding/preview" element={<PlayerCardPreview />} />

          {/* Login */}
          <Route path="/login" element={<LoginScreen />} />

          {/* Discover / matching */}
          <Route path="/discover" element={<DiscoverScreen />} />

          {/* Matches hub */}
          <Route path="/matches" element={<MatchesScreen />} />

          {/* Profile */}
          <Route path="/profile" element={<ProfileScreen />} />

          {/* Chat */}
          <Route path="/chat" element={<ChatScreen />} />

          {/* Game picker */}
          <Route path="/play" element={<GamePicker />} />

          {/* Guess Who game */}
          <Route path="/game" element={<GameSetup />} />
          <Route path="/game/:gameId/lobby" element={<LobbyScreen />} />
          <Route path="/game/:gameId/play" element={<GameBoard />} />
          <Route path="/game/:gameId/result" element={<GameResult />} />

          {/* Word Blitz */}
          <Route path="/games/word-blitz/:matchId" element={<WordBlitz />} />
          <Route path="/games/word-blitz" element={<WordBlitz />} />

          {/* Draughts */}
          <Route path="/games/draughts/:matchId" element={<Draughts />} />
          <Route path="/games/draughts" element={<Draughts />} />

          {/* Dot Dash – maze racing game */}
          <Route path="/dotdash" element={<DotDashSetup />} />
          <Route path="/dotdash/:gameId/lobby" element={<DotDashLobby />} />
          <Route path="/dotdash/:gameId/play" element={<DotDashBoard />} />
          <Route path="/dotdash/:gameId/result" element={<DotDashResult />} />

          <Route path="*" element={<Navigate to="/onboarding/welcome" replace />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}
