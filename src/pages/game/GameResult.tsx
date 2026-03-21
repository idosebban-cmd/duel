import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { getGameByMatchId, revealSecrets } from '../../lib/database';
import { CharacterCard } from '../../components/game/CharacterCard';
import { usePostGameRedirect } from '../../lib/usePostGameRedirect';
import type { Character } from '../../types/game';

// ── Location state passed from GameBoard ─────────────────────────
interface ResultLocationState {
  winner: 'player1' | 'player2';
  myRole: 'player1' | 'player2';
  myUserId: string;
  opponentId: string;
  gameId: string;
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
  const { gameId: urlMatchId } = useParams<{ gameId: string }>();
  const { user } = useAuthStore();
  const store = useGameStore();
  const s = location.state as ResultLocationState | null;

  // ── All useState hooks (before any early returns) ────────────────
  const [dbResult, setDbResult] = useState<ResultLocationState | null>(null);
  const [loading, setLoading] = useState(!s);
  const [showChatUnlock, setShowChatUnlock] = useState(false);
  const [p1SecretId, setP1SecretId] = useState<string | null>(null);
  const [p2SecretId, setP2SecretId] = useState<string | null>(null);
  const [secretsError, setSecretsError] = useState(false);

  // ── All useEffect hooks (before any early returns) ───────────────

  // DB fallback: load game from DB if location.state is missing (page refresh)
  useEffect(() => {
    if (s) return;
    const mid = urlMatchId;
    if (!mid || !user?.id) {
      navigate('/matches', { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const game = await getGameByMatchId(mid);
        if (cancelled) return;
        if (!game || !game.winner) {
          navigate('/matches', { replace: true });
          return;
        }
        const state = game.state as Record<string, unknown>;
        const isP1 = game.player1_id === user.id;
        setDbResult({
          winner: game.winner as 'player1' | 'player2',
          myRole: isP1 ? 'player1' : 'player2',
          myUserId: user.id,
          opponentId: isP1 ? game.player2_id : game.player1_id,
          gameId: game.id,
          characters: (state.characters as Character[]) ?? [],
          matchId: game.match_id,
          turnHistory: (state.turnHistory as Array<{ asker: string; question: string; answer: string }>) ?? [],
          gameRowPlayer1Id: game.player1_id,
          gameRowPlayer2Id: game.player2_id,
        });
      } catch {
        if (!cancelled) navigate('/matches', { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [s, urlMatchId, user?.id, navigate]);

  const result = s ?? dbResult;

  // Reveal secrets via RPC (with retry)
  useEffect(() => {
    const gId = result?.gameId;
    if (!gId) return;
    let cancelled = false;
    let attempt = 0;

    const tryReveal = async () => {
      const secrets = await revealSecrets(gId);
      if (cancelled) return;
      if (secrets) {
        setP1SecretId(secrets.p1_character_id);
        setP2SecretId(secrets.p2_character_id);
      } else if (attempt < 2) {
        attempt++;
        setTimeout(() => { if (!cancelled) tryReveal(); }, 2000);
      } else {
        setSecretsError(true);
      }
    };

    tryReveal();
    return () => { cancelled = true; };
  }, [result?.gameId]);

  // Derive values needed by the auto-redirect effect (safe even when result is null)
  const matchId = result?.matchId ?? localStorage.getItem('pending_match_id') ?? '';

  usePostGameRedirect({ isMultiplayer: !!matchId, matchId, phase: 'result' });

  const isFirstGame = matchId ? !localStorage.getItem(`first_game_played_${matchId}`) : false;
  const characters = result?.characters ?? [];
  const opponentSecretId = result?.myRole === 'player1' ? p2SecretId : p1SecretId;
  const opponentChar = opponentSecretId ? characters.find((c) => c.id === opponentSecretId) : undefined;

  // Auto-redirect to chat after 3s for first game with this match
  useEffect(() => {
    if (!isFirstGame || !matchId || !p1SecretId || !p2SecretId) return;

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
  }, [isFirstGame, matchId, p1SecretId, p2SecretId]);

  // ── Early returns (all hooks are above) ──────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#12122A' }}>
        <p className="font-body text-white/50 text-sm animate-pulse">Loading result...</p>
      </div>
    );
  }

  if (!result || !result.winner || !result.myRole || !result.characters) return null;

  if (secretsError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#12122A' }}>
        <p className="font-body text-white/70 text-sm">Something went wrong loading game results.</p>
        <button
          onClick={() => navigate('/matches', { replace: true })}
          className="px-6 py-3 rounded-2xl font-display font-bold text-sm"
          style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)', color: 'white' }}
        >
          Back to Matches
        </button>
      </div>
    );
  }

  if (!p1SecretId || !p2SecretId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#12122A' }}>
        <p className="font-body text-white/50 text-sm animate-pulse">Revealing characters...</p>
      </div>
    );
  }

  // ── Derived render values ────────────────────────────────────────
  const didWin = result.winner === result.myRole;
  const mySecretId = result.myRole === 'player1' ? p1SecretId : p2SecretId;
  const myChar = characters.find((c) => c.id === mySecretId);
  const turnHistory = result.turnHistory ?? [];

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
