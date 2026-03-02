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

export default function App() {
  useEffect(() => { preloadImages(); }, []);

  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
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

          {/* Game picker */}
          <Route path="/play" element={<GamePicker />} />

          {/* Guess Who game */}
          <Route path="/game" element={<GameSetup />} />
          <Route path="/game/:gameId/lobby" element={<LobbyScreen />} />
          <Route path="/game/:gameId/play" element={<GameBoard />} />
          <Route path="/game/:gameId/result" element={<GameResult />} />

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
