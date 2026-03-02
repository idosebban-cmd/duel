import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { connectSocket } from '../../lib/socket';
import { useDotDashStore } from '../../store/dotDashStore';

export function DotDashLobby() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate   = useNavigate();
  const store      = useDotDashStore();
  const socketRef  = useRef(connectSocket());

  const [countdown, setCountdown] = useState<number | null>(null);
  const [error,     setError]     = useState<string | null>(null);

  const lobby  = store.lobbyState;
  const myId   = store.myUserId;
  const isMe   = (uid: string) => uid === myId;

  // ── Socket setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameId || !myId) {
      navigate(`/dotdash?join=${gameId ?? ''}`);
      return;
    }

    const socket = socketRef.current;
    socket.emit('dd_join_lobby', { gameId, userId: myId });

    socket.on('dd_lobby_updated', (state) => {
      store.setLobbyState(state);
    });

    socket.on('dd_game_starting', ({ countdown: c }: { countdown: number }) => {
      setCountdown(c);
      const tick = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) { clearInterval(tick); return null; }
          return prev - 1;
        });
      }, 1000);
    });

    socket.on('dd_game_started', ({ gameState }: { gameState: any }) => {
      store.setGameState(gameState);
      navigate(`/dotdash/${gameId}/play`);
    });

    socket.on('dd_error', ({ message }: { message: string }) => {
      setError(message);
    });

    return () => {
      socket.off('dd_lobby_updated');
      socket.off('dd_game_starting');
      socket.off('dd_game_started');
      socket.off('dd_error');
    };
  }, [gameId, myId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReady = () => {
    if (!gameId || !myId) return;
    socketRef.current.emit('dd_player_ready', { gameId, userId: myId });
  };

  const myReady  = lobby ? (isMe(lobby.player1.userId) ? lobby.player1.ready : lobby.player2.ready) : false;
  const oppReady = lobby ? (isMe(lobby.player1.userId) ? lobby.player2.ready : lobby.player1.ready) : false;
  const opp      = lobby ? (isMe(lobby.player1.userId) ? lobby.player2 : lobby.player1) : null;
  const me       = lobby ? (isMe(lobby.player1.userId) ? lobby.player1 : lobby.player2) : null;

  const mins = lobby ? String(Math.floor(lobby.timeRemaining / 60)).padStart(2, '0') : '10';
  const secs = lobby ? String(lobby.timeRemaining % 60).padStart(2, '0') : '00';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{ background: '#12122A' }}
    >
      {/* Grid bg */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(78,255,196,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(78,255,196,0.06) 1px,transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Countdown overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(18,18,42,0.92)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              key={countdown}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="font-display font-extrabold text-center"
              style={{ fontSize: 120, color: '#4EFFC4',
                textShadow: '0 0 40px rgba(78,255,196,0.8), 8px 8px 0 rgba(0,0,0,0.4)' }}
            >
              {countdown === 0 ? 'GO!' : countdown}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full max-w-sm flex flex-col gap-6">
        {/* Header */}
        <motion.div className="text-center" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-mono text-xs text-electric-mint/60 mb-1 uppercase tracking-widest">
            Game ID: <span className="text-electric-mint font-bold">{gameId}</span>
          </p>
          <h1 className="font-display font-extrabold text-4xl" style={{
            background: 'linear-gradient(135deg, #4EFFC4, #FFE66D)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            DOT DASH
          </h1>
          <p className="font-body text-white/40 text-sm mt-1">
            Waiting for both players · {mins}:{secs}
          </p>
        </motion.div>

        {/* Players */}
        <motion.div className="grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        >
          {[
            { data: me,  label: 'YOU',  color: '#FF6BA8', shadow: '#FF3D71' },
            { data: opp, label: 'THEM', color: '#4EFFC4', shadow: '#00D9FF' },
          ].map(({ data, label, color, shadow }) => (
            <div key={label} className="rounded-2xl p-4 flex flex-col items-center gap-3"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `3px solid ${data?.ready ? color : 'rgba(255,255,255,0.1)'}`,
                boxShadow: data?.ready ? `0 0 20px ${shadow}44` : 'none',
                transition: 'all 0.3s',
              }}
            >
              <div className="w-14 h-14 rounded-2xl overflow-hidden"
                style={{ border: `3px solid ${color}`, background: 'rgba(0,0,0,0.2)' }}
              >
                {data?.avatar
                  ? <img src={data.avatar} alt={label} className="w-full h-full object-contain" />
                  : <div className="w-full h-full flex items-center justify-center text-2xl">?</div>
                }
              </div>
              <p className="font-display font-bold text-sm text-white">{data?.name ?? '…'}</p>
              <span className="font-display font-bold text-xs px-3 py-1 rounded-full"
                style={{
                  background: data?.ready ? color : 'rgba(255,255,255,0.08)',
                  color:      data?.ready ? '#12122A' : 'rgba(255,255,255,0.4)',
                  border:     `2px solid ${data?.ready ? color : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                {data?.ready ? '✓ READY' : label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* How to play */}
        <motion.div className="rounded-2xl p-4"
          style={{ background: 'rgba(78,255,196,0.08)', border: '2px solid rgba(78,255,196,0.25)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        >
          <p className="font-display font-bold text-xs text-electric-mint uppercase tracking-widest mb-2">
            How to play
          </p>
          <ul className="font-body text-white/60 text-xs space-y-1">
            <li>🎮 Swipe or use arrow keys to move</li>
            <li>• Collect dots to score (+10 each)</li>
            <li>👻 Avoid ghosts – lose a life if caught</li>
            <li>❤️ 3 lives · most dots when all eaten wins</li>
          </ul>
        </motion.div>

        {/* Share link */}
        {!oppReady && (
          <motion.div className="rounded-2xl p-3 text-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '2px solid rgba(255,255,255,0.08)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          >
            <p className="font-body text-white/40 text-xs mb-2">Share this link with your opponent:</p>
            <button
              onClick={() => {
                const url = `${window.location.origin}/dotdash?join=${gameId}`;
                navigator.clipboard?.writeText(url);
              }}
              className="font-mono text-xs text-electric-mint underline break-all"
            >
              {window.location.origin}/dotdash?join={gameId}
            </button>
          </motion.div>
        )}

        {error && (
          <p className="text-center font-body text-sm text-cherry-punch">{error}</p>
        )}

        {/* Ready button */}
        <motion.button
          onClick={handleReady}
          disabled={myReady}
          className="w-full py-5 rounded-2xl font-display font-extrabold text-xl"
          style={{
            background: myReady
              ? 'rgba(78,255,196,0.15)'
              : 'linear-gradient(135deg, #4EFFC4 0%, #FFE66D 100%)',
            border:    '4px solid black',
            color:     myReady ? 'rgba(78,255,196,0.6)' : '#12122A',
            boxShadow: myReady ? 'none' : '8px 8px 0px 0px #B565FF',
            cursor:    myReady ? 'not-allowed' : 'pointer',
          }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          whileHover={!myReady ? { scale: 1.03 } : {}}
          whileTap={!myReady ? { scale: 0.97 } : {}}
        >
          {myReady ? '✓ READY!' : '⚡ I\'M READY'}
        </motion.button>

        <motion.button
          onClick={() => navigate('/dotdash')}
          className="font-body text-sm text-white/30 text-center hover:text-white/60 transition-colors"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        >
          ← Leave lobby
        </motion.button>
      </div>

      {/* Neon bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 h-[3px]"
        style={{ background: 'linear-gradient(90deg,#FF6BA8,#FFE66D,#4EFFC4,#B565FF,#FF6BA8)', boxShadow: '0 0 14px rgba(78,255,196,0.7)' }}
      />
    </div>
  );
}
