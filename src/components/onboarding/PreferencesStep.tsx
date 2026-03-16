import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from '../ui/Icons';
import { useOnboardingStore } from '../../store/onboardingStore';

// ─── Dual-handle range slider (inline) ──────────────────────────────────────

function DualRangeSlider({ min, max, valueMin, valueMax, onChange }: {
  min: number; max: number; valueMin: number; valueMax: number;
  onChange: (min: number, max: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<'min' | 'max' | null>(null);
  const valuesRef = useRef({ valueMin, valueMax });
  valuesRef.current = { valueMin, valueMax };
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current || !trackRef.current) return;
      e.preventDefault();
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const val = Math.round(min + pct * (max - min));
      const { valueMin: vMin, valueMax: vMax } = valuesRef.current;
      if (draggingRef.current === 'min') onChangeRef.current(Math.min(val, vMax - 1), vMax);
      else onChangeRef.current(vMin, Math.max(val, vMin + 1));
    };
    const onUp = () => { draggingRef.current = null; };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [min, max]);

  const toPercent = (v: number) => ((v - min) / (max - min)) * 100;
  const minPct = toPercent(valueMin);
  const maxPct = toPercent(valueMax);
  const handleStyle = (pct: number, gradient: string): React.CSSProperties => ({
    position: 'absolute', top: '50%', left: `${pct}%`,
    width: 24, height: 24, transform: 'translate(-50%, -50%)',
    background: gradient, borderRadius: '50%', border: '3px solid #0A1628',
    boxShadow: `0 0 14px ${gradient.includes('4EFFC4') ? 'rgba(78,255,196,0.7)' : 'rgba(181,101,255,0.7)'}`,
    cursor: 'grab', touchAction: 'none', zIndex: 2,
  });

  return (
    <div ref={trackRef} style={{ position: 'relative', height: 36, userSelect: 'none' }}>
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 6, transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3 }} />
      <div style={{ position: 'absolute', top: '50%', left: `${minPct}%`, width: `${maxPct - minPct}%`, height: 6, transform: 'translateY(-50%)', background: 'linear-gradient(90deg, #4EFFC4, #B565FF)', borderRadius: 3, boxShadow: '0 0 10px rgba(78,255,196,0.35)' }} />
      <div style={handleStyle(minPct, 'linear-gradient(135deg, #4EFFC4, #B565FF)')} onPointerDown={(e) => { e.preventDefault(); draggingRef.current = 'min'; }} />
      <div style={handleStyle(maxPct, 'linear-gradient(135deg, #B565FF, #FF6BA8)')} onPointerDown={(e) => { e.preventDefault(); draggingRef.current = 'max'; }} />
    </div>
  );
}

// ─── Single-handle range slider (inline) ────────────────────────────────────

function SingleRangeSlider({ min, max, value, onChange }: {
  min: number; max: number; value: number; onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current || !trackRef.current) return;
      e.preventDefault();
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      onChangeRef.current(Math.round(min + pct * (max - min)));
    };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [min, max]);

  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div ref={trackRef} style={{ position: 'relative', height: 36, userSelect: 'none' }}>
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 6, transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3 }} />
      <div style={{ position: 'absolute', top: '50%', left: 0, width: `${pct}%`, height: 6, transform: 'translateY(-50%)', background: 'linear-gradient(90deg, #4EFFC4, #B565FF)', borderRadius: 3, boxShadow: '0 0 10px rgba(78,255,196,0.35)' }} />
      <div
        style={{ position: 'absolute', top: '50%', left: `${pct}%`, width: 24, height: 24, transform: 'translate(-50%, -50%)', background: 'linear-gradient(135deg, #4EFFC4, #B565FF)', borderRadius: '50%', border: '3px solid #0A1628', boxShadow: '0 0 14px rgba(78,255,196,0.7)', cursor: 'grab', touchAction: 'none' }}
        onPointerDown={(e) => { e.preventDefault(); draggingRef.current = true; }}
      />
    </div>
  );
}

// ─── Gender preference options ──────────────────────────────────────────────

type ShowMe = 'men' | 'women' | 'everyone';

