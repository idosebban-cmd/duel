import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CharacterStep } from './CharacterStep';
import { ElementStep } from './ElementStep';
import { AffiliationStep } from './AffiliationStep';
import { StepIndicator } from '../../ui/ProgressBar';
import { useOnboardingStore } from '../../../store/onboardingStore';

const subSteps = ['Character', 'Element', 'Affiliation'];

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

export function AvatarSelection() {
  const navigate = useNavigate();
  const { character, element, affiliation, updateAvatar, completeStep } = useOnboardingStore();
  const [subStep, setSubStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Local state for current selections (committed on avatar complete)
  const [localChar, setLocalChar] = useState<string | null>(character);
  const [localElement, setLocalElement] = useState<string | null>(element);
  const [localAffiliation, setLocalAffiliation] = useState<string | null>(affiliation);

  const canContinue = [
    !!localChar,
    !!localElement,
    !!localAffiliation,
  ][subStep];

  const handleContinue = () => {
    if (subStep < 2) {
      setDirection(1);
      setSubStep(subStep + 1);
    } else {
      // All steps done — save and navigate
      if (localChar && localElement && localAffiliation) {
        updateAvatar(localChar, localElement, localAffiliation);
        completeStep(1);
        navigate('/onboarding/basics');
      }
    }
  };

  const handleBack = () => {
    if (subStep > 0) {
      setDirection(-1);
      setSubStep(subStep - 1);
    } else {
      navigate('/onboarding/welcome');
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #FFF8F0 0%, #FFF0F5 60%, #F5F0FF 100%)' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4">
        <motion.button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-charcoal/60 font-body font-medium hover:text-charcoal transition-colors"
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Back</span>
        </motion.button>

        <StepIndicator
          currentStep={subStep + 1}
          totalSteps={3}
          stepLabel={subSteps[subStep]}
        />

        <div className="w-16" aria-hidden="true" />
      </div>

      {/* Sub-step tabs */}
      <div className="flex gap-2 px-4 sm:px-6 mb-2">
        {subSteps.map((label, i) => (
          <button
            key={label}
            onClick={() => {
              // Only allow going back to completed steps
              if (i < subStep || (i === 1 && localChar) || (i === 2 && localChar && localElement)) {
                setDirection(i < subStep ? -1 : 1);
                setSubStep(i);
              }
            }}
            className={`flex-1 py-1.5 rounded-full text-xs font-display font-bold transition-all ${
              i === subStep
                ? 'text-white border border-black'
                : i < subStep
                ? 'text-charcoal bg-white border border-black/20'
                : 'text-charcoal/30 bg-transparent'
            }`}
            style={i === subStep ? {
              background: 'linear-gradient(135deg, #FF6BA8, #B565FF)',
            } : {}}
            aria-current={i === subStep ? 'step' : undefined}
          >
            {i < subStep ? '✓ ' : ''}{label}
          </button>
        ))}
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={subStep}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {subStep === 0 && (
              <CharacterStep selected={localChar} onSelect={setLocalChar} />
            )}
            {subStep === 1 && (
              <ElementStep selected={localElement} onSelect={setLocalElement} />
            )}
            {subStep === 2 && (
              <AffiliationStep
                selected={localAffiliation}
                onSelect={setLocalAffiliation}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="px-4 sm:px-6 py-6 border-t border-black/5 bg-cream/80 backdrop-blur-sm">
        <motion.button
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full font-display font-extrabold text-xl text-white rounded-2xl py-4 px-8 relative overflow-hidden"
          style={{
            background: canContinue
              ? 'linear-gradient(135deg, #FF6BA8 0%, #B565FF 100%)'
              : '#d1d5db',
            border: '4px solid black',
            boxShadow: canContinue ? '8px 8px 0px 0px #FFE66D' : 'none',
            cursor: canContinue ? 'pointer' : 'not-allowed',
            textShadow: canContinue ? '1px 1px 0 rgba(0,0,0,0.2)' : 'none',
          }}
          whileHover={canContinue ? { scale: 1.02, boxShadow: '10px 10px 0px 0px #FFE66D' } : {}}
          whileTap={canContinue ? { scale: 0.97 } : {}}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          {canContinue && (
            <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
          )}
          {subStep < 2 ? 'Continue →' : '🎉 Complete Avatar'}
        </motion.button>
      </div>
    </div>
  );
}
