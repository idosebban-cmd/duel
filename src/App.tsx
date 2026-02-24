import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { WelcomeScreen } from './components/onboarding/WelcomeScreen';
import { AvatarSelection } from './components/onboarding/AvatarSelection';
import { BasicsForm } from './components/onboarding/BasicsForm';
import { PhotoUpload } from './components/onboarding/PhotoUpload';
import { GameSelection } from './components/onboarding/GameSelection';
import { RelationshipGoals } from './components/onboarding/RelationshipGoals';
import { LifestyleQuestions } from './components/onboarding/LifestyleQuestions';
import { PlayerCardPreview } from './components/onboarding/PlayerCardPreview';

export default function App() {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Navigate to="/onboarding/welcome" replace />} />
          <Route path="/onboarding/welcome" element={<WelcomeScreen />} />
          <Route path="/onboarding/avatar" element={<AvatarSelection />} />
          <Route path="/onboarding/basics" element={<BasicsForm />} />
          <Route path="/onboarding/photos" element={<PhotoUpload />} />
          <Route path="/onboarding/games" element={<GameSelection />} />
          <Route path="/onboarding/relationship-goals" element={<RelationshipGoals />} />
          <Route path="/onboarding/lifestyle" element={<LifestyleQuestions />} />
          <Route path="/onboarding/preview" element={<PlayerCardPreview />} />
          <Route path="*" element={<Navigate to="/onboarding/welcome" replace />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}
