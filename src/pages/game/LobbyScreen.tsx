import { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Swords } from 'lucide-react';
import { connectSocket, disconnectSocket } from '../../lib/socket';
import { useGameStore } from '../../store/gameStore';
import { CountdownScreen } from '../../components/game/CountdownScreen';
import type { LobbyState } from '../../types/game';

function useTimer(seconds: number) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

export function LobbyScreen() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const {
    myUserId, myName,
    lobbyState, isCountingDown, connectionStatus, errorMessage,
    setLobbyState, setGameId, setGameState,
    startCountdown, setConnectionStatus, setError,
  } = useGameStore();

  const socketRef = useRef(connectSocket());
  const [connectTimedOut, setConnectTimedOut] = useState(false);

  const timeRemaining = lobbyState?.timeRemaining ?? null;
  const timerDisplay = useTimer(timeRemaining ?? 0);
  const timerColor = (timeRemaining ?? 999) < 60 ? '#FF3D71' : (timeRemaining ?? 999) < 120 ? '#FFE66D' : '#4EFFC4';

  // If no identity set, send them to setup first with gameId pre-filled
  useEffect(() => {
    if (!myUserId && gameId) {
      navigate(`/game?join=${gameId}`, { replace: true });
    }
  }, [myUserId, gameId, navigate]);

  const handleCountdownComplete = useCallback(() => {
    navigate(`/game/${gameId}/play`);
  }, [gameId, navigate]);

  useEffect(() => {
    if (!gameId || !myUserId) return;
    const socket = socketRef.current;

    setGameId(gameId);
    setConnectionStatus('connecting');

    // Time out after 15 s of no connection
    const timeoutId = setTimeout(() => {
      if (socketRef.current.connected) return;
      setConnectTimedOut(true);
      setConnectionStatus('error');
      setError('Could not reach the server. It may be starting up — try again in a moment.');
    }, 15000);

    socket.on('connect', () => {
      clearTimeout(timeoutId);
      setConnectTimedOut(false);
      setConnectionStatus('connected');
      socket.emit('join_lobby', { gameId, userId: myUserId });
    });

    socket.on('connect_error', () => {
      setConnectionStatus('error');
      setError('Cannot connect to game server. Is the server running?');
    });

    socket.on('lobby_updated', (data: LobbyState) => {
      setLobbyState(data);
    });

    socket.on('game_starting', ({ countdown }: { countdown: number }) => {
      startCountdown(countdown);
    });

    socket.on('game_started', ({ gameState }: { gameState: any }) => {
      setGameState(gameState);
      navigate(`/game/${gameId}/play`);
    });

    socket.on('lobby_expired', () => {
      navigate('/');
    });

    socket.on('game_cancelled', () => {
      navigate('/');
    });

    socket.on('error', ({ message }: { message: string }) => {
      setError(message);
    });

    if (!socket.connected) {
      socket.connect();
    } else {
      setConnectionStatus('connected');
      socket.emit('join_lobby', { gameId, userId: myUserId });
    }

    return () => {
      clearTimeout(timeoutId);
      socket.off('connect');
      socket.off('connect_error');
      socket.off('lobby_updated');
      socket.off('game_starting');
      socket.off('game_started');
      socket.off('lobby_expired');
      socket.off('game_cancelled');
      socket.off('error');
    };
  }, [gameId, myUserId]);

  const handleReady = () => {
    if (!gameId || !myUserId) return;
    socketRef.current.emit('player_ready', { gameId, userId: myUserId });
  };

  const handleCancel = () => {
    if (!gameId || !myUserId) return;
    socketRef.current.emit('cancel_game', { gameId, userId: myUserId });
    disconnectSocket();
    navigate('/');
  };

  const handleRetry = () => {
    setConnectTimedOut(false);
    setConnectionStatus('connecting');
    setError(null);
    const socket = socketRef.current;
    socket.disconnect();
    socket.connect();
  };

  const me = lobbyState
    ? (lobbyState.player1.userId === myUserId ? lobbyState.player1 : lobbyState.player2)
    : null;
  const opponent = lobbyState
    ? (lobbyState.player1.userId === myUserId ? lobbyState.player2 : lobbyState.player1)
    : null;

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
                GUESS WHO?
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
              name={me?.name ?? myName ?? 'You'}
              avatar={me?.avatar ?? '🎮'}
              ready={me?.ready ?? false}
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
              name={opponent?.name ?? '???'}
              avatar={opponent?.avatar ?? '❓'}
              ready={opponent?.ready ?? false}
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
            {me?.ready && !opponent?.ready && (
              <p className="font-body text-white/60 text-sm">
                Waiting for{' '}
                <span className="text-electric-mint font-medium">{opponent?.name ?? 'opponent'}</span>
                {' '}to join...
              </p>
            )}
            {!me?.ready && (
              <p className="font-body text-white/60 text-sm">Press Ready when you're set!</p>
            )}
            {me?.ready && opponent?.ready && (
              <p className="font-body text-electric-mint font-medium text-sm animate-pulse">
                Both ready! Starting game...
              </p>
            )}
          </motion.div>

          {/* Timer — only shown once we have server data */}
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
                  animation: timeRemaining < 60 ? 'pulse 1s ease-in-out infinite' : 'none',
                }}
              >
                {timerDisplay}
              </p>
            </motion.div>
          )}

          {/* Error / connection status */}
          {errorMessage && (
            <motion.div
              className="mb-4 px-4 py-3 rounded-xl text-center font-body text-sm"
              style={{ background: 'rgba(255,61,113,0.15)', border: '1px solid #FF3D71', color: '#FF3D71' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {errorMessage}
              {connectTimedOut && (
                <button
                  onClick={handleRetry}
                  className="block mx-auto mt-2 px-4 py-1.5 rounded-xl font-display font-bold text-xs text-white"
                  style={{ background: '#FF3D71', border: '2px solid white' }}
                >
                  Retry Connection
                </button>
              )}
            </motion.div>
          )}
          {connectionStatus === 'connecting' && !errorMessage && (
            <p className="text-center font-body text-xs text-white/30 mb-2 animate-pulse">
              Connecting to server...
            </p>
          )}

          {/* Buttons */}
          <motion.div
            className="flex flex-col gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {!me?.ready && (
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
