import { useState } from 'react';
import { motion } from 'framer-motion';
import { submitFirstGameFeedback, setFirstGameFeedbackCompleted } from '../../lib/database';

interface FirstGameFeedbackModalProps {
  userId: string;
  onClose: () => void;
}

export function FirstGameFeedbackModal({ userId, onClose }: FirstGameFeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSkip = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await setFirstGameFeedbackCompleted(userId);
      if (e) {
        setError('Could not save. Try again.');
        return;
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () => {
    if (rating < 1 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: insertError } = await submitFirstGameFeedback(userId, rating, comment.trim() || null);
      if (insertError) {
        setError('Could not send. Try again.');
        return;
      }
      const { error: profileError } = await setFirstGameFeedbackCompleted(userId);
      if (profileError) {
        setError('Saved feedback but could not update profile.');
        return;
      }
      setThanks(true);
      window.setTimeout(() => {
        onClose();
      }, 1800);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      aria-modal="true"
      role="dialog"
      aria-labelledby="first-game-feedback-title"
    >
      <motion.div
        className="w-full max-w-sm rounded-3xl p-6"
        style={{
          background: '#0A1628',
          border: '2px solid rgba(255,255,255,0.12)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.45)',
        }}
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      >
        {thanks ? (
          <p className="font-body text-center text-ui-title text-white">Thanks! 🎮</p>
        ) : (
          <>
            <h2
              id="first-game-feedback-title"
              className="font-display font-extrabold text-xl text-white text-center"
            >
              How was your first game?
            </h2>
            <p className="font-body text-ui-body text-center mt-1 mb-5" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Help us make Duel better
            </p>

            <div className="flex justify-center gap-1 sm:gap-2 mb-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i)}
                  className="p-1 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4EFFC4]"
                  aria-label={`${i} star${i === 1 ? '' : 's'}`}
                >
                  <img
                    src="/icons/Star.png"
                    alt=""
                    width={40}
                    height={40}
                    className="w-9 h-9 sm:w-10 sm:h-10 object-contain pointer-events-none"
                    draggable={false}
                    style={{
                      opacity: i <= rating ? 1 : 0.3,
                      filter: i <= rating ? 'drop-shadow(0 0 10px #4EFFC4)' : undefined,
                    }}
                  />
                </button>
              ))}
            </div>

            <label htmlFor="first-game-feedback-comment" className="sr-only">
              Optional feedback
            </label>
            <textarea
              id="first-game-feedback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              maxLength={500}
              rows={3}
              placeholder="Anything to tell us?"
              className="w-full rounded-2xl px-4 py-3 font-body text-ui-body text-white placeholder:text-white/35 resize-none focus:outline-none focus:ring-2 focus:ring-[#4EFFC4]/50 mb-4"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            />

            {error ? (
              <p className="font-body text-ui-caption text-center mb-3" style={{ color: '#FF6BA8' }}>
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSkip()}
                className={`w-full py-3 rounded-2xl font-body text-ui-body-strong ${busy ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                style={{
                  background: 'transparent',
                  border: '2px solid rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.75)',
                }}
              >
                Skip
              </button>
              <button
                type="button"
                disabled={busy || rating < 1}
                onClick={() => void handleSend()}
                className={`w-full py-3.5 rounded-2xl font-display font-extrabold text-base text-white ${busy || rating < 1 ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                style={{
                  background: 'linear-gradient(135deg, #FF6BA8, #FF3D71)',
                  border: '3px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 4px 0 rgba(0,0,0,0.25)',
                }}
              >
                {busy ? 'Sending…' : 'Send'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
