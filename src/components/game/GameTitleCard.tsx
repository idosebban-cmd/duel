import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GameTitleCardProps {
  gameName: string;
  opponentName?: string | null;
  durationMs?: number;
  waitFor?: boolean;
  onComplete?: () => void;
}

export function GameTitleCard({
  gameName,
  opponentName,
  durationMs = 3000,
  waitFor = false,
  onComplete,
}: GameTitleCardProps) {
  const [visible, setVisible] = useState(true);
  const [progressMs, setProgressMs] = useState(0);

  const totalMs = Math.max(1, durationMs);
  const resolvedOpponent = useMemo(
    () => (opponentName && opponentName.trim() ? opponentName : 'Opponent'),
    [opponentName],
  );

  useEffect(() => {
    if (!visible || waitFor) return;
    const tickMs = 50;
    const timer = setInterval(() => {
      setProgressMs((prev) => {
        const next = Math.min(totalMs, prev + tickMs);
        if (next >= totalMs) {
          clearInterval(timer);
          setVisible(false);
          onComplete?.();
        }
        return next;
      });
    }, tickMs);

    return () => clearInterval(timer);
  }, [onComplete, totalMs, visible, waitFor]);

  const progressRatio = Math.min(1, progressMs / totalMs);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center px-6"
          style={{ background: 'rgba(10,12,24,0.84)', backdropFilter: 'blur(6px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <motion.div
            className="w-full max-w-md rounded-3xl px-6 py-7 text-center"
            style={{
              background: 'linear-gradient(170deg, rgba(30,16,64,0.96), rgba(15,23,42,0.96))',
              border: '2px solid rgba(78,255,196,0.35)',
              boxShadow: '0 0 40px rgba(78,255,196,0.18)',
            }}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          >
            <p className="font-body text-xs uppercase tracking-[0.2em] text-white/40 mb-2">
              Match Starting
            </p>
            <h2
              className="font-display font-extrabold text-4xl mb-2"
              style={{
                background: 'linear-gradient(135deg, #4EFFC4, #00D9FF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {gameName}
            </h2>
            <p className="font-display font-bold text-lg text-white/85">
              vs {resolvedOpponent}
            </p>

            <div className="mt-6 flex items-center justify-center gap-2">
              {[0, 1, 2].map((idx) => (
                <motion.div
                  key={idx}
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: 'rgba(78,255,196,0.7)' }}
                  animate={{ opacity: [0.35, 1, 0.35], scale: [0.85, 1.15, 0.85] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: idx * 0.18 }}
                />
              ))}
            </div>

            <div
              className="mt-5 h-1.5 w-full rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.12)' }}
            >
              <motion.div
                className="h-full"
                style={{
                  background: 'linear-gradient(90deg, #4EFFC4, #00D9FF)',
                  width: `${progressRatio * 100}%`,
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
