import { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Swords } from '../../components/ui/Icons';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { CountdownScreen } from '../../components/game/CountdownScreen';
import {
  createOrJoinGame,
  getGame,
  getProfile,
  getMatchById,
  updateGameReady,
  deleteGame,
  insertGameSecret,
} from '../../lib/database';
import { generateGuessWhoBoard } from '../../lib/guessWhoCharacters';
import type { GameRow } from '../../lib/database';
import { GAME_LABELS } from '../../lib/gameConstants';

const POLL_MS = 1000;
const LOBBY_TIMEOUT_MS = 60_000;

function useTimer(seconds: number) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function getInitialState(gameType: string, matchId: string): object {
  switch (gameType) {
    case 'guess_who': {
      const board = generateGuessWhoBoard(matchId);
      return {
        characters: board.characters,
        p1Flipped: [] as string[],
        p2Flipped: [] as string[],
        turnPhase: 'ask' as const,
        currentQuestion: null,
        currentAnswer: null,
        turnHistory: [] as Array<{ asker: string; question: string; answer: string }>,
        moveCount: 0,
      };
    }
    case 'connect_four':
      return { board: Array.from({ length: 7 }, () => Array(6).fill(0)), moveCount: 0 };
    case 'battleship': {
      const emptyShots = () => Array.from({ length: 10 }, () => Array(10).fill(null));
      return {
        phase: 'placing_p1',
        p1Ships: null, p1Grid: null,
        p2Ships: null, p2Grid: null,
        p1Shots: emptyShots(), p2Shots: emptyShots(),
      };
    }
    case 'draughts': {
      // Generate initial 24-piece board using DB serialisation (p1 = bottom, p2 = top)
      const pieces: Array<{ id: string; row: number; col: number; player: 'p1' | 'p2'; isKing: boolean }> = [];
      let pid = 0;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          if ((row + col) % 2 === 1) {
            if (row < 3) pieces.push({ id: `b${pid++}`, row, col, player: 'p2', isKing: false });
            if (row > 4) pieces.push({ id: `p${pid++}`, row, col, player: 'p1', isKing: false });
          }
        }
      }
      return { pieces, moveCount: 0 };
    }
    case 'word_blitz':
      return { grid: [], pool: [], p1Score: 0, p2Score: 0, moveCount: 0 };
    case 'dot_dash':
      return {};
    default:
      return {};
  }
}

