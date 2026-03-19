import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { CharacterCard } from '../../components/game/CharacterCard';
import type { Character } from '../../types/game';

// ── Location state passed from GameBoard ─────────────────────────
interface ResultLocationState {
  winner: 'player1' | 'player2';
  myRole: 'player1' | 'player2';
  myUserId: string;
  opponentId: string;
  p1SecretId: string;
  p2SecretId: string;
  characters: Character[];
  matchId: string;
  turnHistory: Array<{ asker: string; question: string; answer: string }>;
  gameRowPlayer1Id: string;
  gameRowPlayer2Id: string;
}

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
  const location = useLocation();
  const store = useGameStore();
  const s = location.state as ResultLocationState | null;

  // Redirect if location.state is missing/incomplete
  useEffect(() => {
    if (!s || !s.winner || !s.myRole || !s.characters) {
      navigate('/matches', { replace: true });
    }
  }, [s, navigate]);

  if (!s || !s.winner || !s.myRole || !s.characters) return null;

  const didWin = s.winner === s.myRole;
  const mySecretId = s.myRole === 'player1' ? s.p1SecretId : s.p2SecretId;
  const opponentSecretId = s.myRole === 'player1' ? s.p2SecretId : s.p1SecretId;
  const myChar = s.characters.find((c) => c.id === mySecretId);
  const opponentChar = s.characters.find((c) => c.id === opponentSecretId);

  // Detect first game with this match
  const matchId = s.matchId ?? localStorage.getItem('pending_match_id');
  const isFirstGame = matchId ? !localStorage.getItem(`first_game_played_${matchId}`) : false;
  const [showChatUnlock, setShowChatUnlock] = useState(false);

  // Auto-redirect to chat after 3s for first game with this match
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!isFirstGame || !matchId) return;

    const unlockTimer = setTimeout(() => setShowChatUnlock(true), 2000);
    const redirectTimer = setTimeout(() => {
      localStorage.setItem(`first_game_played_${matchId}`, 'true');
      store.reset();
      navigate('/chat', { state: { matchId, name: 'Opponent', character: opponentChar?.attributes?.type } });
    }, 3000);

    return () => {
      clearTimeout(unlockTimer);
      clearTimeout(redirectTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirstGame, matchId]);

  const turnHistory = s.turnHistory ?? [];

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
      {didWin && (
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
              <p className="font-body text-white/60 mt-2">You guessed it!</p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-2">😔</div>
              <h1
                className="font-display font-extrabold text-4xl"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                Opponent wins!
              </h1>
              <p className="font-body text-white/50 mt-2">Better luck next time!</p>
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
          <div className="flex gap-3">
            {opponentChar && (
              <div className="flex-1">
                <RevealCard
                  label="Opponent's character"
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
        {turnHistory.length > 0 && (
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
              <Stat label="Questions" value={String(turnHistory.length)} />
              <Stat label="Rounds" value={String(Math.ceil(turnHistory.length / 2))} />
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
          {isFirstGame ? (
            /* First game: auto-redirect banner */
            <motion.div
              className="w-full py-4 rounded-2xl text-center"
              style={{
                background: 'linear-gradient(135deg, #4EFFC4 0%, #B565FF 100%)',
                border: '4px solid rgba(255,255,255,0.2)',
                boxShadow: '0 0 24px rgba(78,255,196,0.4)',
              }}
            >
              {showChatUnlock ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-1"
                >
                  <p className="font-display font-extrabold text-lg" style={{ color: '#12122A' }}>
                    Chat unlocked! Opening chat...
                  </p>
                  <div className="flex gap-1 mt-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{ background: '#12122A' }}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
                      />
                    ))}
                  </div>
                </motion.div>
              ) : (
                <p className="font-display font-extrabold text-xl" style={{ color: '#12122A' }}>
                  💬 Game over!
                </p>
              )}
            </motion.div>
          ) : (
            /* Subsequent games: normal button */
            <motion.button
              className="w-full py-4 rounded-2xl font-display font-extrabold text-xl"
              style={{
                background: 'linear-gradient(135deg, #4EFFC4 0%, #B565FF 100%)',
                border: '4px solid rgba(255,255,255,0.2)',
                color: '#12122A',
                boxShadow: '0 0 24px rgba(78,255,196,0.4), 4px 4px 0 rgba(0,0,0,0.3)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                store.reset();
                navigate(matchId ? `/match/${matchId}` : '/matches');
              }}
            >
              START CHATTING →
            </motion.button>
          )}

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
              navigate(matchId ? `/match/${matchId}` : '/matches');
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
