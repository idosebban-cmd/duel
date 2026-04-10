import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { connectSocket } from '../../lib/socket';
import { useMazeRaceStore } from '../../store/mazeRaceStore';
import { useAuthStore } from '../../store/authStore';
import { getMatchById, getProfile } from '../../lib/database';
import type { MRGameState } from '../../types/mazeRace';

const FALLBACK_PROD_SERVER_URL = 'https://duel-fast.onrender.com';
const SERVER_URL = import.meta.env.VITE_SERVER_URL
  || (import.meta.env.DEV ? 'http://localhost:3001' : FALLBACK_PROD_SERVER_URL);

const MAX_LOBBY_JOIN_ATTEMPTS = 10;

export function MazeRaceLobby() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const store = useMazeRaceStore();
  const setLobbyReady = useMazeRaceStore((s) => s.setLobbyReady);
  const setGameState = useMazeRaceStore((s) => s.setGameState);
  const { user } = useAuthStore();
  const socketRef = useRef(connectSocket());

  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const recoveringRef = useRef(false);

  const hasJoinedRef = useRef(false);
  const joinEmitCountRef = useRef(0);
  const phaseNavHandledRef = useRef(false);

  /** Prefer Supabase auth id over store so join matches server-side player slots. */
  const myId = user?.id ?? store.myUserId;

  const recoverExpiredGameRef = useRef<() => Promise<void>>(async () => {});

  const lobby = store.lobbyReady;

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data: profile } = await getProfile(user.id);
      if (cancelled) return;
      useMazeRaceStore.getState().setIdentity(user.id, profile?.name ?? user.id);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (!matchId || !user?.id) return;
    let cancelled = false;
    (async () => {
      const match = await getMatchById(matchId);
      if (cancelled || !match) return;
      const opp = match.user_a === user.id ? match.user_b : match.user_a;
      setOpponentId(opp ?? null);
      if (opp) {
        const { data: oppProfile } = await getProfile(opp);
        if (!cancelled) setOpponentName(oppProfile?.name ?? null);
      } else {
        setOpponentName(null);
      }
    })();
    return () => { cancelled = true; };
  }, [matchId, user?.id]);

  const recoverExpiredGame = useCallback(async () => {
    if (recoveringRef.current || !matchId || !myId) return;
    let oppId = opponentId;
    if (!oppId) {
      const match = await getMatchById(matchId);
      if (!match) {
        setError('Could not load match.');
        return;
      }
      oppId = match.user_a === myId ? match.user_b : match.user_a;
      if (oppId) setOpponentId(oppId);
    }
    if (!oppId) {
      setError('Could not find opponent for this match.');
      return;
    }

    recoveringRef.current = true;
    setReconnecting(true);
    setError(null);
    try {
      const [p1Id, p2Id] = myId < oppId ? [myId, oppId] : [oppId, myId];
      const [r1, r2] = await Promise.all([getProfile(p1Id), getProfile(p2Id)]);
      const p1Name = r1.data?.name ?? 'Player 1';
      const p2Name = r2.data?.name ?? 'Opponent';
      const res = await fetch(`${SERVER_URL}/api/mazerace/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: matchId,
          player1Id: p1Id,
          player1Name: p1Name,
          player2Id: p2Id,
          player2Name: p2Name,
        }),
      });
      if (!res.ok) throw new Error(`Could not restore game (${res.status})`);
      const socket = socketRef.current;
      hasJoinedRef.current = false;
      joinEmitCountRef.current = 0;
      socket.emit('mr_join', { gameId: matchId, userId: myId });
      socket.emit('mr_ready', { gameId: matchId, userId: myId });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reconnect failed');
    } finally {
      setReconnecting(false);
      recoveringRef.current = false;
    }
  }, [matchId, myId, opponentId]);

  recoverExpiredGameRef.current = recoverExpiredGame;

  const checkPhaseAndNavigate = useCallback(async () => {
    if (!matchId || phaseNavHandledRef.current) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/mazerace/${matchId}`);
      if (!res.ok) return;
      const data = (await res.json()) as { phase?: string };
      if (data.phase === 'playing') {
        phaseNavHandledRef.current = true;
        navigate(`/mazerace/${matchId}/play`);
      } else if (data.phase === 'finished') {
        phaseNavHandledRef.current = true;
        navigate(`/mazerace/${matchId}/result`);
      }
    } catch {
      /* ignore */
    }
  }, [matchId, navigate]);

  useEffect(() => {
    hasJoinedRef.current = false;
    joinEmitCountRef.current = 0;
    phaseNavHandledRef.current = false;
  }, [matchId]);

  useEffect(() => {
    if (!matchId || !myId) return;

    const socket = socketRef.current;

    const tryEmitJoin = () => {
      if (hasJoinedRef.current) return;
      if (joinEmitCountRef.current >= MAX_LOBBY_JOIN_ATTEMPTS) return;
      joinEmitCountRef.current += 1;
      socket.emit('mr_join', { gameId: matchId, userId: myId });
    };

    const onConnect = () => {
      if (hasJoinedRef.current) {
        socket.emit('mr_join', { gameId: matchId, userId: myId });
        return;
      }
      tryEmitJoin();
    };

    const onLobbyUpdate = (payload: {
      player1Ready: boolean;
      player2Ready: boolean;
      player1Name?: string;
      player2Name?: string;
    }) => {
      setLobbyReady(payload);
      if (!hasJoinedRef.current) {
        hasJoinedRef.current = true;
        void checkPhaseAndNavigate();
      }
    };

    const onGameExpired = () => {
      void recoverExpiredGameRef.current();
    };

    socket.on('connect', onConnect);
    tryEmitJoin();

    socket.on('mr_lobby_update', onLobbyUpdate);

    socket.on('mr_countdown', ({ count }: { count: number }) => {
      setCountdown(count);
    });

    socket.on('mr_game_started', ({ gameState: gs }: { gameState: unknown }) => {
      phaseNavHandledRef.current = true;
      setGameState(gs as MRGameState);
      navigate(`/mazerace/${matchId}/play`);
    });

    socket.on('mr_error', ({ message }: { message: string }) => {
      if (message === 'Game not found') return;
      setError(message);
      if (joinEmitCountRef.current >= MAX_LOBBY_JOIN_ATTEMPTS && !hasJoinedRef.current) {
        setError(`${message} (lobby join failed after ${MAX_LOBBY_JOIN_ATTEMPTS} attempts)`);
      }
    });

    socket.on('mr_game_expired', onGameExpired);

    return () => {
      socket.off('connect', onConnect);
      socket.off('mr_lobby_update', onLobbyUpdate);
      socket.off('mr_countdown');
      socket.off('mr_game_started');
      socket.off('mr_error');
      socket.off('mr_game_expired', onGameExpired);
    };
  }, [matchId, myId, navigate, setLobbyReady, setGameState, checkPhaseAndNavigate]);

  const handleReady = () => {
    if (!matchId || !myId) return;
    socketRef.current.emit('mr_ready', { gameId: matchId, userId: myId });
  };

  /** Server create flow uses lexicographic order for player1 vs player2 (see App challenge / recover). */
  const isP1 = myId && opponentId ? myId < opponentId : true;
  const myReady = lobby
    ? (isP1 ? lobby.player1Ready : lobby.player2Ready)
    : false;
  const oppReady = lobby
    ? (isP1 ? lobby.player2Ready : lobby.player1Ready)
    : false;

  const myDisplayName = isP1
    ? (lobby?.player1Name ?? store.myName ?? 'You')
    : (lobby?.player2Name ?? store.myName ?? 'You');
  const oppDisplayName = isP1
    ? (lobby?.player2Name ?? opponentName ?? 'Opponent')
    : (lobby?.player1Name ?? opponentName ?? 'Opponent');

  const gridBg = (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage:
          'linear-gradient(rgba(78,255,196,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(78,255,196,0.06) 1px,transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    />
  );

  if (!matchId || !myId) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden"
        style={{ background: '#12122A' }}
      >
        {gridBg}
        <div className="relative z-10 flex flex-col items-center gap-3">
          <p className="font-display font-bold text-electric-mint/80 text-sm uppercase tracking-widest">
            Maze Race
          </p>
          <p className="font-body text-white/70 text-ui-body">
            {!matchId ? 'Loading…' : 'Loading lobby…'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{ background: '#12122A' }}
    >
      {gridBg}

      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(18,18,42,0.92)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              key={countdown}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="font-display font-extrabold text-center"
              style={{
                fontSize: 120,
                color: '#4EFFC4',
                textShadow: '0 0 40px rgba(78,255,196,0.8), 8px 8px 0 rgba(0,0,0,0.4)',
              }}
            >
              {countdown === 0 ? 'GO!' : countdown}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full max-w-sm flex flex-col gap-6">
        <motion.div className="text-center" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1
            className="font-display font-extrabold text-4xl"
            style={{
              background: 'linear-gradient(135deg, #FF6BA8, #4EFFC4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            MAZE RACE
          </h1>
          <p className="font-body text-white/70 text-ui-body mt-1">
            Race to your exit · First one wins
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {[
            { ready: myReady, label: myDisplayName, color: '#FF6BA8', shadow: '#FF3D71', key: 'me' },
            { ready: oppReady, label: oppDisplayName, color: '#00D9FF', shadow: '#4EFFC4', key: 'opp' },
          ].map(({ ready, label, color, shadow, key }) => (
            <div
              key={key}
              className="rounded-2xl p-4 flex flex-col items-center gap-3 min-w-0"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `3px solid ${ready ? color : 'rgba(255,255,255,0.1)'}`,
                boxShadow: ready ? `0 0 20px ${shadow}44` : 'none',
                transition: 'all 0.3s',
              }}
            >
              <span
                className="font-display font-bold text-xs px-3 py-1 rounded-full max-w-full truncate"
                style={{
                  background: ready ? color : 'rgba(255,255,255,0.08)',
                  color: ready ? '#12122A' : 'rgba(255,255,255,0.4)',
                  border: `2px solid ${ready ? color : 'rgba(255,255,255,0.1)'}`,
                }}
                title={label}
              >
                {ready ? '✓ READY' : label}
              </span>
            </div>
          ))}
        </motion.div>

        <motion.div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(78,255,196,0.08)', border: '2px solid rgba(78,255,196,0.25)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p className="font-display font-bold text-xs text-electric-mint uppercase tracking-widest mb-2">
            How to play
          </p>
          <ul className="font-body text-white/70 text-ui-caption space-y-1">
            <li>Tap direction buttons to move one cell</li>
            <li>Yellow markers show both exits — yours is opposite your opponent&apos;s</li>
            <li>Player 1 starts top-left; player 2 starts bottom-right</li>
          </ul>
        </motion.div>

        {reconnecting && (
          <p className="text-center font-body text-ui-body text-electric-mint/90">
            Reconnecting…
          </p>
        )}

        {error && !reconnecting && (
          <p className="text-center font-body text-ui-body text-cherry-punch">{error}</p>
        )}

        <motion.button
          type="button"
          onClick={handleReady}
          disabled={myReady || reconnecting}
          className="w-full py-5 rounded-2xl font-display font-extrabold text-xl"
          style={{
            background: myReady
              ? 'rgba(78,255,196,0.15)'
              : 'linear-gradient(135deg, #FF6BA8 0%, #4EFFC4 100%)',
            border: '4px solid black',
            color: myReady ? 'rgba(78,255,196,0.6)' : '#12122A',
            boxShadow: myReady ? 'none' : '8px 8px 0px 0px #FFE66D',
            cursor: myReady ? 'not-allowed' : 'pointer',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={!myReady ? { scale: 1.03 } : {}}
          whileTap={!myReady ? { scale: 0.97 } : {}}
        >
          {myReady ? '✓ READY!' : "⚡ I'M READY"}
        </motion.button>

        <motion.button
          type="button"
          onClick={() => navigate(matchId ? `/match/${matchId}` : '/play')}
          className="font-body text-ui-body text-white/30 text-center hover:text-white/60 transition-colors"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          ← Leave lobby
        </motion.button>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 h-[3px]"
        style={{
          background: 'linear-gradient(90deg,#FF6BA8,#FFE66D,#4EFFC4,#B565FF,#FF6BA8)',
          boxShadow: '0 0 14px rgba(78,255,196,0.7)',
        }}
      />
    </div>
  );
}
