import {
  useEffect, useRef, useCallback, useState,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { connectSocket } from '../../lib/socket';
import { useAuthStore } from '../../store/authStore';
import { useMazeRaceStore } from '../../store/mazeRaceStore';
import type { MRGameState, MRDirection } from '../../types/mazeRace';
import { getProfile } from '../../lib/database';
import { supabase } from '../../lib/supabase';

const COLS = 19;
const ROWS = 21;
const CELL = 24;
const W = COLS * CELL;
const H = ROWS * CELL;
const P_RADIUS = 9;

const P1_EXIT = { x: 17, y: 19 };
const P2_EXIT = { x: 1, y: 1 };

const C_BG = '#12122A';
const C_PATH = '#1a1a38';
const C_WALL_A = '#1a3a4a';
const C_WALL_B = '#0d2233';
const C_P1_A = '#FF9FC8';
const C_P1_B = '#FF6BA8';
const C_P2_A = '#9EFFDF';
const C_P2_B = '#00D9FF';

const FALLBACK_PROD_SERVER_URL = 'https://duel-fast.onrender.com';
const SERVER_URL = import.meta.env.VITE_SERVER_URL
  || (import.meta.env.DEV ? 'http://localhost:3001' : FALLBACK_PROD_SERVER_URL);

const DIRECTION_ARROW_ICON = '/icons/arrow.png';
const ARROW_ICON_PX = 56;
/** Base asset points right; rotate for each control. */
const ARROW_ROTATE: Record<MRDirection, string> = {
  right: 'rotate(0deg)',
  left: 'rotate(180deg)',
  up: 'rotate(270deg)',
  down: 'rotate(90deg)',
};

function drawMaze(ctx: CanvasRenderingContext2D, maze: number[][]) {
  ctx.fillStyle = C_BG;
  ctx.fillRect(0, 0, W, H);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (maze[row]?.[col] !== 1) {
        const px = col * CELL;
        const py = row * CELL;
        ctx.fillStyle = C_PATH;
        ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
        continue;
      }
      const px = col * CELL;
      const py = row * CELL;
      const grad = ctx.createLinearGradient(px, py, px + CELL, py + CELL);
      grad.addColorStop(0, C_WALL_A);
      grad.addColorStop(1, C_WALL_B);
      ctx.fillStyle = grad;
      ctx.fillRect(px, py, CELL, CELL);

      const neighbors = {
        top: row > 0 && maze[row - 1]?.[col] !== 1,
        bottom: row < ROWS - 1 && maze[row + 1]?.[col] !== 1,
        left: col > 0 && maze[row]?.[col - 1] !== 1,
        right: col < COLS - 1 && maze[row]?.[col + 1] !== 1,
      };
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(78,255,196,0.35)';
      ctx.beginPath();
      if (neighbors.top) { ctx.moveTo(px, py); ctx.lineTo(px + CELL, py); }
      if (neighbors.bottom) { ctx.moveTo(px, py + CELL); ctx.lineTo(px + CELL, py + CELL); }
      if (neighbors.left) { ctx.moveTo(px, py); ctx.lineTo(px, py + CELL); }
      if (neighbors.right) { ctx.moveTo(px + CELL, py); ctx.lineTo(px + CELL, py + CELL); }
      ctx.stroke();
    }
  }
}

/** Pulsing Lemon Pop marker + label for the local player's goal */
function drawMyExitMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pulse: number,
) {
  const cx = x * CELL + CELL / 2;
  const cy = y * CELL + CELL / 2;
  const r = CELL * 0.32 + pulse * 4;
  ctx.save();
  ctx.shadowBlur = 16 + pulse * 10;
  ctx.shadowColor = 'rgba(255,230,109,0.95)';
  ctx.fillStyle = '#FFE66D';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = 'bold 8px system-ui, sans-serif';
  ctx.fillStyle = '#FFE66D';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText('YOUR EXIT', cx, cy + r + 10);
  ctx.shadowBlur = 0;
  ctx.restore();
}

