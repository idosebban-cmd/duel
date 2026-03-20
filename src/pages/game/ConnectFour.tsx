/**
 * ConnectFour – 7×6 strategy game for Duel
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useOnboardingStore } from '../../store/onboardingStore';
import { characterImages } from '../../utils/assetMaps';
import { useMultiplayerGame } from '../../lib/useMultiplayerGame';
import { usePostGameRedirect } from '../../lib/usePostGameRedirect';

// ── Multiplayer board helpers ─────────────────────────────────────────────────
// DB stores numbers: 0=empty, 1=player1, 2=player2
type DbBoard = number[][];
const makeDbBoard = (): DbBoard =>
  Array.from({ length: COLS }, () => Array(ROWS).fill(0));
function dbBoardToLocal(db: DbBoard, role: 'player1' | 'player2'): Board {
  const mine = role === 'player1' ? 1 : 2;
  return db.map(col => col.map(v => v === 0 ? null : v === mine ? 'player' : 'bot'));
}
function localBoardToDb(board: Board, role: 'player1' | 'player2'): DbBoard {
  const mine = role === 'player1' ? 1 : 2;
  const theirs = role === 'player1' ? 2 : 1;
  return board.map(col => col.map(v => v === null ? 0 : v === 'player' ? mine : theirs));
}
function boardMoveCount(db: DbBoard): number {
  return db.reduce((sum, col) => sum + col.filter(v => v !== 0).length, 0);
}
interface CF4State { board: DbBoard; moveCount: number; }

// ── Constants ────────────────────────────────────────────────────────────────
const COLS    = 7;
const ROWS    = 6;
const CELL    = 50;              // px per cell
const GAP     = 3;               // disc inset from cell edge
const DISC    = CELL - GAP * 2; // 44px disc diameter
const BOARD_W = COLS * CELL;    // 350px
const BOARD_H = ROWS * CELL;    // 300px
const BOT_CHAR = 'dragon';

// ── Types ────────────────────────────────────────────────────────────────────
type Player = 'player' | 'bot';
type Cell   = Player | null;
type Phase  = 'setup' | 'playing' | 'result';
type Board  = Cell[][];  // board[col][row], row 0 = top

interface PlacedDisc {
  id: string;
  col: number;
  row: number;
  player: Player;
}

// ── Pure board logic ─────────────────────────────────────────────────────────
const makeBoard = (): Board =>
  Array.from({ length: COLS }, () => Array(ROWS).fill(null) as Cell[]);

function getDropRow(board: Board, col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) if (board[col][r] === null) return r;
  return -1;
}

function applyDrop(board: Board, col: number, row: number, player: Player): Board {
  return board.map((c, ci) =>
    ci === col ? c.map((cell, ri) => (ri === row ? player : cell)) : [...c]
  );
}

function checkWin(board: Board, player: Player): [number, number][] | null {
  const get = (c: number, r: number): Cell =>
    c >= 0 && c < COLS && r >= 0 && r < ROWS ? board[c][r] : null;
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (board[c][r] !== player) continue;
      for (const [dc, dr] of [[1,0],[0,1],[1,1],[1,-1]] as [number,number][]) {
        const cells: [number,number][] = [[c, r]];
        for (let k = 1; k < 4; k++) {
          if (get(c + dc*k, r + dr*k) !== player) break;
          cells.push([c + dc*k, r + dr*k]);
        }
        if (cells.length === 4) return cells;
      }
    }
  }
  return null;
}

const isBoardFull = (board: Board): boolean =>
  board.every(col => col[0] !== null);

// ── Bot AI (medium) ──────────────────────────────────────────────────────────
function getBotCol(board: Board): number {
  const valid = Array.from({ length: COLS }, (_, i) => i)
    .filter(c => getDropRow(board, c) !== -1);
  if (!valid.length) return -1;

  // 1. Win if possible
  for (const c of valid) {
    const r = getDropRow(board, c);
    if (checkWin(applyDrop(board, c, r, 'bot'), 'bot')) return c;
  }
  // 2. Block player win
  for (const c of valid) {
    const r = getDropRow(board, c);
    if (checkWin(applyDrop(board, c, r, 'player'), 'player')) return c;
  }
  // 3. Center preference + noise
  return valid
    .map(c => ({ c, score: (3 - Math.abs(c - 3)) * 2 + Math.random() }))
    .sort((a, b) => b.score - a.score)[0].c;
}

// ── Setup screen ─────────────────────────────────────────────────────────────
function SetupScreen({ playerChar, onDone }: { playerChar: string; onDone: () => void }) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    const ts = [
      setTimeout(() => setCount(2), 1000),
      setTimeout(() => setCount(1), 2000),
      setTimeout(() => setCount(0), 3000),
      setTimeout(onDone, 3900),
    ];
    return () => ts.forEach(clearTimeout);
  }, [onDone]);

  const labels = ['DROP!', '3', '2', '1'];
  const colors = ['#4EFFC4', '#FF3D71', '#FF9F1C', '#FFE66D'];

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-8"
      style={{ background: '#0A1628', zIndex: 60 }}>
      <div className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,1) 3px,rgba(255,255,255,1) 4px)' }} />

      {/* Avatars */}
      <div className="flex items-center gap-12">
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full overflow-hidden border-4"
            style={{ borderColor: '#4EFFC4', background: '#0E0E22', boxShadow: '0 0 24px rgba(78,255,196,0.5)' }}>
            <img src={characterImages[playerChar] ?? '/characters/Ghost.png'} alt="" className="w-full h-full object-contain p-1" draggable={false} />
          </div>
          <span className="font-display text-sm" style={{ color: '#4EFFC4' }}>YOU</span>
        </div>

        <span className="font-display text-3xl" style={{ color: 'rgba(255,255,255,0.3)' }}>VS</span>

        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full overflow-hidden border-4"
            style={{ borderColor: '#FF3D71', background: '#0E0E22', boxShadow: '0 0 24px rgba(255,61,113,0.5)' }}>
            <img src={characterImages[BOT_CHAR]} alt="" className="w-full h-full object-contain p-1" draggable={false} />
          </div>
          <span className="font-display text-sm" style={{ color: '#FF3D71' }}>THEM</span>
        </div>
      </div>

      {/* Title */}
      <div className="text-center">
        <h1 className="font-display text-4xl mb-2"
          style={{ color: '#FFE66D', textShadow: '0 0 20px rgba(255,230,109,0.7), 4px 4px 0 rgba(0,0,0,0.5)' }}>
          GET READY
        </h1>
        <p className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Connect 4 to win!
        </p>
        <p className="font-body text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
          YOU'RE CYAN &bull; THEY'RE PINK
        </p>
      </div>

      {/* Countdown */}
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1,   opacity: 1 }}
          exit={{    scale: 1.6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="font-display"
          style={{ fontSize: 96, lineHeight: 1, color: colors[count], textShadow: `0 0 40px ${colors[count]}` }}>
          {labels[count]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Result screen ─────────────────────────────────────────────────────────────
function ResultScreen({ result, moves, onRematch, onBack, onChat }: {
  result: 'player_wins' | 'bot_wins' | 'draw';
  moves: number;
  onRematch: () => void;
  onBack: () => void;
  onChat: () => void;
}) {
  const won  = result === 'player_wins';
  const draw = result === 'draw';
  const color  = draw ? '#FFE66D' : won ? '#4EFFC4' : '#FF3D71';
  const shadow = draw ? 'rgba(255,230,109,0.2)' : won ? 'rgba(78,255,196,0.25)' : 'rgba(255,61,113,0.2)';

  return (
    <motion.div className="fixed inset-0 flex flex-col items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.92)', zIndex: 60 }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="w-full max-w-sm rounded-3xl px-6 py-8 text-center"
        style={{ background: 'linear-gradient(175deg,#1C1C3E,#12122A)', border: '2px solid rgba(255,255,255,0.1)', boxShadow: `0 0 60px ${shadow}` }}
        initial={{ scale: 0.7, y: 40 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}>

        <motion.div className="font-display text-5xl mb-1"
          style={{ color, textShadow: `0 0 30px ${color}` }}
          animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 1.8, repeat: Infinity }}>
          {draw ? "IT'S A DRAW!" : won ? 'YOU WIN!' : 'THEY WIN!'}
        </motion.div>
        <p className="font-body text-sm mb-6" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {draw ? 'Board full – no winner' : won ? '4 in a Row Champion' : 'Close game!'}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: 'Moves',  value: moves.toString() },
            { label: 'Result', value: draw ? 'Draw' : won ? 'Win' : 'Loss' },
          ].map(s => (
            <div key={s.label} className="rounded-xl py-3"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="font-display text-xl" style={{ color: '#FFE66D' }}>{s.value}</div>
              <div className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <motion.button onClick={onChat} className="w-full py-4 rounded-2xl font-display text-xl mb-3"
          style={{ background: 'linear-gradient(135deg,#00F5FF,#FF006E)', color: '#12122A', border: '3px solid rgba(255,255,255,0.2)', boxShadow: '0 0 28px rgba(0,245,255,0.45),4px 4px 0 rgba(0,0,0,0.35)' }}
          whileTap={{ scale: 0.97 }}>
          START CHATTING →
        </motion.button>
        <motion.button onClick={onRematch} className="w-full py-3 rounded-2xl font-display text-base mb-2"
          style={{ background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
          whileTap={{ scale: 0.97 }}>
          REMATCH ↺
        </motion.button>
        <button onClick={onBack} className="font-body text-sm w-full py-2"
          style={{ color: 'rgba(255,255,255,0.3)' }}>
          Back to Games
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ConnectFour() {
  const navigate   = useNavigate();
  const params     = useParams<{ matchId?: string }>();
  const { character } = useOnboardingStore();
  const playerChar = character ?? 'ghost';

  // matchId from route param or localStorage (set by GamePicker)
  const matchId = params.matchId ?? localStorage.getItem('pending_match_id') ?? null;
  const matchIdLooksMultiplayer = !!matchId && matchId !== 'demo';

  const mp = useMultiplayerGame<CF4State>({
    matchId: matchId ?? '',
    gameType: 'connect_four',
    initialState: { board: makeDbBoard(), moveCount: 0 },
    enabled: matchIdLooksMultiplayer,
  });
  // If the match wasn't found in DB (fake/seed profile), fall back to bot mode
  const isMultiplayer = matchIdLooksMultiplayer && !mp.fallbackToBotMode;
  const myRole = mp.myRole;

  const [phase,      setPhase]      = useState<Phase>('setup');
  usePostGameRedirect({ isMultiplayer, matchId, phase });
  const [board,      setBoard]      = useState<Board>(makeBoard);
  const [discs,      setDiscs]      = useState<PlacedDisc[]>([]);
  const [turn,       setTurn]       = useState<Player>('player');
  const [winCells,   setWinCells]   = useState<[number,number][] | null>(null);
  const [moveCount,  setMoveCount]  = useState(0);
  const [result,     setResult]     = useState<'player_wins' | 'bot_wins' | 'draw' | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [shakeCol,   setShakeCol]   = useState<number | null>(null);

  // Refs for async-safe access
  const boardRef  = useRef(board);
  const discIdRef = useRef(0);
  boardRef.current = board;

  // ── Drop executor (ref-only, safe in async) ──────────────────────────────
  const executeDrop = useCallback((col: number, player: Player): 'ok' | 'end' => {
    const currentBoard = boardRef.current;
    const row = getDropRow(currentBoard, col);
    if (row === -1) return 'end';

    const id       = `d${discIdRef.current++}`;
    const newBoard = applyDrop(currentBoard, col, row, player);
    boardRef.current = newBoard;  // update ref immediately for async safety

    setDiscs(ds => [...ds, { id, col, row, player }]);
    setBoard(newBoard);
    setMoveCount(m => m + 1);

    const win = checkWin(newBoard, player);
    if (win) {
      setWinCells(win);
      setTimeout(() => {
        setResult(player === 'player' ? 'player_wins' : 'bot_wins');
        setPhase('result');
      }, 700);
      return 'end';
    }
    if (isBoardFull(newBoard)) {
      setTimeout(() => { setResult('draw'); setPhase('result'); }, 400);
      return 'end';
    }
    return 'ok';
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Player tap handler ────────────────────────────────────────────────────
  const handleColumnTap = (col: number) => {
    if (turn !== 'player' || phase !== 'playing' || winCells) return;
    if (isMultiplayer && !mp.isMyTurn) return;
    if (getDropRow(boardRef.current, col) === -1) {
      setShakeCol(col);
      setTimeout(() => setShakeCol(null), 450);
      return;
    }
    const outcome = executeDrop(col, 'player');
    // After executeDrop, boardRef.current holds the new board
    if (isMultiplayer) {
      const dbBoard = localBoardToDb(boardRef.current, myRole);
      const mc = boardMoveCount(dbBoard);
      let winner: string | null = null;
      if (outcome === 'end') {
        if (checkWin(boardRef.current, 'player')) winner = myRole;
        else if (isBoardFull(boardRef.current)) winner = 'draw';
      }
      mp.submitMove({ column: col }, { board: dbBoard, moveCount: mc }, winner);
      setTurn('bot'); // show "waiting" UI; actual bot AI is gated below
      return;
    }
    if (outcome === 'ok') setTurn('bot');
  };

  // ── Bot turn (solo only) ──────────────────────────────────────────────────
  useEffect(() => {
    if (turn !== 'bot' || phase !== 'playing' || winCells || isMultiplayer) return;
    const delay = 2000 + Math.random() * 1000;
    const timer = setTimeout(() => {
      const col = getBotCol(boardRef.current);
      if (col === -1) { setResult('player_wins'); setPhase('result'); return; }
      const outcome = executeDrop(col, 'bot');
      if (outcome === 'ok') setTurn('player');
    }, delay);
    return () => clearTimeout(timer);
  }, [turn, phase, winCells, executeDrop, isMultiplayer]);

  // ── Multiplayer: sync state from DB ──────────────────────────────────────
  const prevUpdatedAtRef = useRef<string | undefined>(undefined);
  // Load initial state once game row arrives
  useEffect(() => {
    if (!isMultiplayer || mp.loading || !mp.gameState) return;
    const db = mp.gameState.board;
    const local = dbBoardToLocal(db, myRole);
    boardRef.current = local;
    setBoard(local);
    const rebuiltDiscs: PlacedDisc[] = [];
    local.forEach((col, c) =>
      col.forEach((cell, r) => {
        if (cell) rebuiltDiscs.push({ id: `mp-${c}-${r}`, col: c, row: r, player: cell });
      }),
    );
    setDiscs(rebuiltDiscs);
    setMoveCount(mp.gameState.moveCount);
    setTurn(mp.isMyTurn ? 'player' : 'bot');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mp.loading]);

  // React to DB state changes (opponent moved or game ended)
  useEffect(() => {
    if (!isMultiplayer || !mp.gameRow || !mp.gameState) return;
    if (mp.gameRow.updated_at === prevUpdatedAtRef.current) return;
    prevUpdatedAtRef.current = mp.gameRow.updated_at;

    // Game ended (winner set by opponent or by me)
    if (mp.gameRow.winner && phase !== 'result') {
      const iWon = mp.gameRow.winner === myRole || mp.gameRow.winner === 'draw';
      setResult(
        mp.gameRow.winner === 'draw' ? 'draw'
          : mp.gameRow.winner === myRole ? 'player_wins'
          : 'bot_wins',
      );
      if (mp.gameRow.winner !== 'draw' && !iWon) {
        // need to show their winning disc first; slight delay
      }
      setPhase('result');
      return;
    }

    // It's now my turn → opponent just moved, apply their disc
    if (mp.isMyTurn && phase === 'playing') {
      const dbBoard = mp.gameState.board;
      const localBoard = boardRef.current;
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          if (dbBoard[c][r] !== 0 && localBoard[c][r] === null) {
            const outcome = executeDrop(c, 'bot');
            if (outcome === 'ok') setTurn('player');
            return;
          }
        }
      }
      // If no diff found (e.g. initial load), just set turn
      setTurn('player');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mp.gameRow?.updated_at, mp.isMyTurn]);

  // ── Rematch ───────────────────────────────────────────────────────────────
  const handleRematch = () => {
    const fresh = makeBoard();
    boardRef.current = fresh;
    setBoard(fresh);
    setDiscs([]);
    setTurn('player');
    setWinCells(null);
    setMoveCount(0);
    setResult(null);
    setHoveredCol(null);
    setShakeCol(null);
    setPhase('setup');
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const winCellSet = new Set((winCells ?? []).map(([c, r]) => `${c},${r}`));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#0A1628' }}>
      {/* Scanlines */}
      <div className="fixed inset-0 pointer-events-none z-40 opacity-[0.02]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,1) 3px,rgba(255,255,255,1) 4px)' }} />

      {/* Setup overlay */}
      <AnimatePresence>
        {phase === 'setup' && (
          <SetupScreen playerChar={playerChar} onDone={() => setPhase('playing')} />
        )}
      </AnimatePresence>

      {/* Result overlay */}
      <AnimatePresence>
        {phase === 'result' && result && (
          <ResultScreen
            result={result}
            moves={moveCount}
            onRematch={handleRematch}
            onBack={() => navigate('/play')}
            onChat={() => {
              if (matchId) localStorage.setItem(`first_game_played_${matchId}`, 'true');
              navigate('/chat', matchId ? { state: { matchId } } : undefined);
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex-none px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          {/* Player */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
              style={{ border: '2.5px solid #4EFFC4', background: '#0E0E22', boxShadow: '0 0 12px rgba(78,255,196,0.45)' }}>
              <img src={characterImages[playerChar] ?? '/characters/Ghost.png'} alt="" className="w-full h-full object-contain p-0.5" draggable={false} />
            </div>
            <div>
              <div className="font-body font-bold" style={{ fontSize: 10, color: '#4EFFC4', letterSpacing: 1 }}>YOU</div>
              <div style={{ width: 12, height: 12, borderRadius: '50%', marginTop: 2, background: 'linear-gradient(135deg,#4EFFC4,#00AAFF)', border: '2px solid #1ABCFF', display: 'inline-block' }} />
            </div>
          </div>

          {/* Turn indicator */}
          <div className="flex flex-col items-center gap-1">
            <AnimatePresence mode="wait">
              <motion.div key={turn + phase}
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                className="font-display text-xs"
                style={{ color: turn === 'player' ? '#4EFFC4' : 'rgba(255,255,255,0.3)' }}>
                {phase === 'playing'
              ? turn === 'player' ? 'YOUR TURN' : (isMultiplayer ? 'WAITING…' : 'THEIR TURN')
              : 'CONNECT FOUR'}
              </motion.div>
            </AnimatePresence>
            {turn === 'bot' && phase === 'playing' && (
              <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 1.1, repeat: Infinity }}
                className="font-body" style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                {isMultiplayer ? 'waiting…' : 'thinking…'}
              </motion.div>
            )}
            <div className="font-body" style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
              Move {moveCount}/42
            </div>
          </div>

          {/* Bot */}
          <div className="flex items-center gap-2.5 flex-row-reverse">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
              style={{ border: '2.5px solid #FF3D71', background: '#0E0E22', boxShadow: '0 0 12px rgba(255,61,113,0.45)' }}>
              <img src={characterImages[BOT_CHAR]} alt="" className="w-full h-full object-contain p-0.5" draggable={false} />
            </div>
            <div className="text-right">
              <div className="font-body font-bold" style={{ fontSize: 10, color: '#FF3D71', letterSpacing: 1 }}>THEM</div>
              <div style={{ width: 12, height: 12, borderRadius: '50%', marginTop: 2, background: 'linear-gradient(135deg,#FF3D71,#FF9F1C)', border: '2px solid #CC1F40', display: 'inline-block' }} />
            </div>
          </div>
        </div>
      </header>

      {/* Board area */}
      <div className="flex-1 flex flex-col items-center justify-center" style={{ minHeight: 0 }}>

        {/* Column drop indicators */}
        <div style={{ display: 'flex', width: BOARD_W, marginBottom: 6 }}>
          {Array.from({ length: COLS }, (_, col) => {
            const isFull    = getDropRow(board, col) === -1;
            const isHovered = hoveredCol === col;
            const active    = turn === 'player' && phase === 'playing' && !winCells;
            return (
              <motion.div key={col}
                style={{ width: CELL, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 28 }}
                animate={shakeCol === col ? { x: [-5, 5, -5, 5, 0] } : { x: 0 }}
                transition={{ duration: 0.35 }}>
                {active && (
                  <div style={{
                    width: isHovered ? 22 : 14, height: isHovered ? 22 : 14,
                    borderRadius: '50%',
                    background: isFull
                      ? 'rgba(255,61,113,0.3)'
                      : isHovered ? 'rgba(78,255,196,0.7)' : 'rgba(78,255,196,0.2)',
                    border: `2px solid ${isFull ? '#FF3D71' : '#4EFFC4'}`,
                    transition: 'all 0.15s ease',
                  }} />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Board */}
        <div style={{
          position: 'relative',
          width: BOARD_W, height: BOARD_H,
          background: '#091830',
          border: '4px solid #0A0F1A',
          boxShadow: '0 0 0 2px rgba(78,255,196,0.2), 0 0 50px rgba(0,0,0,0.8)',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          {/* Cell holes */}
          {Array.from({ length: ROWS }, (_, row) =>
            Array.from({ length: COLS }, (_, col) => (
              <div key={`h${col}-${row}`} style={{
                position: 'absolute',
                left: col * CELL + GAP, top: row * CELL + GAP,
                width: DISC, height: DISC,
                borderRadius: '50%',
                background: '#040D1A',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.9)',
              }} />
            ))
          )}

          {/* Placed discs */}
          <AnimatePresence>
            {discs.map(disc => {
              const isWin    = winCellSet.has(`${disc.col},${disc.row}`);
              const isPlayer = disc.player === 'player';
              return (
                <motion.div key={disc.id}
                  style={{
                    position: 'absolute',
                    left: disc.col * CELL + GAP,
                    top:  disc.row * CELL + GAP,
                    width: DISC, height: DISC,
                    borderRadius: '50%',
                    background: isPlayer
                      ? 'linear-gradient(135deg,#4EFFC4 0%,#00AAFF 100%)'
                      : 'linear-gradient(135deg,#FF3D71 0%,#FF9F1C 100%)',
                    border: `3px solid ${isPlayer ? '#1ABCFF' : '#CC1F40'}`,
                    zIndex: isWin ? 3 : 2,
                    overflow: 'hidden',
                  }}
                  initial={{ y: -(disc.row + 1) * CELL - 20 }}
                  animate={{
                    y: 0,
                    boxShadow: isWin
                      ? [
                          '0 0 0 3px #FFE66D, 0 0 16px rgba(255,230,109,0.9)',
                          '0 0 0 5px #FFE66D, 0 0 28px rgba(255,230,109,1)',
                          '0 0 0 3px #FFE66D, 0 0 16px rgba(255,230,109,0.9)',
                        ]
                      : isPlayer
                      ? '0 3px 10px rgba(78,255,196,0.35)'
                      : '0 3px 10px rgba(255,61,113,0.35)',
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={isWin
                    ? {
                        y: { type: 'spring', stiffness: 360, damping: 26, mass: 0.8 },
                        boxShadow: { duration: 0.85, repeat: Infinity, delay: 0.7 },
                      }
                    : { type: 'spring', stiffness: 360, damping: 26, mass: 0.8 }
                  }
                >
                  {/* Glossy highlight */}
                  <div style={{
                    position: 'absolute', top: '10%', left: '16%',
                    width: '38%', height: '32%',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.28)',
                    filter: 'blur(2px)',
                    pointerEvents: 'none',
                  }} />
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Column tap areas (invisible overlay) */}
          {Array.from({ length: COLS }, (_, col) => (
            <div key={`tap-${col}`}
              style={{
                position: 'absolute', left: col * CELL, top: 0,
                width: CELL, height: BOARD_H, zIndex: 10,
                cursor: turn === 'player' && phase === 'playing' && !winCells ? 'pointer' : 'default',
                touchAction: 'manipulation',
              }}
              onClick={() => handleColumnTap(col)}
              onMouseEnter={() => setHoveredCol(col)}
              onMouseLeave={() => setHoveredCol(null)}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-none flex items-center justify-between px-5 py-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(10,15,26,0.9)' }}>
        <button onClick={() => navigate('/play')} className="font-body text-xs"
          style={{ color: 'rgba(255,255,255,0.28)' }}>
          ← Games
        </button>
        <div className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.22)' }}>
          {turn === 'player' && phase === 'playing' && !winCells ? 'Tap a column to drop' : '\u00A0'}
        </div>
        <div className="font-display text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>DUEL</div>
      </div>
    </div>
  );
}