export function LobbyScreen() {
  // URL param is actually the matchId (set by GamePicker)
  const { gameId: matchId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gameType = searchParams.get('type');
  const gameLabel = (GAME_LABELS[gameType ?? ''] ?? 'GAME').toUpperCase();
  const { user } = useAuthStore();
  const myUserId = user?.id ?? null;
  const {
    isCountingDown,
    errorMessage,
    setGameId, setError,
    startCountdown,
  } = useGameStore();

  const [gameRow, setGameRow] = useState<GameRow | null>(null);
  const [myName, setMyName] = useState('You');
  const [myAvatar, setMyAvatar] = useState('🎮');
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [opponentAvatar, setOpponentAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [, setBothReady] = useState(false);
  const [readyError, setReadyError] = useState(false);

  const gameRowRef = useRef<GameRow | null>(null);
  const countdownStartedRef = useRef(false);
  const cleanedUpRef = useRef(false);
  const mountedAtRef = useRef(Date.now());

  // ── Redirect if missing gameType or not authenticated ─────────
  useEffect(() => {
    if (!gameType) {
      navigate('/matches', { replace: true });
      return;
    }
    if (!myUserId && matchId) {
      navigate(`/game?join=${matchId}`, { replace: true });
    }
  }, [gameType, myUserId, matchId, navigate]);

  // ── Create / join game on mount ────────────────────────────────
  useEffect(() => {
    if (!matchId || !myUserId) return;
    let cancelled = false;

    (async () => {
      try {
        // Load my profile for display
        const { data: myProfile } = await getProfile(myUserId);
        if (cancelled) return;
        if (myProfile?.name) setMyName(myProfile.name);
        if (myProfile?.character) {
          setMyAvatar(`/characters/${myProfile.character.charAt(0).toUpperCase() + myProfile.character.slice(1)}.png`);
        }

        // Resolve opponent from match
        const match = await getMatchById(matchId);
        if (cancelled) return;
        if (!match) {
          setError('Match not found');
          setLoading(false);
          return;
        }

        const opponentId = match.user_a === myUserId ? match.user_b : match.user_a;

        // Load opponent profile
        const { data: oppProfile } = await getProfile(opponentId);
        if (cancelled) return;
        if (oppProfile?.name) setOpponentName(oppProfile.name);
        if (oppProfile?.character) {
          setOpponentAvatar(`/characters/${oppProfile.character.charAt(0).toUpperCase() + oppProfile.character.slice(1)}.png`);
        }

        // Create or join the game row
        const initialState = getInitialState(gameType!, matchId);
        const row = await createOrJoinGame(matchId, gameType!, myUserId, opponentId, initialState);
        if (cancelled) return;
        if (row) {
          gameRowRef.current = row;
          setGameRow(row);
          setGameId(row.id);

          // Insert my secret character into game_secrets (ON CONFLICT DO NOTHING for re-joins)
          if (gameType === 'guess_who') {
            const board = generateGuessWhoBoard(matchId);
            const isPlayer1 = row.player1_id === myUserId;
            const mySecretCharId = isPlayer1 ? board.p1SecretId : board.p2SecretId;
            const ok = await insertGameSecret(row.id, myUserId, mySecretCharId);
            if (!ok && !cancelled) {
              setError('Failed to set up your secret character. Please leave and rejoin.');
              return;
            }
          }
        } else {
          setError('Failed to create game');
        }
      } catch (err) {
        if (!cancelled) setError('Failed to set up lobby');
        console.error('[LobbyScreen] init error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, myUserId]);

  // ── Poll for game state every 2s ───────────────────────────────
  useEffect(() => {
    const row = gameRowRef.current;
    if (!row) return;

    const id = setInterval(async () => {
      try {
        const updated = await getGame(row.id);
        if (!updated) return;
        gameRowRef.current = updated;
        setGameRow({ ...updated });
        const pollState = (updated.state ?? {}) as Record<string, unknown>;
        const pollReady = pollState.ready as Record<string, boolean> | undefined;
        console.log('[Lobby] Poll — state.ready:', pollReady);
        const p1Ready = pollReady?.[updated.player1_id];
        const p2Ready = pollReady?.[updated.player2_id];
        console.log('[Lobby] bothReady:', !!(p1Ready && p2Ready));
      } catch {
        // Transient error — retry on next tick
      }
    }, POLL_MS);

    return () => clearInterval(id);
  }, [gameRow?.id]);

  // ── Lobby timeout timer (counts down from 60s) ────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Date.now() - mountedAtRef.current;
      const remaining = Math.max(0, Math.ceil((LOBBY_TIMEOUT_MS - elapsed) / 1000));
      setTimeRemaining(remaining);

      if (remaining <= 0 && !countdownStartedRef.current) {
        clearInterval(id);
        const row = gameRowRef.current;
        if (row?.id && !cleanedUpRef.current) {
          cleanedUpRef.current = true;
          deleteGame(row.id);
        }
        navigate(`/match/${matchId}`, {
          state: { flash: 'Game cancelled — opponent didn\'t join in time.' },
        });
      }
    }, 1000);

    return () => clearInterval(id);
  }, [matchId, navigate]);

  // ── Unmount cleanup: delete pending game row if leaving before countdown ──
  useEffect(() => {
    return () => {
      const row = gameRowRef.current;
      if (row?.id && !countdownStartedRef.current && !cleanedUpRef.current) {
        cleanedUpRef.current = true;
        deleteGame(row.id);
      }
    };
  }, []);

  // ── Detect both players ready → countdown → navigate ──────────
  useEffect(() => {
    if (!gameRow || !myUserId || countdownStartedRef.current) return;

    const state = (gameRow.state ?? {}) as Record<string, unknown>;
    const ready = (state.ready ?? {}) as Record<string, boolean>;
    const bothReady = ready[gameRow.player1_id] && ready[gameRow.player2_id];

    if (bothReady) {
      countdownStartedRef.current = true;
      setBothReady(true);
      startCountdown(3);
    }
  }, [gameRow, myUserId, startCountdown]);

  const handleCountdownComplete = useCallback(() => {
    const resolvedType = gameType ?? gameRow?.game_type;
    switch (resolvedType) {
      case 'word_blitz':
        navigate(`/games/word-blitz/${matchId}`);
        break;
      case 'draughts':
        navigate(`/games/draughts/${matchId}`);
        break;
      case 'connect_four':
        navigate(`/games/connect-four/${matchId}`);
        break;
      case 'battleship':
        navigate(`/games/battleship/${matchId}`);
        break;
      case 'dot_dash':
        navigate(`/dotdash/${matchId}/play`);
        break;
      default: // guess_who
        navigate(`/game/${matchId}/play`);
        break;
    }
  }, [matchId, gameType, gameRow?.game_type, navigate]);

  // ── Ready button ───────────────────────────────────────────────
  const handleReady = async () => {
    if (!gameRow?.id || !myUserId) return;
    setReadyError(false);
    console.log('[Lobby] Ready clicked, gameRowId:', gameRow?.id);
    const { data: result, error } = await updateGameReady(gameRow.id, myUserId);
    console.log('[Lobby] set_player_ready result:', result, error);
    if (error) {
      // RPC failed — do NOT optimistic-update, let user retry
      setReadyError(true);
      return;
    }
    // Only mark ourselves ready locally; bothReady is driven by polling
    const state = (gameRow.state ?? {}) as Record<string, unknown>;
    const ready = { ...((state.ready as Record<string, boolean>) ?? {}), [myUserId]: true };
    const updated = { ...gameRow, state: { ...state, ready } };
    gameRowRef.current = updated;
    setGameRow(updated);
  };

  // ── Cancel button ──────────────────────────────────────────────
  const handleCancel = async () => {
    if (gameRow?.id) {
      await deleteGame(gameRow.id);
    }
    navigate(`/match/${matchId}`);
  };

  // ── Derive display state ───────────────────────────────────────
  const state = (gameRow?.state ?? {}) as Record<string, unknown>;
  const readyMap = (state.ready ?? {}) as Record<string, boolean>;
  const meReady = myUserId ? !!readyMap[myUserId] : false;

  // Opponent is the other player in the game row
  const opponentId = gameRow && myUserId
    ? (gameRow.player1_id === myUserId ? gameRow.player2_id : gameRow.player1_id)
    : null;
  const opponentJoined = !!opponentId && opponentId !== myUserId
    && gameRow?.player1_id !== gameRow?.player2_id;
  const oppReady = opponentId ? !!readyMap[opponentId] : false;

  const timerDisplay = useTimer(timeRemaining ?? 0);
  const timerColor = (timeRemaining ?? 999) < 15 ? '#FF3D71' : (timeRemaining ?? 999) < 30 ? '#FFE66D' : '#4EFFC4';

  return (
    <>
      {isCountingDown && <CountdownScreen onComplete={handleCountdownComplete} />}

      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
        style={{
          background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)',
        }}
      >
        {/* Halftone overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />

        <div className="relative w-full max-w-md">
          {/* Header */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <Swords size={28} className="text-electric-mint" />
              <h1
                className="font-display font-extrabold text-4xl"
                style={{
                  background: 'linear-gradient(135deg, #4EFFC4, #00D9FF)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: 'none',
                }}
              >
                {gameLabel}
              </h1>
              <Swords size={28} className="text-electric-mint scale-x-[-1]" />
            </div>
            <p className="font-body text-white/50 text-sm">Get ready to play!</p>
          </motion.div>

          {/* Player Cards */}
          <motion.div
            className="flex items-center gap-4 mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            {/* Me */}
            <PlayerCard
              name={myName}
              avatar={myAvatar}
              ready={meReady}
              isMe
            />

            {/* VS */}
            <div className="flex-shrink-0 text-center">
              <div
                className="font-display font-extrabold text-2xl"
                style={{ color: '#FFE66D', textShadow: '0 0 20px #FFE66D88' }}
              >
                VS
              </div>
            </div>

            {/* Opponent */}
            <PlayerCard
              name={opponentJoined ? (opponentName ?? 'Opponent') : '???'}
              avatar={opponentJoined ? (opponentAvatar ?? '❓') : '❓'}
              ready={oppReady}
              isMe={false}
            />
          </motion.div>

          {/* Status text */}
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {loading && (
              <p className="font-body text-white/60 text-sm animate-pulse">Setting up game...</p>
            )}
            {!loading && meReady && !oppReady && (
              <p className="font-body text-white/60 text-sm">
                Waiting for{' '}
                <span className="text-electric-mint font-medium">{opponentJoined ? (opponentName ?? 'opponent') : 'opponent'}</span>
                {opponentJoined ? ' to be ready...' : ' to join...'}
              </p>
            )}
            {!loading && !meReady && (
              <p className="font-body text-white/60 text-sm">Press Ready when you're set!</p>
            )}
            {!loading && meReady && oppReady && (
              <p className="font-body text-electric-mint font-medium text-sm animate-pulse">
                Both ready! Starting game...
              </p>
            )}
          </motion.div>

          {/* Timer */}
          {timeRemaining !== null && (
            <motion.div
              className="mb-6 mx-auto max-w-xs rounded-2xl px-6 py-4 text-center"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `2px solid ${timerColor}44`,
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="font-body text-white/40 text-xs uppercase tracking-widest mb-1">
                Time remaining
              </p>
              <p
                className="font-mono font-bold text-4xl"
                style={{
                  color: timerColor,
                  textShadow: `0 0 20px ${timerColor}88`,
                  animation: (timeRemaining ?? 999) < 15 ? 'pulse 1s ease-in-out infinite' : 'none',
                }}
              >
                {timerDisplay}
              </p>
            </motion.div>
          )}

          {/* Error */}
          {errorMessage && (
            <motion.div
              className="mb-4 px-4 py-3 rounded-xl text-center font-body text-sm"
              style={{ background: 'rgba(255,61,113,0.15)', border: '1px solid #FF3D71', color: '#FF3D71' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {errorMessage}
            </motion.div>
          )}

          {/* Ready error */}
          {readyError && (
            <motion.div
              className="mb-4 px-4 py-3 rounded-xl text-center font-body text-sm"
              style={{ background: 'rgba(255,61,113,0.15)', border: '1px solid #FF3D71', color: '#FF3D71' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Failed to ready up — tap to retry.
            </motion.div>
          )}

          {/* Buttons */}
          <motion.div
            className="flex flex-col gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {!meReady && !loading && (
              <motion.button
                onClick={handleReady}
                className="w-full py-4 rounded-2xl font-display font-extrabold text-xl text-white relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #4EFFC4 0%, #00D9FF 100%)',
                  border: '4px solid black',
                  boxShadow: '8px 8px 0px 0px #B565FF',
                  color: '#1a1a2e',
                }}
                whileHover={{ scale: 1.03, boxShadow: '10px 10px 0px 0px #B565FF' }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
                ✓ I'M READY!
              </motion.button>
            )}

            {!isCountingDown && (
              <button
                onClick={handleCancel}
                className="w-full py-3 rounded-2xl font-display font-bold text-base"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '2px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                Cancel Game
              </button>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}

function PlayerCard({ name, avatar, ready, isMe }: {
  name: string; avatar: string; ready: boolean; isMe: boolean;
}) {
  return (
    <motion.div
      className="flex-1 rounded-2xl p-4 text-center"
      style={{
        background: ready
          ? 'rgba(78, 255, 196, 0.1)'
          : 'rgba(255,255,255,0.05)',
        border: ready
          ? '2px solid #4EFFC4'
          : '2px solid rgba(255,255,255,0.15)',
        boxShadow: ready ? '0 0 20px rgba(78,255,196,0.3)' : 'none',
      }}
      animate={ready ? { boxShadow: ['0 0 10px rgba(78,255,196,0.2)', '0 0 30px rgba(78,255,196,0.5)', '0 0 10px rgba(78,255,196,0.2)'] } : {}}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <div
        className="w-14 h-14 rounded-full mx-auto mb-2 flex items-center justify-center text-2xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: '2px solid rgba(255,255,255,0.2)',
        }}
      >
        {avatar.startsWith('/')
          ? <img src={avatar} alt="avatar" className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
          : avatar}
      </div>
      <p className="font-display font-bold text-white text-sm truncate">
        {name}
        {isMe && <span className="text-white/40 font-body font-normal text-xs ml-1">(You)</span>}
      </p>
      <div className="mt-2">
        {ready ? (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-display font-bold text-xs"
            style={{ background: '#4EFFC422', color: '#4EFFC4', border: '1px solid #4EFFC4' }}
          >
            ✓ READY
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-display font-bold text-xs"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            WAITING
          </span>
        )}
      </div>
    </motion.div>
  );
}