/** Opponent goal — distinct colour so both exits are obvious */
function drawTheirExitMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pulse: number,
) {
  const cx = x * CELL + CELL / 2;
  const cy = y * CELL + CELL / 2;
  const r = CELL * 0.28 + pulse * 3;
  ctx.save();
  ctx.shadowBlur = 12 + pulse * 8;
  ctx.shadowColor = 'rgba(181,101,255,0.85)';
  ctx.fillStyle = '#B565FF';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = 'bold 8px system-ui, sans-serif';
  ctx.fillStyle = '#E8D4FF';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText('THEIR EXIT', cx, cy + r + 10);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  isMe: boolean,
) {
  const cx = px * CELL + CELL / 2;
  const cy = py * CELL + CELL / 2;
  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = isMe ? 'rgba(255,107,168,0.8)' : 'rgba(0,217,255,0.8)';
  const grad = ctx.createRadialGradient(
    cx - P_RADIUS * 0.35,
    cy - P_RADIUS * 0.35,
    0,
    cx,
    cy,
    P_RADIUS,
  );
  if (isMe) {
    grad.addColorStop(0, C_P1_A);
    grad.addColorStop(1, C_P1_B);
  } else {
    grad.addColorStop(0, C_P2_A);
    grad.addColorStop(1, C_P2_B);
  }
  ctx.beginPath();
  ctx.arc(cx, cy, P_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

export function MazeRaceBoard() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const store = useMazeRaceStore();
  const { user } = useAuthStore();
  const socketRef = useRef(connectSocket());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const stateRef = useRef<MRGameState | null>(null);

  const [elapsed, setElapsed] = useState(0);
  const [showExit, setShowExit] = useState(false);
  const [disconnected, setDisconnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [pressedDir, setPressedDir] = useState<MRDirection | null>(null);

  const myId = store.myUserId;
  const game = store.gameState;
  const keepaliveFailureLoggedRef = useRef(false);

  const finalizeMazeRaceInSupabase = useCallback(async (payload: {
    winner?: string;
    forfeit?: boolean;
  }) => {
    if (!supabase) return;
    if (!matchId) return;
    const winnerUserId = payload?.winner;
    if (!winnerUserId) return;
    const status = payload?.forfeit ? 'abandoned' : 'finished';
    try {
      const { data: gameRow, error } = await supabase
        .from('games')
        .select('id, player1_id, player2_id')
        .eq('match_id', matchId)
        .eq('game_type', 'maze_race')
        .is('winner', null)
        .maybeSingle();
      if (error) {
        console.error('[MazeRaceBoard] failed to load active games row:', error.message);
        return;
      }
      if (!gameRow) return;
      const winnerRole =
        gameRow.player1_id === winnerUserId
          ? 'player1'
          : gameRow.player2_id === winnerUserId
            ? 'player2'
            : null;
      const { error: updateError } = await supabase
        .from('games')
        .update({
          winner: winnerRole ?? winnerUserId,
          status,
          current_turn: null,
        })
        .eq('id', gameRow.id);
      if (updateError) {
        console.error('[MazeRaceBoard] failed to update games row:', updateError.message);
      }
    } catch (err) {
      console.error('[MazeRaceBoard] finalizeMazeRaceInSupabase threw:', err);
    }
  }, [matchId]);

  stateRef.current = store.gameState;

  useEffect(() => {
    if (!matchId || myId) return;
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data: profile } = await getProfile(user.id);
      if (cancelled) return;
      useMazeRaceStore.getState().setIdentity(user.id, profile?.name ?? user.id);
    })();
    return () => { cancelled = true; };
  }, [matchId, myId, user?.id]);

  useEffect(() => {
    if (!matchId) {
      navigate('/play');
      return;
    }
    if (!myId) return;

    const socket = socketRef.current;
    const rejoin = () => {
      if (useMazeRaceStore.getState().gameOverPayload) return;
      socket.emit('mr_join', { gameId: matchId, userId: myId });
    };

    const handleConnect = () => {
      setReconnecting(false);
      rejoin();
    };

    const handleDisconnect = () => {
      if (useMazeRaceStore.getState().gameOverPayload) return;
      setReconnecting(true);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    rejoin();

    socket.on('mr_tick', (payload: { player1: { x: number; y: number }; player2: { x: number; y: number } }) => {
      useMazeRaceStore.getState().mergeTickPositions(payload.player1, payload.player2);
    });

    socket.on('mr_game_started', ({ gameState: gs }: { gameState: MRGameState }) => {
      useMazeRaceStore.getState().setGameState(gs);
    });

    socket.on('mr_game_over', (payload: {
      winner: string;
      finalState: MRGameState;
      forfeit?: boolean;
    }) => {
      useMazeRaceStore.getState().setGameOver({
        winner: payload.winner,
        finalState: payload.finalState,
        forfeit: payload.forfeit,
      });
      setReconnecting(false);
      void finalizeMazeRaceInSupabase(payload);
      navigate(`/mazerace/${matchId}/result`);
    });

    socket.on('mr_opponent_disconnected', () => setDisconnected(true));
    socket.on('mr_opponent_reconnected', () => setDisconnected(false));

    socket.on('mr_error', ({ message }: { message: string }) => {
      useMazeRaceStore.getState().setError(message);
      setTimeout(() => useMazeRaceStore.getState().setError(null), 4000);
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('mr_tick');
      socket.off('mr_game_started');
      socket.off('mr_game_over');
      socket.off('mr_opponent_disconnected');
      socket.off('mr_opponent_reconnected');
      socket.off('mr_error');
    };
  }, [matchId, myId, navigate, finalizeMazeRaceInSupabase]); // eslint-disable-line react-hooks/exhaustive-deps -- socket wiring once per match

  useEffect(() => {
    if (!matchId) return;
    const url = `${SERVER_URL}/health`;
    const id = window.setInterval(() => {
      void fetch(url, { method: 'GET', cache: 'no-store' })
        .then(() => { keepaliveFailureLoggedRef.current = false; })
        .catch(() => {
          if (!keepaliveFailureLoggedRef.current) {
            keepaliveFailureLoggedRef.current = true;
            console.warn('[MazeRaceBoard] keepalive /health failed (will retry)');
          }
        });
    }, 30_000);
    return () => window.clearInterval(id);
  }, [matchId]);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const sendMove = useCallback((dir: MRDirection) => {
    if (!matchId || !myId) return;
    if (!stateRef.current || stateRef.current.phase !== 'playing') return;
    socketRef.current.emit('mr_move', { gameId: matchId, userId: myId, direction: dir });
  }, [matchId, myId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, MRDirection> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        s: 'down',
        a: 'left',
        d: 'right',
        W: 'up',
        S: 'down',
        A: 'left',
        D: 'right',
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        sendMove(dir);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sendMove]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    let startTime = performance.now();
    function render(now: number) {
      rafRef.current = requestAnimationFrame(render);
      const g = stateRef.current;
      const t = (now - startTime) / 1000;
      const pulse = (Math.sin(t * 3) + 1) / 2;
      if (!g?.maze) {
        ctx.fillStyle = C_BG;
        ctx.fillRect(0, 0, W, H);
        return;
      }
      drawMaze(ctx, g.maze);
      const isP1Local = g.player1.userId === myId;
      const myExit = isP1Local ? P1_EXIT : P2_EXIT;
      const theirExit = isP1Local ? P2_EXIT : P1_EXIT;
      drawMyExitMarker(ctx, myExit.x, myExit.y, pulse);
      drawTheirExitMarker(ctx, theirExit.x, theirExit.y, pulse);

      const isP1 = isP1Local;
      const me = isP1 ? g.player1 : g.player2;
      const opp = isP1 ? g.player2 : g.player1;
      if (opp.x >= 0 && opp.y >= 0) drawPlayer(ctx, opp.x, opp.y, false);
      if (me.x >= 0 && me.y >= 0) drawPlayer(ctx, me.x, me.y, true);
    }
    startTime = performance.now();
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [myId]);

  const elapsedStr = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  const handleForfeit = () => {
    if (!matchId || !myId) return;
    socketRef.current.emit('mr_forfeit', { gameId: matchId, userId: myId });
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center bg-[#12122A] overflow-hidden select-none"
    >
      <div className="w-full max-w-[456px] flex flex-col gap-0">
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ borderBottom: '2px solid rgba(78,255,196,0.15)' }}
        >
          <div className="flex items-center gap-2">
            <span className="font-body text-ui-body">⏱️</span>
            <span
              className="font-mono font-bold text-ui-title"
              style={{ color: '#FFE66D', letterSpacing: 1 }}
            >
              {elapsedStr}
            </span>
          </div>
          <div className="font-display font-extrabold text-lg text-white/80">MAZE RACE</div>
          <button
            type="button"
            onClick={() => setShowExit(true)}
            className="font-body text-ui-caption text-white/30 hover:text-white/60 transition-colors"
          >
            Exit
          </button>
        </div>
      </div>

      <div className="relative flex-shrink-0" style={{ width: W, height: H }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', imageRendering: 'pixelated' }}
        />
        <AnimatePresence>
          {reconnecting && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(18,18,42,0.82)', backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-center px-6">
                <div className="mx-auto w-10 h-10 rounded-full border-2 border-white/10 border-t-[#FFE66D] animate-spin" />
                <p className="font-display font-bold text-white text-lg mt-3">Reconnecting…</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {!reconnecting && !disconnected && !game?.maze && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(18,18,42,0.85)', backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-center px-6">
                <div className="mx-auto w-10 h-10 rounded-full border-2 border-white/10 border-t-[#4EFFC4] animate-spin" />
                <p className="font-display font-bold text-white text-lg mt-3">Waiting for maze…</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {disconnected && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(18,18,42,0.8)', backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-center px-6">
                <p className="font-display font-bold text-white text-lg">Opponent disconnected</p>
                <p className="font-body text-white/70 text-ui-body mt-1">Waiting 30 s…</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {store.errorMessage && (
            <motion.div
              className="absolute top-2 left-2 right-2 px-3 py-2 rounded-xl text-center font-body text-ui-body text-white"
              style={{ background: 'rgba(255,61,113,0.9)', border: '2px solid #FF3D71' }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {store.errorMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        className="w-full max-w-[456px] px-4 py-3 flex flex-col items-center justify-center"
        style={{ borderTop: '2px solid rgba(78,255,196,0.1)' }}
      >
        <div
          className="grid place-items-center"
          style={{
            gridTemplateColumns: `${ARROW_ICON_PX}px ${ARROW_ICON_PX}px ${ARROW_ICON_PX}px`,
            gridTemplateRows: `${ARROW_ICON_PX}px ${ARROW_ICON_PX}px ${ARROW_ICON_PX}px`,
            columnGap: 18,
            rowGap: 12,
          }}
        >
          {(['up', 'left', 'right', 'down'] as const).map((dir) => {
            const d = dir;
            const isPressed = pressedDir === d;
            const gridPos =
              d === 'up'
                ? { gridColumn: 2, gridRow: 1 }
                : d === 'left'
                  ? { gridColumn: 1, gridRow: 2 }
                  : d === 'right'
                    ? { gridColumn: 3, gridRow: 2 }
                    : { gridColumn: 2, gridRow: 3 };
            return (
              <div key={dir} style={gridPos}>
                <button
                  type="button"
                  aria-label={`Move ${dir}`}
                  className="flex items-center justify-center select-none outline-none focus:outline-none"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    boxShadow: 'none',
                    width: ARROW_ICON_PX,
                    height: ARROW_ICON_PX,
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  onPointerDown={() => {
                    setPressedDir(d);
                    sendMove(d);
                  }}
                  onPointerUp={() => setPressedDir(null)}
                  onPointerCancel={() => setPressedDir(null)}
                  onPointerLeave={() => setPressedDir(null)}
                >
                  <img
                    src={DIRECTION_ARROW_ICON}
                    alt=""
                    width={ARROW_ICON_PX}
                    height={ARROW_ICON_PX}
                    draggable={false}
                    className="pointer-events-none block"
                    style={{
                      transform: ARROW_ROTATE[d],
                      opacity: isPressed ? 0.65 : 1,
                      transition: 'opacity 100ms ease',
                    }}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {showExit && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-xs rounded-2xl p-6 text-center"
              style={{ background: '#1a0a2e', border: '4px solid #FF3D71', boxShadow: '8px 8px 0 #FF3D71' }}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              <p className="font-display font-bold text-white text-xl mb-2">Leave game?</p>
              <p className="font-body text-white/70 text-ui-body mb-6">
                Leaving forfeits the match. Your opponent wins.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowExit(false)}
                  className="flex-1 py-3 rounded-xl font-display font-bold text-white/70"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)' }}
                >
                  Stay
                </button>
                <button
                  type="button"
                  onClick={handleForfeit}
                  className="flex-1 py-3 rounded-xl font-display font-bold text-white"
                  style={{ background: '#FF3D71', border: '2px solid black' }}
                >
                  Leave
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
