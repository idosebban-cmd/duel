import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { CharacterCard } from '../../components/game/CharacterCard';
import type { Character } from '../../types/game';

// Simple confetti particle
function ConfettiParticle({ color, delay }: { color: string; delay: number }) {
  const x = Math.random() * 100;
  const dur = 2.5 + Math.random() * 2;
  return (
    <motion.div
      className="absolute w-3 h-3 rounded-sm pointer-events-none"
      style={{ left: `${x}vw`, top: -16, background: color, zIndex: 10 }}
      initial={{ y: -20, rotate: 0, opacity: 1 }}
      animate={{ y: '105vh', rotate: 720, opacity: 0 }}
      transition={{ duration: dur, delay, ease: 'linear', repeat: Infinity, repeatDelay: Math.random() * 2 }}
    />
  );
}

const CONFETTI_COLORS = ['#FF6BA8', '#4EFFC4', '#FFE66D', '#B565FF', '#FF3D71', '#00D9FF', '#FF9F1C'];

export function GameResult() {
  const navigate = useNavigate();
  const store = useGameStore();
  const payload = store.gameOverPayload;
  const myId = store.myUserId;

  const didWin = payload?.winner === myId;

  // Redirect to home if no payload
  useEffect(() => {
    if (!payload) {
      navigate('/');
    }
  }, [payload, navigate]);

  if (!payload) return null;

  const { characters, player1SecretId, player2SecretId, winner, forfeit } = payload;

  // The server sends player1SecretId and player2SecretId
  // We need to figure out which one is "mine" from the store's gameState
  const gameState = store.gameState;
  const actualMySecretId = gameState?.me.secretCharacterId ?? player1SecretId;
  const actualOpponentSecretId = gameState?.opponent
    ? (actualMySecretId === player1SecretId ? player2SecretId : player1SecretId)
    : player2SecretId;

  const myChar = characters.find((c) => c.id === actualMySecretId);
  const opponentChar = characters.find((c) => c.id === actualOpponentSecretId);
  const guessedChar = payload.guessedCharacterId
    ? characters.find((c) => c.id === payload.guessedCharacterId)
    : null;

  const opponentName = gameState?.opponent.name ?? 'Opponent';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start overflow-hidden"
      style={{
        background: didWin
          ? 'linear-gradient(160deg, #0f2a1a 0%, #0a1a2e 60%, #1a0a2e 100%)'
          : 'linear-gradient(160deg, #1a0a10 0%, #0f172a 60%, #0a1628 100%)',
      }}
    >
      {/* Confetti (winner only) */}
      {didWin && !forfeit && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {CONFETTI_COLORS.flatMap((color, ci) =>
            Array.from({ length: 3 }, (_, i) => (
              <ConfettiParticle key={`${ci}-${i}`} color={color} delay={ci * 0.3 + i * 0.7} />
            ))
          )}
        </div>
      )}

      {/* Halftone */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="relative w-full max-w-sm mx-auto px-4 py-8 flex flex-col items-center gap-6">
        {/* Result header */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        >
          {didWin ? (
            <>
              <div className="text-6xl mb-2">🎉</div>
              <h1
                className="font-display font-extrabold text-5xl"
                style={{
                  background: 'linear-gradient(135deg, #FFE66D, #4EFFC4)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 20px rgba(78,255,196,0.6))',
                }}
              >
                YOU WIN!
              </h1>
              <p className="font-body text-white/60 mt-2">
                {forfeit ? `${opponentName} forfeited!` : 'You guessed it!'}
              </p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-2">😔</div>
              <h1
                className="font-display font-extrabold text-4xl"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                {winner === myId ? 'YOU WIN!' : `${opponentName} wins!`}
              </h1>
              <p className="font-body text-white/50 mt-2">
                {forfeit
                  ? 'Opponent forfeited'
                  : payload.guessedBy === myId
                  ? 'Wrong guess — better luck next time!'
                  : `${opponentName} guessed correctly!`}
              </p>
            </>
          )}
        </motion.div>

        {/* Character reveal */}
        <motion.div
          className="w-full flex flex-col gap-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {guessedChar && (
            <RevealCard
              label={didWin ? '✓ Correct guess!' : '✗ Wrong guess'}
              character={guessedChar}
              accent={didWin ? '#4EFFC4' : '#FF3D71'}
            />
          )}

          <div className="flex gap-3">
            {opponentChar && (
              <div className="flex-1">
                <RevealCard
                  label={`${opponentName}'s character`}
                  character={opponentChar}
                  accent="#B565FF"
                  compact
                />
              </div>
            )}
            {myChar && (
              <div className="flex-1">
                <RevealCard
                  label="Your character"
                  character={myChar}
                  accent="#FF9F1C"
                  compact
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats */}
        {store.gameState && store.gameState.turnHistory.length > 0 && (
          <motion.div
            className="w-full rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.08)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <p className="font-display font-bold text-xs uppercase tracking-widest text-white/40 mb-3">
              Game Stats
            </p>
            <div className="flex justify-around">
              <Stat label="Questions" value={String(store.gameState.turnHistory.length)} />
              <Stat label="Rounds" value={String(Math.ceil(store.gameState.turnHistory.length / 2))} />
            </div>
          </motion.div>
        )}

        {/* CTAs */}
        <motion.div
          className="w-full flex flex-col gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="relative">
            <motion.button
              disabled
              className="w-full py-4 rounded-2xl font-display font-extrabold text-xl"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '4px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.3)',
                cursor: 'not-allowed',
              }}
            >
              💬 Start Chatting
            </motion.button>
            <span
              className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full font-display font-bold text-xs"
              style={{ background: '#FF9F1C', border: '2px solid black', color: '#0f172a' }}
            >
              Coming soon
            </span>
          </div>

          <motion.button
            className="w-full py-3 rounded-2xl font-display font-bold text-base"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '3px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.6)',
            }}
            whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.1)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              store.reset();
              navigate('/');
            }}
          >
            Play Again
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

function RevealCard({
  label,
  character,
  accent,
  compact = false,
}: {
  label: string;
  character: Character;
  accent: string;
  compact?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-3 flex flex-col gap-2"
      style={{ background: `${accent}11`, border: `3px solid ${accent}` }}
    >
      <p className="font-display font-bold text-xs" style={{ color: accent }}>
        {label}
      </p>
      <div className={compact ? '' : 'max-w-[160px]'}>
        <CharacterCard character={character} isFlipped={false} size={compact ? 'sm' : 'lg'} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="font-display font-extrabold text-2xl text-white">{value}</p>
      <p className="font-body text-xs text-white/40">{label}</p>
    </div>
  );
}
