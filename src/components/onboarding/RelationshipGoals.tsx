import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useOnboardingStore } from '../../store/onboardingStore';

type GoalOption = {
  id: string;
  label: string;
  description: string;
  emoji: string;
  gradient: string;
  glow: string;
  border: string;
};

const goals: GoalOption[] = [
  {
    id: 'casual',
    label: 'Something casual',
    description: 'Fun without strings',
    emoji: '🍃',
    gradient: 'linear-gradient(135deg, #FF3D71, #FF6BA8)',
    glow: 'rgba(255, 61, 113, 0.4)',
    border: '#FF3D71',
  },
  {
    id: 'short-term',
    label: 'Short-term fun',
    description: "See where it goes",
    emoji: '✨',
    gradient: 'linear-gradient(135deg, #FF9F1C, #FFE66D)',
    glow: 'rgba(255, 159, 28, 0.4)',
    border: '#FF9F1C',
  },
  {
    id: 'long-term',
    label: 'Long-term relationship',
    description: 'Looking for my person',
    emoji: '💚',
    gradient: 'linear-gradient(135deg, #4EFFC4, #00D9FF)',
    glow: 'rgba(78, 255, 196, 0.4)',
    border: '#4EFFC4',
  },
  {
    id: 'not-sure',
    label: 'Not sure yet',
    description: 'Figuring it out',
    emoji: '🌊',
    gradient: 'linear-gradient(135deg, #B565FF, #FF6BA8)',
    glow: 'rgba(181, 101, 255, 0.4)',
    border: '#B565FF',
  },
  {
    id: 'open',
    label: 'Open to see what happens',
    description: 'No expectations',
    emoji: '🌟',
    gradient: 'linear-gradient(135deg, #FFE66D, #4EFFC4)',
    glow: 'rgba(255, 230, 109, 0.4)',
    border: '#FFE66D',
  },
];

export function RelationshipGoals() {
  const navigate = useNavigate();
  const { lookingFor, updateRelationship, completeStep } = useOnboardingStore();

  const handleSelect = (id: string) => {
    updateRelationship(id);
  };

  const handleContinue = () => {
    if (lookingFor.length > 0) completeStep(5);
    navigate('/onboarding/lifestyle');
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
        <motion.button onClick={() => navigate('/onboarding/games')} className="flex items-center gap-1.5 font-body font-medium text-sm flex-shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }} whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}>
          <ArrowLeft size={18} /><span>Back</span>
        </motion.button>
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <span className="font-body text-xs font-bold tracking-widest uppercase" style={{ color: '#4EFFC4' }}>Goals</span>
          <div className="flex gap-1">
            {[0,1,2,3,4,5,6,7].map((i) => (
              <div key={i} className="h-1.5 rounded-full" style={{ width: i === 5 ? 24 : 8, background: i < 5 ? '#FF6BA8' : i === 5 ? 'linear-gradient(90deg, #4EFFC4, #FF6BA8)' : 'rgba(255,255,255,0.15)' }} />
            ))}
          </div>
        </div>
        <motion.button onClick={handleContinue} className="font-body font-medium text-sm flex-shrink-0" style={{ color: 'rgba(255,255,255,0.45)' }} whileHover={{ color: 'rgba(255,255,255,0.8)' } as any} whileTap={{ scale: 0.95 }}>
          Skip →
        </motion.button>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <motion.div className="text-center mb-8" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl mb-2" style={{ background: 'linear-gradient(135deg, #FF6BA8, #FF3D71)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              WHAT ARE YOU<br />LOOKING FOR?
            </h2>
            <p className="font-body text-base" style={{ color: 'rgba(255,255,255,0.6)' }}>Be honest — no judgment</p>
          </motion.div>

          {/* Goal cards */}
          <div className="space-y-3">
            {goals.map((goal, index) => {
              const isSelected = lookingFor.includes(goal.id);
              return (
                <motion.button key={goal.id} onClick={() => handleSelect(goal.id)} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl cursor-pointer relative overflow-hidden text-left"
                  style={{ background: isSelected ? goal.gradient : 'rgba(255,255,255,0.07)', border: isSelected ? `2px solid ${goal.border}` : '2px solid rgba(255,255,255,0.12)', boxShadow: isSelected ? `0 0 0 1px ${goal.border}, 0 0 24px ${goal.glow}, 5px 5px 0px 0px ${goal.border}` : 'none', minHeight: 68 }}
                  initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0, scale: isSelected ? 1.02 : 1 }}
                  transition={{ delay: index * 0.06, scale: { type: 'spring', stiffness: 400, damping: 17 } }}
                  whileHover={{ scale: isSelected ? 1.02 : 1.015 }} whileTap={{ scale: 0.98 }} aria-pressed={isSelected}>
                  {isSelected && <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />}
                  <span className="text-3xl flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl"
                    style={{ background: isSelected ? 'rgba(255,255,255,0.2)' : `${goal.border}18`, border: isSelected ? '2px solid rgba(255,255,255,0.3)' : `2px solid ${goal.border}30` }}>
                    {goal.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="block font-display font-bold text-lg leading-tight" style={{ color: isSelected ? '#12122A' : 'white' }}>{goal.label}</span>
                    <span className="block font-body text-sm" style={{ color: isSelected ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.5)' }}>{goal.description}</span>
                  </div>
                  {isSelected && (
                    <motion.div className="flex-shrink-0 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}>
                      <Check size={18} className="text-white" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
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