const showMeOptions: { id: ShowMe; label: string; border: string }[] = [
  { id: 'men', label: 'Men', border: '#00D9FF' },
  { id: 'women', label: 'Women', border: '#FF6BA8' },
  { id: 'everyone', label: 'Everyone', border: '#B565FF' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function PreferencesStep() {
  const navigate = useNavigate();
  const {
    interestedIn, preferredAgeMin, preferredAgeMax, preferredDistance,
    updatePreferences, completeStep,
  } = useOnboardingStore();

  const [showMe, setShowMe] = useState<ShowMe>(interestedIn ?? 'everyone');
  const [ageMin, setAgeMin] = useState(preferredAgeMin);
  const [ageMax, setAgeMax] = useState(preferredAgeMax);
  const [distance, setDistance] = useState(preferredDistance ?? 50);
  const [anywhere, setAnywhere] = useState(preferredDistance === null);

  const handleContinue = useCallback(() => {
    // Update interestedIn in Basics (single source of truth)
    useOnboardingStore.getState().updateBasics({
      name: useOnboardingStore.getState().name,
      birthday: useOnboardingStore.getState().birthday ?? '',
      age: useOnboardingStore.getState().age ?? 0,
      gender: useOnboardingStore.getState().gender ?? 'man',
      interestedIn: showMe,
      location: useOnboardingStore.getState().location,
    });
    updatePreferences({
      preferredAgeMin: ageMin,
      preferredAgeMax: ageMax,
      preferredDistance: anywhere ? null : distance,
    });
    completeStep(6);
    navigate('/onboarding/lifestyle');
  }, [showMe, ageMin, ageMax, distance, anywhere, updatePreferences, completeStep, navigate]);

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
        <motion.button onClick={() => navigate('/onboarding/relationship-goals')} className="flex items-center gap-1.5 font-body font-medium text-sm flex-shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }} whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}>
          <ArrowLeft size={18} /><span>Back</span>
        </motion.button>
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <span className="font-body text-xs font-bold tracking-widest uppercase" style={{ color: '#4EFFC4' }}>Preferences</span>
          <div className="flex gap-1">
            {[0,1,2,3,4,5,6,7,8,9].map((i) => (
              <div key={i} className="h-1.5 rounded-full" style={{ width: i === 6 ? 24 : 8, background: i < 6 ? '#FF6BA8' : i === 6 ? 'linear-gradient(90deg, #4EFFC4, #FF6BA8)' : 'rgba(255,255,255,0.15)' }} />
            ))}
          </div>
        </div>
        <motion.button onClick={handleContinue} className="font-body font-medium text-sm flex-shrink-0" style={{ color: 'rgba(255,255,255,0.45)' }} whileHover={{ color: 'rgba(255,255,255,0.8)' } as any} whileTap={{ scale: 0.95 }}>
          Skip →
        </motion.button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <motion.div className="text-center mb-8" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl mb-2" style={{ background: 'linear-gradient(135deg, #4EFFC4, #00D9FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              YOUR PREFERENCES
            </h2>
            <p className="font-body text-base" style={{ color: 'rgba(255,255,255,0.6)' }}>Who do you want to see?</p>
          </motion.div>

          <div className="space-y-8">
            {/* Show me */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <label className="block font-display font-bold text-sm tracking-wider mb-3" style={{ color: '#FF6BA8' }}>SHOW ME</label>
              <div className="flex gap-3">
                {showMeOptions.map((opt) => {
                  const isSelected = showMe === opt.id;
                  return (
                    <motion.button key={opt.id} type="button" onClick={() => setShowMe(opt.id)} className="flex-1 py-3.5 rounded-pill font-display font-bold text-sm"
                      style={{ background: isSelected ? `linear-gradient(135deg, ${opt.border}90, ${opt.border})` : 'rgba(255,255,255,0.07)', border: `2px solid ${isSelected ? opt.border : 'rgba(255,255,255,0.14)'}`, color: isSelected ? '#12122A' : 'rgba(255,255,255,0.7)', boxShadow: isSelected ? `0 0 0 2px ${opt.border}, 0 0 18px ${opt.border}60, 4px 4px 0px 0px ${opt.border}` : 'none' }}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 17 }} aria-pressed={isSelected}>
                      {opt.label}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* Age range */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center justify-between mb-3">
                <label className="font-display font-bold text-sm tracking-wider" style={{ color: '#4EFFC4' }}>AGE RANGE</label>
                <span className="font-mono text-sm font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>{ageMin} – {ageMax}</span>
              </div>
              <DualRangeSlider min={18} max={65} valueMin={ageMin} valueMax={ageMax} onChange={(mn, mx) => { setAgeMin(mn); setAgeMax(mx); }} />
            </motion.div>

            {/* Distance */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="flex items-center justify-between mb-3">
                <label className="font-display font-bold text-sm tracking-wider" style={{ color: '#B565FF' }}>DISTANCE</label>
                <span className="font-mono text-sm font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {anywhere ? 'Anywhere' : `Within ${distance} km`}
                </span>
              </div>
              {!anywhere && (
                <SingleRangeSlider min={1} max={100} value={distance} onChange={setDistance} />
              )}
              <label className="flex items-center gap-3 mt-3 cursor-pointer select-none">
                <div
                  onClick={() => setAnywhere(!anywhere)}
                  style={{
                    width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                    border: `2px solid ${anywhere ? '#4EFFC4' : 'rgba(255,255,255,0.22)'}`,
                    background: anywhere ? 'rgba(78,255,196,0.14)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: anywhere ? '0 0 10px rgba(78,255,196,0.4)' : 'none',
                    transition: 'all 0.18s',
                  }}
                >
                  {anywhere && <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4.5L4 7.5L10 1.5" stroke="#4EFFC4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
                <span className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Show me people anywhere</span>
              </label>
            </motion.div>
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
