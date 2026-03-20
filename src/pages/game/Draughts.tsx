/**
 * Draughts – classic checkers for Duel
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useOnboardingStore } from '../../store/onboardingStore';
import { characterImages } from '../../utils/assetMaps';
import { useMultiplayerGame } from '../../lib/useMultiplayerGame';

// ── Multiplayer piece serialisation ──────────────────────────────────────────
// DB stores player as 'p1'|'p2'; locally we use 'player'|'bot'
interface DbPiece { id: string; row: number; col: number; player: 'p1'|'p2'; isKing: boolean; }
interface DraughtsState { pieces: DbPiece[]; moveCount: number; }

function piecesToDb(ps: Piece[], role: 'player1'|'player2'): DbPiece[] {
  const mine: 'p1'|'p2' = role === 'player1' ? 'p1' : 'p2';
  const theirs: 'p1'|'p2' = role === 'player1' ? 'p2' : 'p1';
  return ps.map(p => ({ id: p.id, row: p.row, col: p.col, isKing: p.isKing,
    player: p.player === 'player' ? mine : theirs }));
}
function piecesFromDb(db: DbPiece[], role: 'player1'|'player2'): Piece[] {
  const mine: 'p1'|'p2' = role === 'player1' ? 'p1' : 'p2';
  return db.map(p => ({ id: p.id, row: p.row, col: p.col, isKing: p.isKing,
    player: p.player === mine ? 'player' : 'bot' }));
}
function makeInitialDbPieces(role: 'player1'|'player2'): DbPiece[] {
  return piecesToDb(makeInitialPieces(), role);
}

// ── Constants ────────────────────────────────────────────────────────────────
const CELL  = 44;        // px per square
const BOARD = CELL * 8;  // 352px
const BOT_CHAR = 'dragon';

// ── Types ────────────────────────────────────────────────────────────────────
type Player = 'player' | 'bot';
type Phase  = 'setup' | 'playing' | 'result';

interface Piece {
  id: string;
  row: number;
  col: number;
  player: Player;
  isKing: boolean;
}

interface Dest {
  row: number;
  col: number;
  capturedId: string | null;
}

// ── Initial board ────────────────────────────────────────────────────────────
function makeInitialPieces(): Piece[] {
  const pieces: Piece[] = [];
  let id = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        if (row < 3)  pieces.push({ id: `b${id++}`, row, col, player: 'bot',    isKing: false });
        if (row > 4)  pieces.push({ id: `p${id++}`, row, col, player: 'player', isKing: false });
      }
    }
  }
  return pieces;
}

// ── Move logic ───────────────────────────────────────────────────────────────
const getPieceAt = (ps: Piece[], r: number, c: number) =>
  ps.find(p => p.row === r && p.col === c);

function getJumps(ps: Piece[], piece: Piece): Dest[] {
  const dirs: [number, number][] = piece.isKing
    ? [[-1,-1],[-1,1],[1,-1],[1,1]]
    : piece.player === 'player' ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
  const out: Dest[] = [];
  for (const [dr, dc] of dirs) {
    const er = piece.row + dr, ec = piece.col + dc;
    const lr = piece.row + dr * 2, lc = piece.col + dc * 2;
    if (lr < 0 || lr > 7 || lc < 0 || lc > 7) continue;
    const enemy = getPieceAt(ps, er, ec);
    if (enemy && enemy.player !== piece.player && !getPieceAt(ps, lr, lc))
      out.push({ row: lr, col: lc, capturedId: enemy.id });
  }
  return out;
}

function getSimpleMoves(ps: Piece[], piece: Piece): Dest[] {
  const dirs: [number, number][] = piece.isKing
    ? [[-1,-1],[-1,1],[1,-1],[1,1]]
    : piece.player === 'player' ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
  return dirs
    .map(([dr, dc]) => ({ row: piece.row+dr, col: piece.col+dc, capturedId: null }))
    .filter(d => d.row >= 0 && d.row <= 7 && d.col >= 0 && d.col <= 7 && !getPieceAt(ps, d.row, d.col));
}

const hasAnyJump = (ps: Piece[], player: Player) =>
  ps.filter(p => p.player === player).some(p => getJumps(ps, p).length > 0);

function getValidDests(ps: Piece[], piece: Piece, forceCapture: boolean): Dest[] {
  if (forceCapture) return getJumps(ps, piece);
  const jumps = getJumps(ps, piece);
  return jumps.length > 0 ? jumps : getSimpleMoves(ps, piece);
}

function applyMove(ps: Piece[], pieceId: string, dest: Dest): Piece[] {
  let updated = ps.map(p => {
    if (p.id !== pieceId) return p;
    const isKing = p.isKing
      || (p.player === 'player' && dest.row === 0)
      || (p.player === 'bot'    && dest.row === 7);
    return { ...p, row: dest.row, col: dest.col, isKing };
  });
  if (dest.capturedId) updated = updated.filter(p => p.id !== dest.capturedId);
  return updated;
}

// ── Bot AI ───────────────────────────────────────────────────────────────────
function buildCaptureChain(ps: Piece[], pieceId: string, dest: Dest): Array<{pieceId: string; dest: Dest}> {
  const chain: Array<{pieceId: string; dest: Dest}> = [{ pieceId, dest }];
  if (!dest.capturedId) return chain;
  const newPs = applyMove(ps, pieceId, dest);
  const moved = newPs.find(p => p.id === pieceId);
  if (!moved) return chain;
  const nextJumps = getJumps(newPs, moved);
  if (!nextJumps.length) return chain;
  // pick the jump that maximises the chain length
  let best: Array<{pieceId: string; dest: Dest}> = [];
  for (const j of nextJumps) {
    const sub = buildCaptureChain(newPs, pieceId, j);
    if (sub.length > best.length) best = sub;
  }
  return [...chain, ...best];
}

function computeBotMoveChain(ps: Piece[]): Array<{pieceId: string; dest: Dest}> {
  const botPieces = ps.filter(p => p.player === 'bot');
  const mustCapture = hasAnyJump(ps, 'bot');

  if (mustCapture) {
    let bestChain: Array<{pieceId: string; dest: Dest}> = [];
    const allChains: Array<Array<{pieceId: string; dest: Dest}>> = [];
    for (const piece of botPieces) {
      for (const j of getJumps(ps, piece)) {
        const chain = buildCaptureChain(ps, piece.id, j);
        allChains.push(chain);
        if (chain.length > bestChain.length) bestChain = chain;
      }
    }
    // 20% chance: pick a random chain instead of the best
    if (Math.random() < 0.2 && allChains.length > 1) {
      return allChains[Math.floor(Math.random() * allChains.length)];
    }
    return bestChain;
  }

  const options: Array<{pieceId: string; dest: Dest; score: number}> = [];
  for (const piece of botPieces) {
    for (const dest of getSimpleMoves(ps, piece)) {
      let score = dest.row * 0.6;
      if (!piece.isKing && dest.row === 7) score += 12;
      score += (3.5 - Math.abs(dest.col - 3.5)) * 0.15;
      score += Math.random() * 2.5;
      options.push({ pieceId: piece.id, dest, score });
    }
  }
  if (!options.length) return [];
  options.sort((a, b) => b.score - a.score);
  return [{ pieceId: options[0].pieceId, dest: options[0].dest }];
}

// ── Crown icon ───────────────────────────────────────────────────────────────
function CrownIcon() {
  return (
    <svg width="18" height="13" viewBox="0 0 18 13" fill="none" style={{ pointerEvents: 'none' }}>
      <path d="M1 12L2.5 5L6.5 8.5L9 1L11.5 8.5L15.5 5L17 12H1Z"
        fill="#FFE66D" stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Setup screen ─────────────────────────────────────────────────────────────
function SetupScreen({ playerChar, onDone }: { playerChar: string; onDone: () => void }) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    const t1 = setTimeout(() => setCount(2), 1000);
    const t2 = setTimeout(() => setCount(1), 2000);
    const t3 = setTimeout(() => setCount(0), 3000);  // 0 = GO
    const t4 = setTimeout(onDone, 3900);
    return () => [t1,t2,t3,t4].forEach(clearTimeout);
  }, [onDone]);

  const labels  = ['GO!', '3', '2', '1'];
  const colors  = ['#4EFFC4', '#FF3D71', '#FF9F1C', '#FFE66D'];
  const display = labels[count];
  const color   = colors[count];

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-8"
      style={{ background: '#0A1628', zIndex: 60 }}>
      {/* Scanlines */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,1) 3px,rgba(255,255,255,1) 4px)' }} />

      {/* Avatars */}
      <div className="flex items-center gap-12">
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 flex items-center justify-center"
            style={{ borderColor: '#4EFFC4', background: '#0E0E22', boxShadow: '0 0 24px rgba(78,255,196,0.5)' }}>
            <img src={characterImages[playerChar] ?? '/characters/Ghost.png'} alt="" className="w-full h-full object-contain p-1" draggable={false} />
          </div>
          <span className="font-display text-sm" style={{ color: '#4EFFC4' }}>YOU</span>
        </div>

        <span className="font-display text-3xl" style={{ color: 'rgba(255,255,255,0.3)' }}>VS</span>

        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 flex items-center justify-center"
            style={{ borderColor: '#FF3D71', background: '#0E0E22', boxShadow: '0 0 24px rgba(255,61,113,0.5)' }}>
            <img src={characterImages[BOT_CHAR]} alt="" className="w-full h-full object-contain p-1" draggable={false} />
          </div>
          <span className="font-display text-sm" style={{ color: '#FF3D71' }}>THEM</span>
        </div>
      </div>

      {/* Title */}
      <div className="text-center">
        <h1 className="font-display text-4xl mb-2" style={{ color: '#FFE66D', textShadow: '0 0 20px rgba(255,230,109,0.7), 4px 4px 0 rgba(0,0,0,0.5)' }}>
          GET READY
        </h1>
        <p className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Capture all their pieces to win
        </p>
        <p className="font-body text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
          YOU'RE CYAN &bull; THEY'RE RED
        </p>
      </div>

      {/* Countdown number */}
      <AnimatePresence mode="wait">
        <motion.div
          key={display}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1,   opacity: 1 }}
          exit={{    scale: 1.6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="font-display"
          style={{ fontSize: 96, lineHeight: 1, color, textShadow: `0 0 40px ${color}` }}
        >
          {display}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Result screen ────────────────────────────────────────────────────────────
function ResultScreen({ result, playerCaptures, botCaptures, moves, playerKings, onRematch, onBack, onChat }:{
  result: 'player_wins' | 'bot_wins';
  playerCaptures: number; botCaptures: number; moves: number; playerKings: number;
  onRematch: () => void; onBack: () => void; onChat: () => void;
}) {
  const won = result === 'player_wins';
  return (
    <motion.div className="fixed inset-0 flex flex-col items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.92)', zIndex: 60 }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="w-full max-w-sm rounded-3xl px-6 py-8 text-center"
        style={{ background: 'linear-gradient(175deg,#1C1C3E,#12122A)', border: '2px solid rgba(255,255,255,0.1)', boxShadow: `0 0 60px ${won ? 'rgba(78,255,196,0.25)' : 'rgba(255,61,113,0.2)'}` }}
        initial={{ scale: 0.7, y: 40 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}>

        {/* Headline */}
        <motion.div className="font-display text-5xl mb-1"
          style={{ color: won ? '#4EFFC4' : '#FF3D71', textShadow: `0 0 30px ${won ? 'rgba(78,255,196,0.9)' : 'rgba(255,61,113,0.9)'}` }}
          animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 1.8, repeat: Infinity }}>
          {won ? 'YOU WIN!' : 'THEY WIN!'}
        </motion.div>
        <p className="font-body text-sm mb-6" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {won ? 'Draughts Champion' : 'Nice Try!'}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Captured',  value: `${playerCaptures} – ${botCaptures}` },
            { label: 'Moves',     value: moves.toString() },
            { label: 'Kings',     value: playerKings.toString() },
          ].map(s => (
            <div key={s.label} className="rounded-xl py-3"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="font-display text-xl" style={{ color: '#FFE66D' }}>{s.value}</div>
              <div className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Buttons */}
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

// ── Main component ───────────────────────────────────────────────────────────
export function Draughts() {
  const navigate    = useNavigate();
  const params      = useParams<{ matchId?: string }>();
  const { character } = useOnboardingStore();
  const playerChar  = character ?? 'ghost';

  const matchId      = params.matchId ?? localStorage.getItem('pending_match_id') ?? null;
  const matchIdLooksMultiplayer = !!matchId && matchId !== 'demo';

  // myRole will be known once the hook resolves; initialState is placeholder
  const mp = useMultiplayerGame<DraughtsState>({
    matchId: matchId ?? '',
    gameType: 'draughts',
    initialState: { pieces: makeInitialDbPieces('player1'), moveCount: 0 },
    enabled: matchIdLooksMultiplayer,
  });
  const isMultiplayer = matchIdLooksMultiplayer && !mp.fallbackToBotMode;
  const myRole = mp.myRole;

  const [phase,          setPhase]          = useState<Phase>('setup');
  const [pieces,         setPieces]         = useState<Piece[]>(() => makeInitialPieces());
  const [turn,           setTurn]           = useState<Player>('player');
  const [selectedId,     setSelectedId]     = useState<string | null>(null);
  const [validDests,     setValidDests]     = useState<Dest[]>([]);
  const [chainJumpId,    setChainJumpId]    = useState<string | null>(null);
  const [playerCaptures, setPlayerCaptures] = useState(0);
  const [botCaptures,    setBotCaptures]    = useState(0);
  const [moves,          setMoves]          = useState(0);
  const [result,         setResult]         = useState<'player_wins' | 'bot_wins' | null>(null);

  // Stable ref to latest pieces for bot effect
  const piecesRef = useRef(pieces);
  piecesRef.current = pieces;

  // ── Bot turn (solo only) ──────────────────────────────────────────────────
  useEffect(() => {
    if (turn !== 'bot' || phase !== 'playing' || isMultiplayer) return;
    const delay = 2000 + Math.random() * 1000;
    const timer = setTimeout(() => {
      const chain = computeBotMoveChain(piecesRef.current);
      if (!chain.length) {
        setResult('player_wins');
        setPhase('result');
        return;
      }

      let pcs = piecesRef.current;
      const executeStep = (i: number) => {
        if (i >= chain.length) {
          const playerHasMoves = pcs.filter(p => p.player === 'player').some(p =>
            getValidDests(pcs, p, hasAnyJump(pcs, 'player')).length > 0
          );
          setPieces([...pcs]);
          if (!pcs.some(p => p.player === 'player') || !playerHasMoves) {
            setResult('bot_wins');
            setPhase('result');
          } else {
            setTurn('player');
          }
          return;
        }
        const { pieceId, dest } = chain[i];
        pcs = applyMove(pcs, pieceId, dest);
        if (dest.capturedId) setBotCaptures(c => c + 1);
        if (i === 0) setMoves(m => m + 1);
        setPieces([...pcs]);
        setTimeout(() => executeStep(i + 1), i < chain.length - 1 ? 420 : 0);
      };
      executeStep(0);
    }, delay);
    return () => clearTimeout(timer);
  }, [turn, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Player move execution ─────────────────────────────────────────────────
  const executePlayerMove = (pieceId: string, dest: Dest) => {
    const newPieces = applyMove(pieces, pieceId, dest);
    if (dest.capturedId) setPlayerCaptures(c => c + 1);
    if (!chainJumpId) setMoves(m => m + 1);
    setPieces(newPieces);

    // Chain jump?
    if (dest.capturedId) {
      const moved = newPieces.find(p => p.id === pieceId)!;
      const nextJumps = getJumps(newPieces, moved);
      if (nextJumps.length) {
        setChainJumpId(pieceId);
        setSelectedId(pieceId);
        setValidDests(nextJumps);
        return;
      }
    }

    // Victory check
    if (!isMultiplayer) {
      const botAlive = newPieces.some(p => p.player === 'bot');
      if (!botAlive) { setResult('player_wins'); setPhase('result'); return; }
      const botHasMoves = newPieces.filter(p => p.player === 'bot').some(p =>
        getValidDests(newPieces, p, hasAnyJump(newPieces, 'bot')).length > 0
      );
      if (!botHasMoves) { setResult('player_wins'); setPhase('result'); return; }
    }

    setSelectedId(null);
    setValidDests([]);
    setChainJumpId(null);

    if (isMultiplayer) {
      // Save full piece state to DB after the complete move (chain done)
      const dbPieces = piecesToDb(newPieces, myRole);
      const newMoves = moves + (chainJumpId ? 0 : 1);
      let winner: string | null = null;
      if (!newPieces.some(p => p.player === 'bot')) winner = myRole;
      else if (!newPieces.filter(p => p.player === 'bot').some(p =>
        getValidDests(newPieces, p, hasAnyJump(newPieces, 'bot')).length > 0
      )) winner = myRole;
      mp.submitMove(
        { pieceId, dest },
        { pieces: dbPieces, moveCount: newMoves },
        winner,
      );
      setTurn('bot'); // show "waiting" UI
      return;
    }

    setTurn('bot');
  };

  // ── Cell tap handler ──────────────────────────────────────────────────────
  const handleCellTap = (row: number, col: number) => {
    if (turn !== 'player' || phase !== 'playing') return;
    if (isMultiplayer && !mp.isMyTurn) return;

    if (chainJumpId) {
      const d = validDests.find(d => d.row === row && d.col === col);
      if (d) executePlayerMove(chainJumpId, d);
      return;
    }

    const tapped = getPieceAt(pieces, row, col);
    const destMatch = selectedId ? validDests.find(d => d.row === row && d.col === col) : null;

    if (destMatch) { executePlayerMove(selectedId!, destMatch); return; }

    if (tapped?.player === 'player') {
      if (tapped.id === selectedId) { setSelectedId(null); setValidDests([]); return; }
      const mustCap = hasAnyJump(pieces, 'player');
      if (mustCap && getJumps(pieces, tapped).length === 0) return;
      const dests = getValidDests(pieces, tapped, mustCap);
      if (dests.length) { setSelectedId(tapped.id); setValidDests(dests); }
      return;
    }

    setSelectedId(null); setValidDests([]);
  };

  // ── Multiplayer: sync DB state ────────────────────────────────────────────
  const prevDrUpdatedAt = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!isMultiplayer || mp.loading || !mp.gameState) return;
    const local = piecesFromDb(mp.gameState.pieces, myRole);
    piecesRef.current = local;
    setPieces(local);
    setMoves(mp.gameState.moveCount);
    setTurn(mp.isMyTurn ? 'player' : 'bot');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mp.loading]);

  useEffect(() => {
    if (!isMultiplayer || !mp.gameRow || !mp.gameState) return;
    if (mp.gameRow.updated_at === prevDrUpdatedAt.current) return;
    prevDrUpdatedAt.current = mp.gameRow.updated_at;

    if (mp.gameRow.winner && phase !== 'result') {
      setResult(mp.gameRow.winner === myRole ? 'player_wins' : 'bot_wins');
      setPhase('result');
      return;
    }
    if (mp.isMyTurn && phase === 'playing') {
      // Apply opponent's full piece state
      const local = piecesFromDb(mp.gameState.pieces, myRole);
      piecesRef.current = local;
      setPieces(local);
      setSelectedId(null);
      setValidDests([]);
      setChainJumpId(null);
      setTurn('player');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mp.gameRow?.updated_at, mp.isMyTurn]);

  // ── Rematch ───────────────────────────────────────────────────────────────
  const handleRematch = () => {
    setPieces(makeInitialPieces());
    setTurn('player');
    setSelectedId(null);
    setValidDests([]);
    setChainJumpId(null);
    setPlayerCaptures(0);
    setBotCaptures(0);
    setMoves(0);
    setResult(null);
    setPhase('setup');
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const mustCapture     = turn === 'player' && phase === 'playing' && hasAnyJump(pieces, 'player');
  const capturablePieces = mustCapture
    ? new Set(pieces.filter(p => p.player === 'player' && getJumps(pieces, p).length > 0).map(p => p.id))
    : new Set<string>();
  const playerCount  = pieces.filter(p => p.player === 'player').length;
  const botCount     = pieces.filter(p => p.player === 'bot').length;
  const playerKings  = pieces.filter(p => p.player === 'player' && p.isKing).length;

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
            playerCaptures={playerCaptures}
            botCaptures={botCaptures}
            moves={moves}
            playerKings={playerKings}
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
              <div className="font-display" style={{ fontSize: 16, color: '#fff', lineHeight: 1 }}>{playerCount}</div>
              <div className="font-body" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>pieces</div>
            </div>
          </div>

          {/* Turn indicator */}
          <div className="flex flex-col items-center gap-1">
            <AnimatePresence mode="wait">
              <motion.div key={turn + phase}
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                className="font-display text-xs text-center"
                style={{ color: turn === 'player' ? '#4EFFC4' : 'rgba(255,255,255,0.3)' }}>
                {phase === 'playing' ? (turn === 'player' ? 'YOUR TURN' : 'THEIR TURN') : 'DRAUGHTS'}
              </motion.div>
            </AnimatePresence>
            {turn === 'bot' && phase === 'playing' && (
              <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 1.1, repeat: Infinity }}
                className="font-body" style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                thinking…
              </motion.div>
            )}
            <div className="font-body font-bold" style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
              {moves} moves
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
              <div className="font-display" style={{ fontSize: 16, color: '#fff', lineHeight: 1 }}>{botCount}</div>
              <div className="font-body" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>pieces</div>
            </div>
          </div>
        </div>
      </header>

      {/* Captured tray – bot's captures (player pieces taken) */}
      <div className="flex-none flex items-center justify-center gap-1.5 px-4 py-1" style={{ minHeight: 22 }}>
        <AnimatePresence>
          {Array.from({ length: botCaptures }).map((_, i) => (
            <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              style={{ width: 12, height: 12, borderRadius: '50%', background: 'linear-gradient(135deg,#4EFFC4,#B565FF)', border: '1.5px solid #00E5AA', flexShrink: 0 }} />
          ))}
        </AnimatePresence>
      </div>

      {/* Board */}
      <div className="flex-1 flex items-center justify-center" style={{ minHeight: 0 }}>
        <div style={{
          position: 'relative', width: BOARD, height: BOARD,
          border: '4px solid #0A0F1A',
          boxShadow: '0 0 0 2px rgba(78,255,196,0.15), 0 0 50px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.04)',
          flexShrink: 0,
        }}>
          {/* Cells */}
          {Array.from({ length: 64 }).map((_, i) => {
            const row = Math.floor(i / 8), col = i % 8;
            const dark = (row + col) % 2 === 1;
            const matchedDest = validDests.find(d => d.row === row && d.col === col);
            const isValidDest = !!matchedDest;
            const isCapture   = !!matchedDest?.capturedId;
            return (
              <div key={i} onClick={() => handleCellTap(row, col)}
                style={{
                  position: 'absolute', left: col * CELL, top: row * CELL, width: CELL, height: CELL,
                  background: dark ? '#1A2942' : '#EDE0C4',
                  cursor: turn === 'player' && phase === 'playing' ? 'pointer' : 'default',
                  boxShadow: dark ? 'inset 0 0 0 1px rgba(78,255,196,0.06)' : undefined,
                }}>
                {/* Valid-move indicator */}
                {isValidDest && (
                  <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    animate={{ scale: [0.85, 1.05, 0.85] }} transition={{ duration: 1.1, repeat: Infinity }}>
                    <div style={{
                      width: isCapture ? 22 : 16, height: isCapture ? 22 : 16,
                      borderRadius: '50%',
                      background: isCapture ? 'rgba(255,61,113,0.55)' : 'rgba(78,255,196,0.4)',
                      border: `2.5px solid ${isCapture ? '#FF3D71' : '#4EFFC4'}`,
                      boxShadow: `0 0 10px ${isCapture ? 'rgba(255,61,113,0.7)' : 'rgba(78,255,196,0.7)'}`,
                    }} />
                  </motion.div>
                )}
              </div>
            );
          })}

          {/* Pieces */}
          <AnimatePresence>
            {pieces.map(piece => {
              const isPlayer   = piece.player === 'player';
              const isSelected = piece.id === selectedId;
              const isChain    = piece.id === chainJumpId;
              const isMustCap  = mustCapture && isPlayer && capturablePieces.has(piece.id);
              const isDimmed   = mustCapture && isPlayer && !capturablePieces.has(piece.id);

              return (
                <motion.div
                  key={piece.id}
                  initial={{ x: piece.col * CELL, y: piece.row * CELL, scale: 1 }}
                  animate={{ x: piece.col * CELL, y: piece.row * CELL }}
                  exit={{ scale: 0, opacity: 0, transition: { duration: 0.22 } }}
                  transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                  style={{
                    position: 'absolute', top: 0, left: 0, width: CELL, height: CELL,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: isPlayer && turn === 'player' ? 'pointer' : 'default',
                    zIndex: isSelected ? 10 : 5,
                    opacity: isDimmed ? 0.28 : 1,
                    pointerEvents: isDimmed ? 'none' : 'auto',
                  }}
                  onClick={() => handleCellTap(piece.row, piece.col)}
                >
                  <motion.div
                    animate={{
                      scale: isSelected || isChain ? 1.14 : 1,
                      boxShadow: isSelected
                        ? '0 0 0 3.5px rgba(78,255,196,0.95), 0 0 22px rgba(78,255,196,0.7)'
                        : isChain
                        ? '0 0 0 3.5px rgba(255,230,109,0.95), 0 0 18px rgba(255,230,109,0.7)'
                        : isMustCap
                        ? '0 0 0 2.5px rgba(255,61,113,0.8), 0 0 14px rgba(255,61,113,0.55)'
                        : '0 4px 10px rgba(0,0,0,0.6)',
                    }}
                    transition={isMustCap && !isSelected
                      ? { duration: 0.85, repeat: Infinity, ease: 'easeInOut' }
                      : { type: 'spring', stiffness: 350, damping: 28 }
                    }
                    style={{
                      width: CELL - 8, height: CELL - 8,
                      borderRadius: '50%',
                      background: isPlayer
                        ? 'linear-gradient(135deg, #4EFFC4 0%, #B565FF 100%)'
                        : 'linear-gradient(135deg, #FF3D71 0%, #FF9F1C 100%)',
                      border: `3px solid ${isPlayer ? '#1ABCFF' : '#CC1F40'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {piece.isKing && <CrownIcon />}
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Captured tray – player's captures (bot pieces taken) */}
      <div className="flex-none flex items-center justify-center gap-1.5 px-4 py-1" style={{ minHeight: 22 }}>
        <AnimatePresence>
          {Array.from({ length: playerCaptures }).map((_, i) => (
            <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              style={{ width: 12, height: 12, borderRadius: '50%', background: 'linear-gradient(135deg,#FF3D71,#FF9F1C)', border: '1.5px solid #CC1F40', flexShrink: 0 }} />
          ))}
        </AnimatePresence>
      </div>

      {/* Footer info bar */}
      <div className="flex-none flex items-center justify-between px-5 py-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(10,15,26,0.9)' }}>
        <button onClick={() => navigate('/play')} className="font-body text-xs"
          style={{ color: 'rgba(255,255,255,0.28)' }}>
          ← Games
        </button>
        <div className="font-body text-xs text-center" style={{ color: 'rgba(255,255,255,0.22)' }}>
          {mustCapture && turn === 'player' && phase === 'playing'
            ? <span style={{ color: '#FF9F1C' }}>Capture required!</span>
            : 'Tap a piece to move'
          }
        </div>
        <div className="font-display text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>DUEL</div>
      </div>
    </div>
  );
}
