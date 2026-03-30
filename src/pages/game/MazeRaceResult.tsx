import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMazeRaceStore } from '../../store/mazeRaceStore';
import { usePostGameRedirect } from '../../lib/usePostGameRedirect';
import { createChallenge } from '../../lib/database';
import { useAuthStore } from '../../store/authStore';

function ConfettiPiece({ color, delay }: { color: string; delay: number }) {
  const x = Math.random() * 100;
  const dur = 2.5 + Math.random() * 2;
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

const CONFETTI_COLORS = ['#FF6BA8', '#4EFFC4', '#FFE66D', '#B565FF', '#FF3D71', '#FF9F1C'];

export function MazeRaceResult() {
  const navigate = useNavigate();
  const { matchId: routeMatchId } = useParams<{ matchId: string }>();
  const store = useMazeRaceStore();
  const payload = store.gameOverPayload;
  const { user } = useAuthStore();
  const myId = user?.id ?? store.myUserId;

  useEffect(() => {
    if (!payload) navigate('/play');
  }, [payload, navigate]);

  const matchId = routeMatchId ?? null;

  usePostGameRedirect({ isMultiplayer: !!matchId, matchId, phase: 'result' });

  const isFirstGame = matchId ? !localStorage.getItem(`first_game_played_${matchId}`) : false;
  const [showChatUnlock, setShowChatUnlock] = useState(false);
  const [rematchBusy, setRematchBusy] = useState(false);
  const [rematchError, setRematchError] = useState<string | null>(null);

  const firstGameUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstGameRedirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFirstGameTimers = () => {
    if (firstGameUnlockTimerRef.current) {
      clearTimeout(firstGameUnlockTimerRef.current);
      firstGameUnlockTimerRef.current = null;
    }
    if (firstGameRedirectTimerRef.current) {
      clearTimeout(firstGameRedirectTimerRef.current);
      firstGameRedirectTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!payload || !isFirstGame || !matchId) return;
    clearFirstGameTimers();
    firstGameUnlockTimerRef.current = setTimeout(() => setShowChatUnlock(true), 2000);
    firstGameRedirectTimerRef.current = setTimeout(() => {
      localStorage.setItem(`first_game_played_${matchId}`, 'true');
      navigate(`/match/${matchId}`);
    }, 3000);
    return () => {
      clearFirstGameTimers();
    };
  }, [payload, isFirstGame, matchId, navigate]);

  if (!payload || !myId) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: '#12122A' }}
      >
        <p className="font-body text-white/50 text-ui-body animate-pulse">Loading result...</p>
      </div>
    );
  }

  const { winner, forfeit, finalState } = payload;
  const didWin = winner === myId;
  const me = finalState.player1.userId === myId ? finalState.player1 : finalState.player2;
  const opp = finalState.player1.userId === myId ? finalState.player2 : finalState.player1;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start overflow-hidden relative"
      style={{
        background: didWin
          ? 'linear-gradient(160deg, #0a2a1a 0%, #0a1a2e 60%, #1a0a2e 100%)'
          : 'linear-gradient(160deg, #1a0a10 0%, #0f122a 60%, #0a1628 100%)',
      }}
    >
      {didWin && !forfeit && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {CONFETTI_COLORS.flatMap((c, ci) =>
            Array.from({ length: 4 }, (_, i) => (
              <ConfettiPiece key={`${ci}-${i}`} color={c} delay={ci * 0.25 + i * 0.6} />
            )),
          )}
        </div>
      )}

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="relative w-full max-w-sm mx-auto px-4 py-8 flex flex-col items-center gap-6">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        >
          {didWin ? (
            <>
              <div className="text-6xl mb-2">🏆</div>
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
                {forfeit ? `${opp.name} forfeited!` : 'You reached your exit first!'}
              </p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-2">💀</div>
              <h1 className="font-display font-extrabold text-4xl text-white/70">
                {opp.name} wins!
              </h1>
              <p className="font-body text-white/50 mt-2">
                {forfeit ? 'You disconnected — they win by forfeit.' : 'They reached their exit first.'}
              </p>
            </>
          )}
        </motion.div>

        <motion.div
          className="w-full rounded-2xl overflow-hidden"
          style={{ border: '4px solid black', boxShadow: '8px 8px 0 rgba(0,0,0,0.3)' }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div
            className="px-5 py-3 text-center"
            style={{ background: 'linear-gradient(135deg, #FF6BA8, #00D9FF)' }}
          >
            <p className="font-display font-bold text-white text-sm uppercase tracking-widest">
              Final positions
            </p>
          </div>
          <div className="bg-white px-5 py-4 flex gap-4">
            {[
              { p: me, label: 'YOU', color: '#FF6BA8', isWinner: didWin },
              { p: opp, label: 'THEM', color: '#00D9FF', isWinner: !didWin },
            ].map(({ p, label, color, isWinner }) => (
              <div
                key={label}
                className="flex-1 flex flex-col items-center gap-2 py-2 rounded-xl"
                style={{
                  background: isWinner ? `${color}22` : 'transparent',
                  border: isWinner ? `3px solid ${color}` : '3px solid transparent',
                }}
              >
                <p className="font-display font-bold text-charcoal text-sm">
                  {isWinner ? '🏆 ' : ''}
                  {p.name}
                </p>
                <p className="font-body text-ui-body text-center mt-1" style={{ color }}>
                  {isWinner
                    ? (forfeit ? '🏆 Win by forfeit' : '🏆 Reached the exit!')
                    : 'Almost there…'}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="w-full flex flex-col gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {isFirstGame ? (
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
                </motion.div>
              ) : (
                <p className="font-display font-extrabold text-xl" style={{ color: '#12122A' }}>
                  💬 Game over!
                </p>
              )}
            </motion.div>
          ) : (
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
                clearFirstGameTimers();
                if (matchId) navigate(`/match/${matchId}`);
                else navigate('/matches');
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
              color: 'rgba(255,255,255,0.85)',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            disabled={rematchBusy || !matchId || !myId || !opp?.userId}
            onClick={() => {
              if (!matchId || !myId || !opp?.userId) return;
              clearFirstGameTimers();
              setRematchError(null);
              setRematchBusy(true);
              void (async () => {
                try {
                  store.reset();
                  await createChallenge(matchId, myId, opp.userId, 'maze_race');
                  navigate(`/match/${matchId}`);
                } catch {
                  setRematchError('Failed to start rematch');
                } finally {
                  setRematchBusy(false);
                }
              })();
            }}
          >
            {rematchBusy ? 'Starting rematch…' : 'Rematch'}
          </motion.button>

          <motion.button
            className="w-full py-3 rounded-2xl font-display font-bold text-base"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '3px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.6)',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            disabled={!matchId}
            onClick={() => {
              if (!matchId) return;
              clearFirstGameTimers();
              store.reset();
              navigate(`/match/${matchId}`, { state: { openGamePicker: true } });
            }}
          >
            Play another game
          </motion.button>

          {rematchError && (
            <p className="font-body text-ui-body text-white/40 text-center">{rematchError}</p>
          )}
        </motion.div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 h-[3px] pointer-events-none"
        style={{
          background: 'linear-gradient(90deg,#FF6BA8,#FFE66D,#4EFFC4,#B565FF,#FF6BA8)',
          boxShadow: '0 0 14px rgba(78,255,196,0.7)',
        }}
      />
    </div>
  );
}
