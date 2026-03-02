import {
  useEffect, useRef, useCallback, useState,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { connectSocket } from '../../lib/socket';
import { useDotDashStore } from '../../store/dotDashStore';
import type { DDGameState, DDPlayer, DDGhost, Direction } from '../../types/dotDash';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const COLS      = 19;
const ROWS      = 21;
const CELL      = 24;          // px per grid cell
const W         = COLS * CELL; // 456
const H         = ROWS * CELL; // 504
const P_RADIUS  = 9;           // player circle radius (px)
const G_RADIUS  = 10;          // ghost radius

// Palette
const C_WALL_A  = '#1a3a4a';   // wall gradient start (dark teal)
const C_WALL_B  = '#0d2233';   // wall gradient end
const C_FLOOR   = '#12122A';   // open cell bg
const C_P1_A    = '#FF9FC8';   // player 1 gradient light
const C_P1_B    = '#FF3D71';   // player 1 gradient dark
const C_P2_A    = '#9EFFDF';   // player 2 gradient light
const C_P2_B    = '#00D9FF';   // player 2 gradient dark

// ─────────────────────────────────────────────────────────────────────────────
// DIRECTION MAP
// ─────────────────────────────────────────────────────────────────────────────
const DIR_ANGLE: Record<Direction, number> = {
  right: 0,
  down:  Math.PI / 2,
  left:  Math.PI,
  up:   -Math.PI / 2,
};

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS DRAWING
// ─────────────────────────────────────────────────────────────────────────────
function drawMaze(ctx: CanvasRenderingContext2D, maze: string[]) {
  // Floor
  ctx.fillStyle = C_FLOOR;
  ctx.fillRect(0, 0, W, H);

  // Walls
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (maze[row]?.[col] !== '#') continue;
      const px = col * CELL;
      const py = row * CELL;

      // Wall block gradient
      const grad = ctx.createLinearGradient(px, py, px + CELL, py + CELL);
      grad.addColorStop(0, C_WALL_A);
      grad.addColorStop(1, C_WALL_B);
      ctx.fillStyle = grad;
      ctx.fillRect(px, py, CELL, CELL);

      // Top-edge highlight (neon glow line)
      const neighbors = {
        top:    row > 0        && maze[row - 1]?.[col] !== '#',
        bottom: row < ROWS - 1 && maze[row + 1]?.[col] !== '#',
        left:   col > 0        && maze[row]?.[col - 1] !== '#',
        right:  col < COLS - 1 && maze[row]?.[col + 1] !== '#',
      };
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(78,255,196,0.35)';
      ctx.beginPath();
      if (neighbors.top)    { ctx.moveTo(px, py);           ctx.lineTo(px + CELL, py); }
      if (neighbors.bottom) { ctx.moveTo(px, py + CELL);    ctx.lineTo(px + CELL, py + CELL); }
      if (neighbors.left)   { ctx.moveTo(px, py);           ctx.lineTo(px, py + CELL); }
      if (neighbors.right)  { ctx.moveTo(px + CELL, py);    ctx.lineTo(px + CELL, py + CELL); }
      ctx.stroke();
    }
  }
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  pulse: number,       // 0–1 animation pulse
) {
  const cx = x * CELL + CELL / 2;
  const cy = y * CELL + CELL / 2;
  const r  = 2.5 + pulse * 0.7;

  ctx.save();
  ctx.shadowBlur  = 6 + pulse * 4;
  ctx.shadowColor = 'rgba(255,255,255,0.9)';
  ctx.fillStyle   = 'white';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer(
  ctx:      CanvasRenderingContext2D,
  player:   DDPlayer,
  isMe:     boolean,
  mouthPct: number,    // 0 = closed, 1 = wide open
  alpha:    number,    // 0–1 for invincibility flashing
) {
  const cx    = player.x * CELL + CELL / 2;
  const cy    = player.y * CELL + CELL / 2;
  const angle = DIR_ANGLE[player.direction] ?? 0;
  const mouth = mouthPct * 0.35 * Math.PI; // max ~63° half-angle

  ctx.save();
  ctx.globalAlpha = alpha;

  // Glow
  ctx.shadowBlur  = 12;
  ctx.shadowColor = isMe ? 'rgba(255,107,168,0.8)' : 'rgba(78,255,196,0.8)';

  // Body gradient
  const grad = ctx.createRadialGradient(cx - P_RADIUS * 0.35, cy - P_RADIUS * 0.35, 0, cx, cy, P_RADIUS);
  if (isMe) {
    grad.addColorStop(0, C_P1_A);
    grad.addColorStop(1, C_P1_B);
  } else {
    grad.addColorStop(0, C_P2_A);
    grad.addColorStop(1, C_P2_B);
  }

  ctx.translate(cx, cy);
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, P_RADIUS, mouth, Math.PI * 2 - mouth);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Black outline
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();

  // Label badge
  ctx.save();
  ctx.font         = 'bold 7px "JetBrains Mono", monospace';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = 'white';
  ctx.globalAlpha  = alpha * 0.85;
  ctx.fillText(isMe ? 'P1' : 'P2', cx, cy - P_RADIUS - 7);
  ctx.restore();
}

