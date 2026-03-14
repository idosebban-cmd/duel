import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from '../ui/Icons';
import { useOnboardingStore } from '../../store/onboardingStore';
import { ENABLE_JUST_PLAY } from '../../lib/featureFlags';

type GoalOption = {
  id: string;
  label: string;
  description: string;
  icon: string;
  gradient: string;
  glow: string;
  border: string;
};

const goals: GoalOption[] = [
  {
    id: 'casual',
    label: 'Something casual',
    description: 'Fun without strings',
    icon: '/looking-for/Casual.png',
    gradient: 'linear-gradient(135deg, #FF3D71, #FF6BA8)',
    glow: 'rgba(255, 61, 113, 0.4)',
    border: '#FF3D71',
  },
  {
    id: 'short-term',
    label: 'Short-term fun',
    description: "See where it goes",
    icon: '/looking-for/Short-term.png',
    gradient: 'linear-gradient(135deg, #FF9F1C, #FFE66D)',
    glow: 'rgba(255, 159, 28, 0.4)',
    border: '#FF9F1C',
  },
  {
    id: 'long-term',
    label: 'Long-term relationship',
    description: 'Looking for my person',
    icon: '/looking-for/long-term.png',
    gradient: 'linear-gradient(135deg, #4EFFC4, #00D9FF)',
    glow: 'rgba(78, 255, 196, 0.4)',
    border: '#4EFFC4',
  },
  {
    id: 'not-sure',
    label: 'Not sure yet',
    description: 'Figuring it out',
    icon: '/looking-for/Not-sure.png',
    gradient: 'linear-gradient(135deg, #B565FF, #FF6BA8)',
    glow: 'rgba(181, 101, 255, 0.4)',
    border: '#B565FF',
  },
  {
    id: 'open',
    label: 'Open to see what happens',
    description: 'No expectations',
    icon: '/looking-for/Open.png',
    gradient: 'linear-gradient(135deg, #FFE66D, #4EFFC4)',
    glow: 'rgba(255, 230, 109, 0.4)',
    border: '#FFE66D',
  },
];

// ─── Intent options (Just Play feature) ──────────────────────────────────────

type IntentOption = {
  value: 'romance' | 'play' | 'both';
  emoji: string;
  label: string;
  description: string;
  gradient: string;
  glow: string;
  border: string;
};

const intentOptions: IntentOption[] = [
  {
    value: 'romance',
    emoji: '\u2764\uFE0F',
    label: 'Here for Romance',
    description: 'Find your match the classic way',
    gradient: 'linear-gradient(135deg, #ff4e6a, #ff8fa3)',
    glow: 'rgba(255, 78, 106, 0.4)',
    border: '#ff4e6a',
  },
  {
    value: 'play',
    emoji: '\uD83C\uDFAE',
    label: 'Just Want to Play',
    description: 'Skip the romance, find gaming partners',
    gradient: 'linear-gradient(135deg, #00d4ff, #0066ff)',
    glow: 'rgba(0, 212, 255, 0.4)',
    border: '#00d4ff',
  },
  {
    value: 'both',
    emoji: '\u2728',
    label: 'Open to Both',
    description: 'Romance, games, or whatever happens',
    gradient: 'linear-gradient(135deg, #ffd700, #9b59b6)',
    glow: 'rgba(255, 215, 0, 0.4)',
    border: '#ffd700',
  },
];

