import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CharacterStep } from './CharacterStep';
import { ElementStep } from './ElementStep';
import { AffiliationStep } from './AffiliationStep';
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
        <motion.button onClick={handleBack} className="flex items-center gap-1.5 font-body font-medium text-sm flex-shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }} whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}>
          <ArrowLeft size={18} /><span>Back</span>
        </motion.button>

        <div className="flex-1 flex flex-col items-center gap-1.5">
          <span className="font-body text-xs font-bold tracking-widest uppercase" style={{ color: '#4EFFC4' }}>Avatar · {subSteps[subStep]}</span>
          <div className="flex gap-1">
            {[0,1,2,3,4,5,6,7].map((i) => (
              <div key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === 1 ? 24 : 8, background: i < 1 ? '#FF6BA8' : i === 1 ? 'linear-gradient(90deg, #4EFFC4, #FF6BA8)' : 'rgba(255,255,255,0.15)' }} />
            ))}
          </div>
        </div>

        <div className="w-14 flex-shrink-0" />
      </div>

      {/* Sub-step tabs */}
      <div className="relative z-10 flex gap-2 px-4 sm:px-6 mb-2">
        {subSteps.map((label, i) => (
          <button key={label} onClick={() => { if (i < subStep || (i === 1 && localChar) || (i === 2 && localChar && localElement)) { setDirection(i < subStep ? -1 : 1); setSubStep(i); } }} className="flex-1 py-1.5 rounded-full text-xs font-display font-bold transition-all"
            style={i === subStep ? { background: 'linear-gradient(135deg, #FF6BA8, #B565FF)', color: '#12122A', border: '2px solid rgba(255,255,255,0.3)' } : i < subStep ? { background: 'rgba(78,255,196,0.12)', color: '#4EFFC4', border: '2px solid rgba(78,255,196,0.35)' } : { background: 'transparent', color: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.08)' }}>
            {i < subStep ? '✓ ' : ''}{label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 py-4 pb-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div key={subStep} custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
            {subStep === 0 && <CharacterStep selected={localChar} onSelect={setLocalChar} />}
            {subStep === 1 && <ElementStep selected={localElement} onSelect={setLocalElement} />}
            {subStep === 2 && <AffiliationStep selected={localAffiliation} onSelect={setLocalAffiliation} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="relative z-10 px-4 sm:px-6 py-5" style={{ borderTop: '1px solid rgba(78,255,196,0.15)', background: '#12122A' }}>
        <motion.button onClick={handleContinue} disabled={!canContinue} className="w-full max-w-lg mx-auto block font-display font-extrabold text-xl rounded-[14px] py-5 px-8 relative overflow-hidden select-none"
          style={{ background: canContinue ? 'linear-gradient(135deg, #4EFFC4 0%, #B565FF 100%)' : 'rgba(255,255,255,0.07)', border: '3px solid rgba(255,255,255,0.25)', boxShadow: canContinue ? '0 0 28px rgba(78,255,196,0.45), 6px 6px 0px rgba(0,0,0,0.4)' : 'none', color: canContinue ? '#12122A' : 'rgba(255,255,255,0.2)', cursor: canContinue ? 'pointer' : 'not-allowed' }}
          whileHover={canContinue ? { scale: 1.03, boxShadow: '0 0 42px rgba(78,255,196,0.65), 6px 6px 0px rgba(0,0,0,0.4)' } as any : {}} whileTap={canContinue ? { scale: 0.97 } : {}} transition={{ type: 'spring', stiffness: 400, damping: 17 }}>
          {canContinue && <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />}
          {subStep < 2 ? 'Continue →' : 'Complete Avatar →'}
        </motion.button>
      </div>

      {/* Neon bottom bar */}
      <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #FF6BA8, #FFE66D, #4EFFC4, #B565FF, #FF6BA8)', boxShadow: '0 0 14px rgba(78,255,196,0.7)' }} />
    </div>
  );
}