function drawGhost(
  ctx:   CanvasRenderingContext2D,
  ghost: DDGhost,
  floatY: number,  // extra y offset for float animation (px)
) {
  const cx = ghost.x * CELL + CELL / 2;
  const cy = ghost.y * CELL + CELL / 2 + floatY;
  const r  = G_RADIUS;

  ctx.save();
  ctx.shadowBlur  = 10;
  ctx.shadowColor = ghost.color;

  // Body path: rounded top + 3 wavy bumps on bottom
  const top  = cy - r - 1;
  const bot  = cy + r + 2;
  const bW   = (r * 2) / 3;   // bump width

  ctx.beginPath();
  ctx.arc(cx, cy - 1, r, Math.PI, 0);          // top semicircle
  ctx.lineTo(cx + r, bot);                       // right edge down
  // Three wavy bumps (right → left)
  ctx.quadraticCurveTo(cx + r - bW * 0.5, bot - 4, cx + r - bW,     bot);
  ctx.quadraticCurveTo(cx + r - bW * 1.5, bot - 4, cx + r - bW * 2, bot);
  ctx.quadraticCurveTo(cx + r - bW * 2.5, bot - 4, cx - r,          bot);
  ctx.lineTo(cx - r, top + r); // left edge up (connects to arc start)
  ctx.closePath();

  ctx.fillStyle   = ghost.color;
  ctx.fill();
  ctx.shadowBlur  = 0;
  ctx.strokeStyle = '#000';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Eyes (white ellipses)
  const eyeOffX = 3.5;
  const eyeOffY = -2;
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.ellipse(cx - eyeOffX, cy + eyeOffY, 2.5, 3.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + eyeOffX, cy + eyeOffY, 2.5, 3.2, 0, 0, Math.PI * 2); ctx.fill();

  // Pupils
  ctx.fillStyle = '#12122A';
  ctx.beginPath(); ctx.ellipse(cx - eyeOffX + 0.7, cy + eyeOffY + 0.5, 1.2, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + eyeOffX + 0.7, cy + eyeOffY + 0.5, 1.2, 1.6, 0, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function DotDashBoard() {
  const { gameId }  = useParams<{ gameId: string }>();
  const navigate    = useNavigate();
  const store       = useDotDashStore();
  const socketRef   = useRef(connectSocket());
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const rafRef      = useRef<number>(0);
  const stateRef    = useRef<DDGameState | null>(null); // latest game state (mutable, avoid re-renders)

  const [elapsed,      setElapsed]      = useState(0);
  const [showExit,     setShowExit]     = useState(false);
  const [disconnected, setDisconnected] = useState(false);

  // Touch swipe tracking
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const myId  = store.myUserId;
  const game  = store.gameState;

  // Sync stateRef on every render (avoids stale closure in rAF loop)
  stateRef.current = store.gameState;

  // ── Socket setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameId || !myId) {
      navigate('/dotdash');
      return;
    }

    const socket = socketRef.current;
    socket.emit('dd_join_lobby', { gameId, userId: myId });

    socket.on('dd_game_tick', ({ gameState }: { gameState: DDGameState }) => {
      store.setGameState(gameState);
    });

    socket.on('dd_game_over', (payload: any) => {
      store.setGameOver(payload);
      navigate(`/dotdash/${gameId}/result`);
    });

    socket.on('dd_opponent_disconnected', () => setDisconnected(true));
    socket.on('dd_opponent_reconnected',  () => setDisconnected(false));

    socket.on('dd_error', ({ message }: { message: string }) => {
      store.setError(message);
      setTimeout(() => store.setError(null), 4000);
    });

    return () => {
      socket.off('dd_game_tick');
      socket.off('dd_game_over');
      socket.off('dd_opponent_disconnected');
      socket.off('dd_opponent_reconnected');
      socket.off('dd_error');
    };
  }, [gameId, myId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Elapsed timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Keyboard controls ────────────────────────────────────────────────────────
  const sendMove = useCallback((dir: Direction) => {
    if (!gameId || !myId) return;
    socketRef.current.emit('dd_move', { gameId, userId: myId, direction: dir });
  }, [gameId, myId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up',  s: 'down',  a: 'left',  d: 'right',
        W: 'up',  S: 'down',  A: 'left',  D: 'right',
      };
      const dir = map[e.key];
      if (dir) { e.preventDefault(); sendMove(dir); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sendMove]);

  // ── Touch / swipe ────────────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return; // ignore tiny swipes
    if (Math.abs(dx) >= Math.abs(dy)) sendMove(dx > 0 ? 'right' : 'left');
    else                               sendMove(dy > 0 ? 'down'  : 'up');
  };

  // ── Canvas render loop (60 fps) ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Hi-DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    let startTime = performance.now();

    function render(now: number) {
      rafRef.current = requestAnimationFrame(render);
      const g = stateRef.current;
      if (!g) {
        ctx.fillStyle = C_FLOOR;
        ctx.fillRect(0, 0, W, H);
        return;
      }

      const t = (now - startTime) / 1000; // seconds elapsed since render start

      // Animation values
      const pulse    = (Math.sin(t * 3) + 1) / 2;              // 0–1 dot pulse
      const mouthPct = (Math.sin(t * Math.PI * 5) + 1) / 2;    // 0–1 chomper

      // Ghost float: each ghost has a slight phase offset
      const ghostFloats = g.ghosts.map((_, i) =>
        Math.sin(t * 2.5 + i * 1.1) * 2
      );

      // Clear + draw maze
      drawMaze(ctx, g.maze);

      // Dots
      for (const dot of g.dots) {
        drawDot(ctx, dot.x, dot.y, pulse);
      }

      // Players
      const isP1 = g.player1.userId === myId;
      const me   = isP1 ? g.player1 : g.player2;
      const opp  = isP1 ? g.player2 : g.player1;

      // Opponent first (drawn below own player)
      const oppAlpha = opp.invincible ? 0.4 + 0.6 * ((Math.sin(t * 12) + 1) / 2) : 1;
      drawPlayer(ctx, opp, !isP1, mouthPct, oppAlpha);

      // Own player
      const meAlpha = me.invincible ? 0.4 + 0.6 * ((Math.sin(t * 12) + 1) / 2) : 1;
      drawPlayer(ctx, me, true, mouthPct, meAlpha);

      // Ghosts
      g.ghosts.forEach((ghost, i) => drawGhost(ctx, ghost, ghostFloats[i]));
    }

    startTime = performance.now();
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived HUD values ──────────────────────────────────────────────────────
  const isP1  = game?.player1.userId === myId;
  const me    = isP1 ? game?.player1 : game?.player2;
  const opp   = isP1 ? game?.player2 : game?.player1;

  const elapsedStr = `${String(Math.floor(elapsed / 60)).padStart(2,'0')}:${String(elapsed % 60).padStart(2,'0')}`;

  // ── Forfeit ─────────────────────────────────────────────────────────────────
  const handleForfeit = () => {
    if (!gameId || !myId) return;
    socketRef.current.emit('dd_forfeit', { gameId, userId: myId });
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center bg-[#12122A] overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── HUD ── */}
      <div className="w-full max-w-[456px] flex flex-col gap-0">

        {/* Top bar: timer + exit */}
        <div className="flex items-center justify-between px-4 py-2"
          style={{ borderBottom: '2px solid rgba(78,255,196,0.15)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">⏱️</span>
            <span className="font-mono font-bold text-lg" style={{ color: '#FFE66D', letterSpacing: 1 }}>
              {elapsedStr}
            </span>
          </div>
          <div className="font-display font-extrabold text-lg text-white/80">DOT DASH</div>
          <button
            onClick={() => setShowExit(true)}
            className="font-body text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Exit
          </button>
        </div>

        {/* Score + lives row */}
        <div className="grid grid-cols-2 px-4 py-2 gap-2"
          style={{ borderBottom: '2px solid rgba(78,255,196,0.1)' }}
        >
          {/* My side */}
          <div className="flex flex-col items-start">
            <span className="font-body text-xs text-white/40 mb-0.5">YOU</span>
            <span className="font-mono font-bold text-2xl" style={{ color: '#FF6BA8' }}>
              {me?.score ?? 0}
            </span>
            <div className="flex gap-0.5 mt-0.5">
              {Array.from({ length: 3 }, (_, i) => (
                <span key={i} style={{ fontSize: 12, opacity: i < (me?.lives ?? 0) ? 1 : 0.2 }}>❤️</span>
              ))}
            </div>
          </div>

          {/* Opponent side */}
          <div className="flex flex-col items-end">
            <span className="font-body text-xs text-white/40 mb-0.5">THEM</span>
            <span className="font-mono font-bold text-2xl" style={{ color: '#4EFFC4' }}>
              {opp?.score ?? 0}
            </span>
            <div className="flex gap-0.5 mt-0.5 justify-end">
              {Array.from({ length: 3 }, (_, i) => (
                <span key={i} style={{ fontSize: 12, opacity: i < (opp?.lives ?? 0) ? 1 : 0.2 }}>❤️</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="relative flex-shrink-0" style={{ width: W, height: H }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', imageRendering: 'pixelated' }}
        />

        {/* Disconnected overlay */}
        <AnimatePresence>
          {disconnected && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(18,18,42,0.8)', backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <div className="text-center px-6">
                <div className="text-3xl mb-2">⚠️</div>
                <p className="font-display font-bold text-white text-lg">Opponent disconnected</p>
                <p className="font-body text-white/50 text-sm mt-1">Waiting 30 s…</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error banner */}
        <AnimatePresence>
          {store.errorMessage && (
            <motion.div
              className="absolute top-2 left-2 right-2 px-3 py-2 rounded-xl text-center font-body text-sm text-white"
              style={{ background: 'rgba(255,61,113,0.9)', border: '2px solid #FF3D71' }}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            >
              {store.errorMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Controls hint ── */}
      <div className="w-full max-w-[456px] px-4 py-2 flex items-center justify-between"
        style={{ borderTop: '2px solid rgba(78,255,196,0.1)' }}
      >
        <p className="font-body text-xs text-white/30">
          Swipe or ← ↑ → ↓ to move
        </p>
        <div className="flex gap-3">
          {(['↑','↓','←','→'] as const).map((arrow) => (
            <button
              key={arrow}
              className="w-8 h-8 rounded-lg font-display font-bold text-sm text-white/60 flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.12)' }}
              onPointerDown={() => {
                const map = { '↑':'up','↓':'down','←':'left','→':'right' } as const;
                sendMove(map[arrow]);
              }}
            >
              {arrow}
            </button>
          ))}
        </div>
      </div>

      {/* ── Exit confirmation ── */}
      <AnimatePresence>
        {showExit && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-xs rounded-2xl p-6 text-center"
              style={{ background: '#1a0a2e', border: '4px solid #FF3D71', boxShadow: '8px 8px 0 #FF3D71' }}
              initial={{ scale: 0.9 }} animate={{ scale: 1 }}
            >
              <p className="font-display font-bold text-white text-xl mb-2">Leave game?</p>
              <p className="font-body text-white/50 text-sm mb-6">
                Leaving forfeits the match. Your opponent wins.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExit(false)}
                  className="flex-1 py-3 rounded-xl font-display font-bold text-white/70"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)' }}
                >
                  Stay
                </button>
                <button
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

      {/* Neon bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 h-[3px] pointer-events-none"
        style={{ background: 'linear-gradient(90deg,#FF6BA8,#FFE66D,#4EFFC4,#B565FF,#FF6BA8)', boxShadow: '0 0 14px rgba(78,255,196,0.7)' }}
      />
    </div>
  );
}
