import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useOnboardingStore } from '../../store/onboardingStore';

type GoalOption = {
  id: 'casual' | 'short-term' | 'long-term' | 'not-sure' | 'open';
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

  const handleSelect = (id: GoalOption['id']) => {
    updateRelationship(id);
  };

  const handleContinue = () => {
    if (!lookingFor) return;
    completeStep(5);
    navigate('/onboarding/lifestyle');
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #FFF8F0 0%, #FFF5F0 60%, #F0F5FF 100%)' }}
    >
      {/* Top bar */}
      <div className="flex items-center px-4 sm:px-6 py-4 gap-4">
        <motion.button
          onClick={() => navigate('/onboarding/games')}
          className="flex items-center gap-1.5 text-charcoal/60 font-body font-medium hover:text-charcoal transition-colors flex-shrink-0"
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Back</span>
        </motion.button>

        <div className="flex-1 text-center">
          <span className="font-display font-bold text-sm text-charcoal/50 tracking-widest uppercase">
            Goals
          </span>
          <div className="flex gap-1 mt-1.5 justify-center">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="h-1.5 rounded-full"
                style={{
                  width: i === 5 ? 24 : 8,
                  background: i <= 5
                    ? 'linear-gradient(90deg, #FF6BA8, #B565FF)'
                    : '#e5e7eb',
                }}
              />
            ))}
          </div>
        </div>
        <div className="w-16" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2
              className="font-display font-extrabold text-3xl sm:text-4xl mb-2"
              style={{
                background: 'linear-gradient(135deg, #FF6BA8, #FF3D71)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              WHAT ARE YOU
              <br />
              LOOKING FOR?
            </h2>
            <p className="font-body text-base text-charcoal/60">
              Be honest — no judgment
            </p>
          </motion.div>

          {/* Goal cards */}
          <div className="space-y-3">
            {goals.map((goal, index) => {
              const isSelected = lookingFor === goal.id;
              return (
                <motion.button
                  key={goal.id}
                  onClick={() => handleSelect(goal.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl cursor-pointer relative overflow-hidden text-left"
                  style={{
                    background: isSelected ? goal.gradient : 'white',
                    border: isSelected ? '3px solid #000' : '3px solid #000',
                    boxShadow: isSelected
                      ? `0 0 0 2px ${goal.border}, 0 0 24px ${goal.glow}, 6px 6px 0px 0px ${goal.border}`
                      : '4px 4px 0px 0px rgba(0,0,0,0.12)',
                    minHeight: 68,
                  }}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    scale: isSelected ? 1.02 : 1,
                  }}
                  transition={{
                    delay: index * 0.06,
                    scale: { type: 'spring', stiffness: 400, damping: 17 },
                  }}
                  whileHover={{ scale: isSelected ? 1.02 : 1.015 }}
                  whileTap={{ scale: 0.98 }}
                  aria-pressed={isSelected}
                >
                  {/* Glossy overlay */}
                  {isSelected && (
                    <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
                  )}

                  {/* Emoji icon */}
                  <span
                    className="text-3xl flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl"
                    style={{
                      background: isSelected ? 'rgba(255,255,255,0.2)' : `${goal.border}20`,
                      border: isSelected ? '2px solid rgba(255,255,255,0.3)' : `2px solid ${goal.border}30`,
                    }}
                  >
                    {goal.emoji}
                  </span>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <span
                      className="block font-display font-bold text-lg leading-tight"
                      style={{ color: isSelected ? 'white' : '#2D3142' }}
                    >
                      {goal.label}
                    </span>
                    <span
                      className="block font-body text-sm"
                      style={{ color: isSelected ? 'rgba(255,255,255,0.75)' : 'rgba(45,49,66,0.5)' }}
                    >
                      {goal.description}
                    </span>
                  </div>

                  {/* Checkmark */}
                  {isSelected && (
                    <motion.div
                      className="flex-shrink-0 w-8 h-8 rounded-full bg-black flex items-center justify-center"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    >
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
      <div className="px-4 sm:px-6 py-6 border-t border-black/5 bg-cream/80 backdrop-blur-sm">
        <motion.button
          onClick={handleContinue}
          disabled={!lookingFor}
          className="w-full max-w-lg mx-auto block font-display font-extrabold text-xl text-white rounded-2xl py-4 px-8 relative overflow-hidden"
          style={{
            background: lookingFor
              ? 'linear-gradient(135deg, #FF6BA8 0%, #FF3D71 100%)'
              : '#d1d5db',
            border: '4px solid black',
            boxShadow: lookingFor ? '8px 8px 0px 0px #FFE66D' : 'none',
            cursor: lookingFor ? 'pointer' : 'not-allowed',
            textShadow: lookingFor ? '1px 1px 0 rgba(0,0,0,0.2)' : 'none',
          }}
          whileHover={lookingFor ? { scale: 1.02, boxShadow: '10px 10px 0px 0px #FFE66D' } : {}}
          whileTap={lookingFor ? { scale: 0.97 } : {}}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          {lookingFor && (
            <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
          )}
          Continue →
        </motion.button>
      </div>
    </div>
  );
}