export function RelationshipGoals() {
  const navigate = useNavigate();
  const { lookingFor, updateRelationship, intent, setIntent, completeStep } = useOnboardingStore();
  const [showTooltip, setShowTooltip] = useState(false);

  const handleSelect = (id: string) => {
    updateRelationship(id);
  };

  const handleContinue = () => {
    if (lookingFor.length > 0 || (ENABLE_JUST_PLAY && intent === 'play')) completeStep(5);
    navigate('/onboarding/lifestyle');
  };

  const showGoals = !ENABLE_JUST_PLAY || intent !== 'play';

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
            {[0,1,2,3,4,5,6,7,8].map((i) => (
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

          {/* ── Intent picker (Just Play feature) ───────────────────────────── */}
          {ENABLE_JUST_PLAY && (
            <motion.div className="mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="space-y-3">
                {intentOptions.map((opt, index) => {
                  const isSelected = intent === opt.value;
                  return (
                    <motion.button
                      key={opt.value}
                      onClick={() => setIntent(opt.value)}
                      className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl cursor-pointer relative overflow-hidden text-left"
                      style={{
                        background: isSelected ? opt.gradient : 'rgba(255,255,255,0.07)',
                        border: isSelected ? `2px solid ${opt.border}` : '2px solid rgba(255,255,255,0.12)',
                        boxShadow: isSelected ? `0 0 0 1px ${opt.border}, 0 0 24px ${opt.glow}, 5px 5px 0px 0px ${opt.border}` : 'none',
                        minHeight: 68,
                      }}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0, scale: isSelected ? 1.02 : 1 }}
                      transition={{ delay: index * 0.06, scale: { type: 'spring', stiffness: 400, damping: 17 } }}
                      whileHover={{ scale: isSelected ? 1.02 : 1.015 }}
                      whileTap={{ scale: 0.98 }}
                      aria-pressed={isSelected}
                    >
                      {isSelected && <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />}
                      <span
                        className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl text-2xl"
                        style={{
                          background: isSelected ? 'rgba(255,255,255,0.2)' : `${opt.border}18`,
                          border: isSelected ? '2px solid rgba(255,255,255,0.3)' : `2px solid ${opt.border}30`,
                        }}
                      >
                        {opt.emoji}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="block font-display font-bold text-lg leading-tight" style={{ color: isSelected ? '#12122A' : 'white' }}>
                          {opt.label}
                        </span>
                        <span className="block font-body text-sm" style={{ color: isSelected ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.5)' }}>
                          {opt.description}
                        </span>
                      </div>
                      {isSelected && (
                        <motion.div
                          className="flex-shrink-0 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center"
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

              {/* "How does Just Play work?" tooltip trigger */}
              <div className="relative mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowTooltip((v) => !v)}
                  className="font-body text-xs font-medium tracking-wide flex items-center gap-1.5 transition-colors"
                  style={{ color: 'rgba(0,212,255,0.7)' }}
                >
                  <span
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
                    style={{ border: '1.5px solid rgba(0,212,255,0.5)', color: 'rgba(0,212,255,0.8)' }}
                  >
                    ?
                  </span>
                  How does "Just Play" work?
                </button>

                <AnimatePresence>
                  {showTooltip && (
                    <motion.div
                      className="absolute top-8 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm rounded-xl px-5 py-4 z-20"
                      style={{
                        background: 'rgba(10, 22, 40, 0.97)',
                        border: '1.5px solid rgba(0, 212, 255, 0.35)',
                        boxShadow: '0 0 24px rgba(0,212,255,0.15)',
                      }}
                      initial={{ opacity: 0, y: -6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      {/* Arrow */}
                      <div
                        className="absolute -top-[7px] left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
                        style={{ background: 'rgba(10, 22, 40, 0.97)', border: '1.5px solid rgba(0,212,255,0.35)', borderRight: 'none', borderBottom: 'none' }}
                      />
                      <p className="font-body text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        <strong style={{ color: '#00d4ff' }}>Just Play</strong> matches you with anyone else who picked "Just Play" or "Open to Both" — with <strong style={{ color: '#00d4ff' }}>no filters</strong> on age, gender, or distance. It's all about finding people to game with, nothing else.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowTooltip(false)}
                        className="mt-2 font-body text-xs font-medium"
                        style={{ color: 'rgba(0,212,255,0.6)' }}
                      >
                        Got it
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ── Relationship goals (hidden for play-only intent) ────────── */}
          {showGoals && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              {ENABLE_JUST_PLAY && (
                <div className="mb-4">
                  <p className="font-body text-sm font-medium text-center" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    What kind of relationship are you looking for?
                  </p>
                </div>
              )}
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
                      <span className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl"
                        style={{ background: isSelected ? 'rgba(255,255,255,0.2)' : `${goal.border}18`, border: isSelected ? '2px solid rgba(255,255,255,0.3)' : `2px solid ${goal.border}30` }}>
                        <img src={goal.icon} alt="" className="w-8 h-8 object-contain" style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.3))' }} />
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
            </motion.div>
          )}
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
