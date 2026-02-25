import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CountdownScreenProps {
  onComplete: () => void;
}

export function CountdownScreen({ onComplete }: CountdownScreenProps) {
  const [count, setCount] = useState(3);
  const [showGo, setShowGo] = useState(false);

  useEffect(() => {
    if (count > 1) {
      const t = setTimeout(() => setCount((c) => c - 1), 1000);
      return () => clearTimeout(t);
    } else if (count === 1) {
      const t = setTimeout(() => {
        setCount(0);
        setShowGo(true);
      }, 1000);
      return () => clearTimeout(t);
    } else if (showGo) {
      const t = setTimeout(() => onComplete(), 900);
      return () => clearTimeout(t);
    }
  }, [count, showGo, onComplete]);

  const display = showGo ? 'GO!' : count > 0 ? String(count) : '';
  const colors = ['#FF3D71', '#FF9F1C', '#FFE66D', '#4EFFC4'];
  const color = showGo ? '#4EFFC4' : colors[3 - count] ?? '#FF6BA8';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      {/* Halftone dots */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={display}
          className="text-center select-none"
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 2, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <div
            className="font-display font-extrabold"
            style={{
              fontSize: showGo ? '5rem' : '8rem',
              color,
              textShadow: `0 0 40px ${color}, 0 0 80px ${color}88`,
              WebkitTextStroke: '4px black',
              lineHeight: 1,
            }}
          >
            {display}
          </div>

          {showGo && (
            <motion.p
              className="font-body text-white/60 text-lg mt-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Game starting...
            </motion.p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
