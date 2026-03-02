import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDotDashStore } from '../../store/dotDashStore';

function ConfettiPiece({ color, delay }: { color: string; delay: number }) {
  const x   = Math.random() * 100;
  const dur  = 2.5 + Math.random() * 2;
  return (
    <motion.div
      className="absolute w-3 h-3 rounded-sm pointer-events-none"
      style={{ left: `${x}vw`, top: -16, background: color, zIndex: 10 }}
      initial={{ y: -20, rotate: 0, opacity: 1 }}
      animate={{ y: '110vh', rotate: 720, opacity: 0 }}
      transition={{ duration: dur, delay, ease: 'linear', repeat: Infinity, repeatDelay: Math.random() * 3 }}
    />
  );
}

const CONFETTI_COLORS = ['#FF6BA8','#4EFFC4','#FFE66D','#B565FF','#FF3D71','#FF9F1C'];

export function DotDashResult() {
  const navigate = useNavigate();
  const store    = useDotDashStore();
  const payload  = store.gameOverPayload;
  const myId     = store.myUserId;

  useEffect(() => {
    if (!payload) navigate('/dotdash');
  }, [payload, navigate]);

  if (!payload) return null;

  const { winner, forfeit, finalScores, gameState } = payload;
  const didWin = winner === myId;

  const me  = gameState.player1.userId === myId ? gameState.player1 : gameState.player2;
  const opp = gameState.player1.userId === myId ? gameState.player2 : gameState.player1;

  const totalDots = gameState.dots.length;
  const myDots    = Math.round(me.score  / 10);
  const oppDots   = Math.round(opp.score / 10);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start overflow-hidden relative"
      style={{ background: didWin
        ? 'linear-gradient(160deg, #0a2a1a 0%, #0a1a2e 60%, #1a0a2e 100%)'
        : 'linear-gradient(160deg, #1a0a10 0%, #0f122a 60%, #0a1628 100%)' }}
    >
      {/* Confetti */}
      {didWin && !forfeit && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {CONFETTI_COLORS.flatMap((c, ci) =>
            Array.from({ length: 4 }, (_, i) => (
              <ConfettiPiece key={`${ci}-${i}`} color={c} delay={ci * 0.25 + i * 0.6} />
            ))
          )}
        </div>
      )}

      {/* Halftone */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }} />

      <div className="relative w-full max-w-sm mx-auto px-4 py-8 flex flex-col items-center gap-6">

        {/* Result header */}
        <motion.div className="text-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        >
          {didWin ? (
            <>
              <div className="text-6xl mb-2">🏆</div>
              <h1 className="font-display font-extrabold text-5xl" style={{
                background: 'linear-gradient(135deg, #FFE66D, #4EFFC4)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                filter: 'drop-shadow(0 0 20px rgba(78,255,196,0.6))',
              }}>
                YOU WIN!
              </h1>
              <p className="font-body text-white/60 mt-2">
                {forfeit ? `${opp.name} forfeited!` : 'Nice moves, champ!'}
              </p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-2">💀</div>
              <h1 className="font-display font-extrabold text-4xl text-white/70">
                {opp.name} wins!
              </h1>
              <p className="font-body text-white/50 mt-2">
                {forfeit ? 'They disconnected — you win!' : 'Better luck next time!'}
              </p>
            </>
          )}
        </motion.div>

        {/* Score card */}
        <motion.div className="w-full rounded-2xl overflow-hidden"
          style={{ border: '4px solid black', boxShadow: '8px 8px 0 rgba(0,0,0,0.3)' }}
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        >
          {/* Header */}
          <div className="px-5 py-3 text-center"
            style={{ background: 'linear-gradient(135deg, #FF6BA8, #B565FF, #4EFFC4)' }}
          >
            <p className="font-display font-bold text-white text-sm uppercase tracking-widest">Final Scores</p>
          </div>

          {/* Players */}
          <div className="bg-white px-5 py-4 flex gap-4">
            {[
              { p: me,  label: 'YOU',  color: '#FF6BA8', isWinner: didWin },
              { p: opp, label: 'THEM', color: '#4EFFC4', isWinner: !didWin },
            ].map(({ p, label, color, isWinner }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-2 py-2 rounded-xl"
                style={{
                  background: isWinner ? `${color}22` : 'transparent',
                  border: isWinner ? `3px solid ${color}` : '3px solid transparent',
                }}
              >
                {p.avatar && (
                  <div className="w-12 h-12 rounded-xl overflow-hidden"
                    style={{ border: `3px solid ${color}` }}
                  >
                    <img src={p.avatar} alt={label} className="w-full h-full object-contain" />
                  </div>
                )}
                <p className="font-display font-bold text-charcoal text-sm">
                  {isWinner ? '🏆 ' : ''}{p.name}
                </p>
                <p className="font-mono font-bold text-3xl" style={{ color }}>
                  {p.score}
                </p>
                <p className="font-body text-xs text-charcoal/50">
                  {Math.round(p.score / 10)} dots
                </p>
                <div className="flex gap-0.5 mt-1">
                  {Array.from({ length: 3 }, (_, i) => (
                    <span key={i} style={{ fontSize: 16, opacity: i < p.lives ? 1 : 0.2 }}>❤️</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="px-5 py-3 flex justify-around" style={{ background: '#f8f4ff', borderTop: '2px solid #e0e0e0' }}>
            <div className="text-center">
              <p className="font-mono font-bold text-charcoal text-lg">{myDots + oppDots}</p>
              <p className="font-body text-charcoal/40 text-xs">Dots eaten</p>
            </div>
            <div className="text-center">
              <p className="font-mono font-bold text-charcoal text-lg">{totalDots}</p>
              <p className="font-body text-charcoal/40 text-xs">Dots left</p>
            </div>
            <div className="text-center">
              <p className="font-mono font-bold text-charcoal text-lg">
                {Math.abs(finalScores.player1 - finalScores.player2)}
              </p>
              <p className="font-body text-charcoal/40 text-xs">Point gap</p>
            </div>
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div className="w-full flex flex-col gap-3"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        >
          {/* Chat CTA (placeholder) */}
          <div className="relative">
            <button disabled className="w-full py-4 rounded-2xl font-display font-extrabold text-xl cursor-not-allowed"
              style={{ background: 'rgba(255,255,255,0.06)', border: '4px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.3)' }}
            >
              💬 Start Chatting
            </button>
            <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full font-display font-bold text-xs"
              style={{ background: '#FF9F1C', border: '2px solid black', color: '#12122A' }}
            >
              Coming soon
            </span>
          </div>

          <motion.button
            className="w-full py-3 rounded-2xl font-display font-bold text-base"
            style={{ background: 'rgba(255,255,255,0.06)', border: '3px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => { store.reset(); navigate('/dotdash'); }}
          >
            🔄 Play Again
          </motion.button>

          <motion.button
            className="font-body text-sm text-white/30 text-center hover:text-white/60 transition-colors"
            onClick={() => { store.reset(); navigate('/'); }}
          >
            Back to home
          </motion.button>
        </motion.div>
      </div>

      {/* Neon bar */}
      <div className="fixed bottom-0 left-0 right-0 h-[3px] pointer-events-none"
        style={{ background: 'linear-gradient(90deg,#FF6BA8,#FFE66D,#4EFFC4,#B565FF,#FF6BA8)', boxShadow: '0 0 14px rgba(78,255,196,0.7)' }}
      />
    </div>
  );
}
