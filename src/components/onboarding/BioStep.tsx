import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from '../ui/Icons';
import { useOnboardingStore, ONBOARDING_PROGRESS_DOTS } from '../../store/onboardingStore';

const MAX_LENGTH = 300;

export function BioStep() {
  const navigate = useNavigate();
  const { bio, updateBio, completeStep } = useOnboardingStore();
  const [value, setValue] = useState(bio);

  const hasContent = value.trim().length > 0;

  const handleContinue = () => {
    updateBio(value.trim());
    completeStep(9);
    navigate('/onboarding/prompts');
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
        <motion.button onClick={() => navigate('/onboarding/lifestyle')} className="flex items-center gap-1.5 font-body font-medium text-sm flex-shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }} whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}>
          <ArrowLeft size={18} /><span>Back</span>
        </motion.button>
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <span className="font-body text-xs font-bold tracking-widest uppercase" style={{ color: '#4EFFC4' }}>Bio</span>
          <div className="flex gap-1">
            {ONBOARDING_PROGRESS_DOTS.map((i) => (
              <div key={i} className="h-1.5 rounded-full" style={{ width: i === 8 ? 24 : 8, background: i < 8 ? '#FF6BA8' : i === 8 ? 'linear-gradient(90deg, #4EFFC4, #FF6BA8)' : 'rgba(255,255,255,0.15)' }} />
            ))}
          </div>
        </div>
        <div className="w-[72px] flex-shrink-0" aria-hidden />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <motion.div className="text-center mb-8" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl mb-2" style={{ background: 'linear-gradient(135deg, #4EFFC4, #00D9FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              TELL THEM<br />ABOUT YOU
            </h2>
            <p className="font-body text-base" style={{ color: 'rgba(255,255,255,0.6)' }}>Optional — share what makes you you</p>
          </motion.div>

          {/* Textarea */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value.slice(0, MAX_LENGTH))}
              placeholder="I'm a competitive board game nerd who thinks trash talk is a love language..."
              rows={5}
              className="w-full rounded-2xl px-5 py-4 font-body text-base resize-none outline-none"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: `2px solid ${hasContent ? '#4EFFC4' : 'rgba(255,255,255,0.12)'}`,
                color: 'white',
                transition: 'border-color 0.2s',
              }}
            />
            <div className="flex justify-between mt-2 px-1">
              <span className="font-body text-xs" style={{ color: hasContent ? '#4EFFC4' : 'rgba(255,255,255,0.3)' }}>
                {hasContent ? 'Looks great!' : 'You can skip this'}
              </span>
              <span className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {value.length}/{MAX_LENGTH}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="relative z-10 px-4 sm:px-6 py-5" style={{ borderTop: '1px solid rgba(78,255,196,0.15)', background: '#12122A' }}>
        <motion.button onClick={handleContinue} className="w-full max-w-lg mx-auto block font-display font-extrabold text-xl rounded-[14px] py-5 px-8 relative overflow-hidden select-none"
          style={{ background: 'linear-gradient(135deg, #4EFFC4 0%, #B565FF 100%)', border: '3px solid rgba(255,255,255,0.25)', boxShadow: '0 0 28px rgba(78,255,196,0.45), 6px 6px 0px rgba(0,0,0,0.4)', color: '#12122A', cursor: 'pointer' }}
          whileHover={{ scale: 1.03, boxShadow: '0 0 42px rgba(78,255,196,0.65), 6px 6px 0px rgba(0,0,0,0.4)' } as any} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 17 }}>
          <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
          Continue →
        </motion.button>
      </div>

      {/* Neon bottom bar */}
      <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #FF6BA8, #FFE66D, #4EFFC4, #B565FF, #FF6BA8)', boxShadow: '0 0 14px rgba(78,255,196,0.7)' }} />
    </div>
  );
}
