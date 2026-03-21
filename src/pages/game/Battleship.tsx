/**
 * Battleship – naval strategy game for Duel
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useOnboardingStore } from '../../store/onboardingStore';
import { characterImages } from '../../utils/assetMaps';
import { useMultiplayerGame } from '../../lib/useMultiplayerGame';
import { usePostGameRedirect } from '../../lib/usePostGameRedirect';
import { abandonGame } from '../../lib/database';
import {
  WaitingForOpponentOverlay,
  LeaveGameDialog,
  OpponentLeftOverlay,
  ReconnectOverlay,
  useOpponentLeftRedirect,
  useBeforeUnload,
  useReconnectGrace,
} from '../../components/game/MultiplayerOverlays';

// ── Multiplayer state shape ────────────────────────────────────────────────────
// phase hierarchy: 'placing_p1' → 'placing_p2' → 'battle' → 'result'
// current_turn in DB: p1_id during placing_p1, p2_id during placing_p2,
//   then alternates during battle.
interface BsState {
  phase: 'placing_p1' | 'placing_p2' | 'battle' | 'result';
  p1Ships: ShipState[] | null;
  p1Grid: (string | null)[][] | null;
  p2Ships: ShipState[] | null;
  p2Grid: (string | null)[][] | null;
  p1Shots: ('hit' | 'miss' | null)[][];
  p2Shots: ('hit' | 'miss' | null)[][];
}
const emptyShots = (): ('hit'|'miss'|null)[][] =>
  Array.from({ length: GRID }, () => Array(GRID).fill(null));
const makeInitialBsState = (): BsState => ({
  phase: 'placing_p1',
  p1Ships: null, p1Grid: null,
  p2Ships: null, p2Grid: null,
  p1Shots: emptyShots(), p2Shots: emptyShots(),
});

// ── Constants ─────────────────────────────────────────────────────────────────
const GRID    = 10;
const CELL_P  = 30;   // placement cell size (px)
const CELL_B  = 26;   // battle cell size (px)
const LABEL   = 16;   // row/col label px
const BOT_CHAR = 'dragon';
const COL_LABELS = 'ABCDEFGHIJ'.split('');

const SHIP_DEFS = [
  { id: 'carrier',    name: 'Carrier',    length: 5, color: '#4EFFC4' },
  { id: 'battleship', name: 'Battleship', length: 4, color: '#B565FF' },
  { id: 'cruiser',    name: 'Cruiser',    length: 3, color: '#FFE66D' },
  { id: 'submarine',  name: 'Submarine',  length: 3, color: '#4AC8FF' },
  { id: 'destroyer',  name: 'Destroyer',  length: 2, color: '#FF3D71' },
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase  = 'placement' | 'battle' | 'result';
type Player = 'player' | 'bot';
type Grid   = (string | null)[][];
type Shots  = ('hit' | 'miss' | null)[][];

interface ShipState {
  id: string; name: string; length: number; color: string;
  cells: [number, number][]; hits: number;
}

// ── Pure helpers ──────────────────────────────────────────────────────────────
const makeGrid  = (): Grid  => Array.from({ length: GRID }, () => Array(GRID).fill(null));
const makeShots = (): Shots => Array.from({ length: GRID }, () => Array(GRID).fill(null));

function shipCells(row: number, col: number, len: number, horiz: boolean): [number, number][] {
  return Array.from({ length: len }, (_, i) =>
    (horiz ? [row, col + i] : [row + i, col]) as [number, number]
  );
}

function validPlacement(grid: Grid, cells: [number, number][]): boolean {
  return cells.every(([r, c]) => r >= 0 && r < GRID && c >= 0 && c < GRID && !grid[r][c]);
}

function placeOnGrid(grid: Grid, id: string, cells: [number, number][]): Grid {
  return grid.map((row, ri) =>
    row.map((cell, ci) => (cells.some(([r, c]) => r === ri && c === ci) ? id : cell))
  );
}

function randomFleet(): { grid: Grid; ships: ShipState[] } {
  let grid = makeGrid();
  const ships: ShipState[] = [];
  for (const def of SHIP_DEFS) {
    for (let attempt = 0; attempt < 500; attempt++) {
      const horiz = Math.random() > 0.5;
      const r = Math.floor(Math.random() * GRID);
      const c = Math.floor(Math.random() * GRID);
      const cells = shipCells(r, c, def.length, horiz);
      if (validPlacement(grid, cells)) {
        grid = placeOnGrid(grid, def.id, cells);
        ships.push({ ...def, cells, hits: 0 });
        break;
      }
    }
  }
  return { grid, ships };
}

function processAttack(
  grid: Grid, ships: ShipState[], row: number, col: number
): { newShips: ShipState[]; result: 'hit' | 'miss' | 'sunk'; sunkShip?: ShipState } {
  const shipId = grid[row][col];
  if (!shipId) return { newShips: ships, result: 'miss' };
  const newShips = ships.map(s => s.id === shipId ? { ...s, hits: s.hits + 1 } : s);
  const ship = newShips.find(s => s.id === shipId)!;
  if (ship.hits >= ship.length) return { newShips, result: 'sunk', sunkShip: ship };
  return { newShips, result: 'hit' };
}

// ── Bot AI ────────────────────────────────────────────────────────────────────
interface BotAI {
  huntQueue:   [number, number][];
  targetQueue: [number, number][];
  currentHits: [number, number][];
}

function initBotAI(): BotAI {
  const cells: [number, number][] = [];
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++)
      if ((r + c) % 2 === 0) cells.push([r, c]);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return { huntQueue: cells, targetQueue: [], currentHits: [] };
}

function botPickCell(ai: BotAI, shots: Shots): [number, number] {
  for (const [r, c] of ai.targetQueue)
    if (r >= 0 && r < GRID && c >= 0 && c < GRID && !shots[r][c]) return [r, c];
  for (const [r, c] of ai.huntQueue)
    if (!shots[r][c]) return [r, c];
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++)
      if (!shots[r][c]) return [r, c];
  return [0, 0];
}

function botUpdateAI(ai: BotAI, row: number, col: number, result: 'hit' | 'miss' | 'sunk'): BotAI {
  let { huntQueue, targetQueue, currentHits } = ai;
  huntQueue    = huntQueue.filter(([r, c]) => !(r === row && c === col));
  targetQueue  = targetQueue.filter(([r, c]) => !(r === row && c === col));

  if (result === 'sunk') return { huntQueue, targetQueue: [], currentHits: [] };

  if (result === 'hit') {
    currentHits = [...currentHits, [row, col] as [number, number]];
    if (currentHits.length === 1) {
      targetQueue = ([[-1,0],[1,0],[0,-1],[0,1]] as [number,number][])
        .map(([dr, dc]) => [row + dr, col + dc] as [number, number])
        .filter(([r, c]) => r >= 0 && r < GRID && c >= 0 && c < GRID);
    } else {
      const first = currentHits[0], last = currentHits[currentHits.length - 1];
      const dr = Math.sign(last[0] - first[0]), dc = Math.sign(last[1] - first[1]);
      if (dr !== 0 || dc !== 0) {
        targetQueue = (
          [[last[0]+dr, last[1]+dc],[first[0]-dr, first[1]-dc]] as [number,number][]
        ).filter(([r, c]) => r >= 0 && r < GRID && c >= 0 && c < GRID);
      }
    }
  }
  return { huntQueue, targetQueue, currentHits };
}

// ── Grid components ───────────────────────────────────────────────────────────
function PlacementGrid({ grid, previewCells, previewValid, cellSize, onTap, onHover }: {
  grid: Grid;
  previewCells: [number, number][];
  previewValid: boolean;
  cellSize: number;
  onTap: (r: number, c: number) => void;
  onHover: (r: number, c: number) => void;
}) {
  const previewSet = new Set(previewCells.map(([r, c]) => `${r},${c}`));
  const shipColorMap: Record<string, string> = {};
  for (const d of SHIP_DEFS) shipColorMap[d.id] = d.color;

  return (
    <div>
      <div style={{ display: 'flex', marginLeft: LABEL }}>
        {COL_LABELS.map(l => (
          <div key={l} style={{ width: cellSize, height: LABEL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'rgba(78,255,196,0.5)', fontFamily: 'monospace', fontWeight: 'bold' }}>
            {l}
          </div>
        ))}
      </div>
      {Array.from({ length: GRID }, (_, row) => (
        <div key={row} style={{ display: 'flex' }}>
          <div style={{ width: LABEL, height: cellSize, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'rgba(78,255,196,0.5)', fontFamily: 'monospace', fontWeight: 'bold' }}>
            {row + 1}
          </div>
          {Array.from({ length: GRID }, (_, col) => {
            const shipId = grid[row][col];
            const inPrev = previewSet.has(`${row},${col}`);
            let bg = '#040D1A', border = '1px solid rgba(78,255,196,0.18)';
            if (inPrev) {
              bg     = previewValid ? 'rgba(78,255,196,0.28)' : 'rgba(255,61,113,0.28)';
              border = `1.5px solid ${previewValid ? '#4EFFC4' : '#FF3D71'}`;
            } else if (shipId) {
              const color = shipColorMap[shipId] ?? '#4EFFC4';
              bg = color + '50'; border = `1.5px solid ${color}88`;
            }
            return (
              <div key={col}
                onClick={() => onTap(row, col)}
                onMouseEnter={() => onHover(row, col)}
                style={{ width: cellSize, height: cellSize, background: bg, border, boxSizing: 'border-box', cursor: 'pointer', touchAction: 'manipulation' }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function RadarGrid({ shots, sunkCells, selectedCell, locked, cellSize, onTap }: {
  shots: Shots; sunkCells: Set<string>; selectedCell: [number, number] | null;
  locked: boolean; cellSize: number; onTap: (r: number, c: number) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', marginLeft: LABEL }}>
        {COL_LABELS.map(l => (
          <div key={l} style={{ width: cellSize, height: LABEL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'rgba(78,255,196,0.45)', fontFamily: 'monospace', fontWeight: 'bold' }}>{l}</div>
        ))}
      </div>
      {Array.from({ length: GRID }, (_, row) => (
        <div key={row} style={{ display: 'flex' }}>
          <div style={{ width: LABEL, height: cellSize, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'rgba(78,255,196,0.45)', fontFamily: 'monospace', fontWeight: 'bold' }}>{row + 1}</div>
          {Array.from({ length: GRID }, (_, col) => {
            const shot   = shots[row][col];
            const isSel  = selectedCell?.[0] === row && selectedCell?.[1] === col;
            const isSunk = sunkCells.has(`${row},${col}`);
            const canTap = !shot && !locked;
            let bg = '#040D1A', border = '1px solid rgba(78,255,196,0.14)';
            if      (shot === 'hit')  { bg = isSunk ? 'rgba(255,61,113,0.4)' : 'rgba(255,61,113,0.25)'; border = '1px solid rgba(255,61,113,0.4)'; }
            else if (shot === 'miss') { bg = 'rgba(255,255,255,0.04)'; border = '1px solid rgba(255,255,255,0.07)'; }
            else if (isSel)           { bg = 'rgba(255,230,109,0.18)'; border = '1.5px solid #FFE66D'; }
            return (
              <div key={col} onClick={() => canTap && onTap(row, col)}
                style={{ width: cellSize, height: cellSize, background: bg, border, boxSizing: 'border-box', cursor: canTap ? 'pointer' : 'default', touchAction: 'manipulation', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cellSize * 0.48 }}>
                {shot === 'hit'  && <span style={{ color: isSunk ? '#FF3D71' : '#FF7070', fontWeight: 'bold', lineHeight: 1 }}>✕</span>}
                {shot === 'miss' && <div style={{ width: cellSize * 0.28, height: cellSize * 0.28, borderRadius: '50%', background: 'rgba(180,210,255,0.5)' }} />}
                {isSel && !shot && <div style={{ width: cellSize * 0.36, height: cellSize * 0.36, borderRadius: '50%', border: '2px solid #FFE66D' }} />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function FleetGrid({ myGrid, botShots, myShips, cellSize }: {
  myGrid: Grid; botShots: Shots; myShips: ShipState[]; cellSize: number;
}) {
  const shipColorMap: Record<string, string> = {};
  const sunkIds = new Set(myShips.filter(s => s.hits >= s.length).map(s => s.id));
  for (const d of SHIP_DEFS) shipColorMap[d.id] = d.color;

  return (
    <div>
      <div style={{ display: 'flex', marginLeft: LABEL }}>
        {COL_LABELS.map(l => (
          <div key={l} style={{ width: cellSize, height: LABEL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'rgba(255,61,113,0.45)', fontFamily: 'monospace', fontWeight: 'bold' }}>{l}</div>
        ))}
      </div>
      {Array.from({ length: GRID }, (_, row) => (
        <div key={row} style={{ display: 'flex' }}>
          <div style={{ width: LABEL, height: cellSize, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'rgba(255,61,113,0.45)', fontFamily: 'monospace', fontWeight: 'bold' }}>{row + 1}</div>
          {Array.from({ length: GRID }, (_, col) => {
            const shipId = myGrid[row][col];
            const shot   = botShots[row][col];
            const color  = shipId ? shipColorMap[shipId] : null;
            const isSunk = shipId ? sunkIds.has(shipId) : false;
            let bg = '#040D1A', border = '1px solid rgba(255,61,113,0.08)';
            if      (shot === 'hit')  { bg = 'rgba(255,61,113,0.5)'; border = '1px solid #FF3D71'; }
            else if (shot === 'miss') { bg = 'rgba(255,255,255,0.04)'; border = '1px solid rgba(255,255,255,0.06)'; }
            else if (color)           { bg = color + (isSunk ? '22' : '40'); border = `1px solid ${color}${isSunk ? '44' : '88'}`; }
            return (
              <div key={col} style={{ width: cellSize, height: cellSize, background: bg, border, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cellSize * 0.46 }}>
                {shot === 'hit'  && <span style={{ color: '#FF3D71', fontWeight: 'bold', lineHeight: 1 }}>✕</span>}
                {shot === 'miss' && <div style={{ width: cellSize * 0.26, height: cellSize * 0.26, borderRadius: '50%', background: 'rgba(180,210,255,0.4)' }} />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Result screen ─────────────────────────────────────────────────────────────
function ResultScreen({ result, myShots, playerSunk, onBack, onChat }: {
  result: 'player_wins' | 'bot_wins'; myShots: Shots; playerSunk: number;
  onBack: () => void; onChat: () => void;
}) {
  const won   = result === 'player_wins';
  const color = won ? '#4EFFC4' : '#FF3D71';
  const total = myShots.flat().filter(Boolean).length;
  const hits  = myShots.flat().filter(s => s === 'hit').length;
  const acc   = total > 0 ? Math.round((hits / total) * 100) : 0;

  return (
    <motion.div className="fixed inset-0 flex flex-col items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.92)', zIndex: 60 }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="w-full max-w-sm rounded-3xl px-6 py-8 text-center"
        style={{ background: 'linear-gradient(175deg,#1C1C3E,#12122A)', border: '2px solid rgba(255,255,255,0.1)', boxShadow: `0 0 60px ${won ? 'rgba(78,255,196,0.25)' : 'rgba(255,61,113,0.2)'}` }}
        initial={{ scale: 0.7, y: 40 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
        <motion.div className="font-display text-5xl mb-1"
          style={{ color, textShadow: `0 0 30px ${color}` }}
          animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 1.8, repeat: Infinity }}>
          {won ? 'YOU WIN!' : 'THEY WIN!'}
        </motion.div>
        <p className="font-body text-sm mb-6" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {won ? 'Fleet Admiral' : 'Fleet Destroyed'}
        </p>
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { label: 'Shots',    value: total.toString() },
            { label: 'Accuracy', value: `${acc}%` },
            { label: 'Sunk',     value: `${playerSunk}/5` },
          ].map(s => (
            <div key={s.label} className="rounded-xl py-3"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="font-display text-lg" style={{ color: '#FFE66D' }}>{s.value}</div>
              <div className="font-body" style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
            </div>
          ))}
        </div>
        <motion.button onClick={onChat} className="w-full py-4 rounded-2xl font-display text-xl mb-3"
          style={{ background: 'linear-gradient(135deg,#00F5FF,#FF006E)', color: '#12122A', border: '3px solid rgba(255,255,255,0.2)', boxShadow: '0 0 28px rgba(0,245,255,0.45),4px 4px 0 rgba(0,0,0,0.35)' }}
          whileTap={{ scale: 0.97 }}>
          START CHATTING →
        </motion.button>
        <button onClick={onBack} className="font-body text-sm w-full py-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Back to Games
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function Battleship() {
  const navigate   = useNavigate();
  const params     = useParams<{ matchId?: string }>();
  const { character } = useOnboardingStore();
  const playerChar = character ?? 'ghost';

  const matchId      = params.matchId ?? localStorage.getItem('pending_match_id') ?? null;
  const matchIdLooksMultiplayer = !!matchId && matchId !== 'demo';

  const mp = useMultiplayerGame<BsState>({
    matchId: matchId ?? '',
    gameType: 'battleship',
    initialState: makeInitialBsState(),
    enabled: matchIdLooksMultiplayer,
  });
  const isMultiplayer = matchIdLooksMultiplayer && !mp.fallbackToBotMode;
  const myRole = mp.myRole;
  // Shorthand: am I p1?
  const isP1 = myRole === 'player1';

  // ── Phase ────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('placement');

  usePostGameRedirect({ isMultiplayer, matchId, phase });

  // ── Multiplayer rules state ────────────────────────────────────────────
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const { graceActive, showForfeit } = useReconnectGrace(
    isMultiplayer, mp.bothPresent, mp.opponentLeft, phase,
  );

  useBeforeUnload(isMultiplayer && phase === 'battle' && mp.bothPresent);
  useOpponentLeftRedirect(showForfeit, matchId, 'opponent');

  const handleLeaveConfirm = async () => {
    if (mp.gameRow?.id) await abandonGame(mp.gameRow.id);
    navigate(`/match/${matchId}`);
  };

  // ── Placement ────────────────────────────────────────────────────────────
  const [myGrid,      setMyGrid]      = useState<Grid>(makeGrid);
  const [myShips,     setMyShips]     = useState<ShipState[]>([]);
  const [shipIdx,     setShipIdx]     = useState(0);
  const [horizontal,  setHorizontal]  = useState(true);
  const [previewCell, setPreviewCell] = useState<[number, number] | null>(null);

  // ── Enemy fleet (revealed during battle) ─────────────────────────────────
  const [botGrid,  setBotGrid]  = useState<Grid>(makeGrid);
  const [botShips, setBotShips] = useState<ShipState[]>([]);

  // ── Battle ───────────────────────────────────────────────────────────────
  const [turn,         setTurn]         = useState<Player>('player');
  const [myShots,      setMyShots]      = useState<Shots>(makeShots);
  const [theirShots,   setTheirShots]   = useState<Shots>(makeShots);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [battleMsg,    setBattleMsg]    = useState<string | null>(null);
  const [sunkEnemyIds, setSunkEnemyIds] = useState<Set<string>>(new Set());
  const [botThinking,  setBotThinking]  = useState(false);
  const [result,       setResult]       = useState<'player_wins' | 'bot_wins' | null>(null);

  // ── Refs for async safety ────────────────────────────────────────────────
  const myGridRef      = useRef(myGrid);
  const myShipsRef     = useRef(myShips);
  const botGridRef     = useRef(botGrid);
  const botShipsRef    = useRef(botShips);
  const myShotsRef     = useRef(myShots);
  const theirShotsRef  = useRef(theirShots);
  const botAIRef       = useRef<BotAI>(initBotAI());

  myGridRef.current     = myGrid;
  myShipsRef.current    = myShips;
  botGridRef.current    = botGrid;
  botShipsRef.current   = botShips;
  myShotsRef.current    = myShots;
  theirShotsRef.current = theirShots;

  // ── Placement helpers ────────────────────────────────────────────────────
  const allPlaced      = shipIdx >= SHIP_DEFS.length;
  const currentShipDef = SHIP_DEFS[Math.min(shipIdx, SHIP_DEFS.length - 1)];

  const previewCells: [number, number][] = previewCell && !allPlaced
    ? shipCells(previewCell[0], previewCell[1], currentShipDef.length, horizontal)
    : [];
  const previewValid = previewCells.length > 0 && validPlacement(myGrid, previewCells);

  const handlePlacementTap = (row: number, col: number) => {
    if (allPlaced) return;
    const cells = shipCells(row, col, currentShipDef.length, horizontal);
    if (!validPlacement(myGrid, cells)) {
      setPreviewCell([row, col]); // show where it would go (red)
      return;
    }
    // If preview is already at this cell, place it. Otherwise just preview.
    if (previewCell?.[0] === row && previewCell?.[1] === col) {
      const newGrid  = placeOnGrid(myGrid, currentShipDef.id, cells);
      const newShips = [...myShips, { ...currentShipDef, cells, hits: 0 }];
      setMyGrid(newGrid);
      setMyShips(newShips);
      setShipIdx(i => i + 1);
      setPreviewCell(null);
    } else {
      setPreviewCell([row, col]);
    }
  };

  const handleHover = (row: number, col: number) => {
    if (!allPlaced) setPreviewCell([row, col]);
  };

  const handleRandom = () => {
    const { grid, ships } = randomFleet();
    setMyGrid(grid); setMyShips(ships); setShipIdx(SHIP_DEFS.length); setPreviewCell(null);
  };

  const handleReset = () => {
    setMyGrid(makeGrid()); setMyShips([]); setShipIdx(0); setPreviewCell(null);
  };

  const handleReady = () => {
    if (!allPlaced) return;

    if (isMultiplayer) {
      // Save my fleet to the DB; transition phase based on my role
      const gs = mp.gameState;
      const myPlacingPhase: BsState['phase'] = isP1 ? 'placing_p1' : 'placing_p2';
      if (!gs || gs.phase !== myPlacingPhase) return; // not my placement turn
      const nextPhase: BsState['phase'] = isP1 ? 'placing_p2' : 'battle';
      const newState: BsState = {
        ...gs,
        phase: nextPhase,
        ...(isP1
          ? { p1Ships: myShips, p1Grid: myGrid as (string|null)[][] }
          : { p2Ships: myShips, p2Grid: myGrid as (string|null)[][] }),
      };
      mp.submitMove({ type: 'place' }, newState, null);
      // Locally transition to "waiting for opponent to place" or battle
      if (!isP1) {
        // I'm player2 and just placed — battle can start
        const oppGrid = gs.p1Grid as Grid ?? makeGrid();
        const oppShips = gs.p1Ships ?? [];
        setBotGrid(oppGrid); setBotShips(oppShips);
        botGridRef.current = oppGrid; botShipsRef.current = oppShips;
        setPhase('battle'); setTurn('bot'); // p1 fires first in battle
      } else {
        // I'm player1 — wait for p2 to place
        setPhase('placement'); // stays on placement screen (poll will advance it)
      }
      return;
    }

    const { grid, ships } = randomFleet();
    setBotGrid(grid); setBotShips(ships);
    botGridRef.current  = grid;
    botShipsRef.current = ships;
    botAIRef.current    = initBotAI();
    setPhase('battle');
  };

  // ── Player fires ──────────────────────────────────────────────────────────
  const handleRadarTap = (row: number, col: number) => {
    if (turn !== 'player' || phase !== 'battle') return;
    if (myShots[row][col]) return;
    setSelectedCell([row, col]);
  };

  const handleFire = () => {
    if (!selectedCell || turn !== 'player') return;
    if (isMultiplayer && (!mp.isMyTurn || !mp.bothPresent)) return;
    const [row, col] = selectedCell;
    if (myShots[row][col]) return;

    const { newShips, result: res, sunkShip } = processAttack(
      botGridRef.current, botShipsRef.current, row, col
    );
    const shotVal: 'hit' | 'miss' = botGridRef.current[row][col] ? 'hit' : 'miss';
    const newShots = myShots.map((r, ri) =>
      r.map((s, ci) => (ri === row && ci === col ? shotVal : s))
    ) as Shots;

    setMyShots(newShots);
    myShotsRef.current = newShots;
    setBotShips(newShips);
    botShipsRef.current = newShips;
    setSelectedCell(null);

    if (res === 'sunk' && sunkShip) {
      setSunkEnemyIds(ids => new Set([...ids, sunkShip.id]));
      showMsg(`SUNK! ${sunkShip.name.toUpperCase()}!`);
    } else {
      showMsg(res === 'hit' ? 'HIT! 🔥' : 'MISS!');
    }

    const won = newShips.every(s => s.hits >= s.length);

    if (isMultiplayer) {
      const gs = mp.gameState!;
      const newState: BsState = {
        ...gs,
        ...(isP1
          ? { p1Shots: newShots as BsState['p1Shots'], p2Ships: newShips }
          : { p2Shots: newShots as BsState['p2Shots'], p1Ships: newShips }),
      };
      mp.submitMove({ type: 'fire', row, col }, newState, won ? myRole : null);
      setTurn('bot'); // waiting for opponent
      setBotThinking(true);
      if (won) { setTimeout(() => { setResult('player_wins'); setPhase('result'); }, 900); }
      return;
    }

    if (won) {
      setTimeout(() => { setResult('player_wins'); setPhase('result'); }, 900);
      return;
    }
    setTurn('bot');
    setBotThinking(true);
  };

  function showMsg(msg: string) {
    setBattleMsg(msg);
    setTimeout(() => setBattleMsg(null), 1600);
  }

  // ── Bot fires (solo only) ─────────────────────────────────────────────────
  useEffect(() => {
    if (turn !== 'bot' || phase !== 'battle' || isMultiplayer) return;
    const delay = 2200 + Math.random() * 900;
    const timer = setTimeout(() => {
      const [row, col] = botPickCell(botAIRef.current, theirShotsRef.current);
      const { newShips, result: res } = processAttack(
        myGridRef.current, myShipsRef.current, row, col
      );
      const shotVal: 'hit' | 'miss' = myGridRef.current[row][col] ? 'hit' : 'miss';
      const newShots = theirShotsRef.current.map((r, ri) =>
        r.map((s, ci) => (ri === row && ci === col ? shotVal : s))
      ) as Shots;

      botAIRef.current = botUpdateAI(botAIRef.current, row, col, res);
      setTheirShots(newShots);
      theirShotsRef.current = newShots;
      setMyShips(newShips);
      myShipsRef.current = newShips;
      setBotThinking(false);

      if (newShips.every(s => s.hits >= s.length)) {
        setTimeout(() => { setResult('bot_wins'); setPhase('result'); }, 600);
        return;
      }
      setTurn('player');
    }, delay);
    return () => clearTimeout(timer);
  }, [turn, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Multiplayer: sync DB state ────────────────────────────────────────────
  const prevBsUpdatedAt = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!isMultiplayer || mp.loading || !mp.gameState) return;
    const gs = mp.gameState;
    const myPlacingPhase: BsState['phase'] = isP1 ? 'placing_p1' : 'placing_p2';
    // Set initial turn based on who needs to place
    if (gs.phase === myPlacingPhase || gs.phase === (isP1 ? 'placing_p2' : 'placing_p1')) {
      setPhase('placement');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mp.loading]);

  useEffect(() => {
    if (!isMultiplayer || !mp.gameRow || !mp.gameState) return;
    if (mp.gameRow.updated_at === prevBsUpdatedAt.current) return;
    prevBsUpdatedAt.current = mp.gameRow.updated_at;
    const gs = mp.gameState;

    // Game over
    if (mp.gameRow.winner && phase !== 'result') {
      setResult(mp.gameRow.winner === myRole ? 'player_wins' : 'bot_wins');
      setPhase('result');
      return;
    }

    // Opponent finished placing — I can now start battle
    const theirPlacingPhase: BsState['phase'] = isP1 ? 'placing_p2' : 'placing_p1';
    if (gs.phase === 'battle' && phase === 'placement') {
      // Both placed, battle starts
      const oppGrid = (isP1 ? gs.p2Grid : gs.p1Grid) as Grid ?? makeGrid();
      const oppShips = (isP1 ? gs.p2Ships : gs.p1Ships) ?? [];
      setBotGrid(oppGrid); setBotShips(oppShips);
      botGridRef.current = oppGrid; botShipsRef.current = oppShips;
      setPhase('battle');
      // p1 fires first
      setTurn(mp.isMyTurn ? 'player' : 'bot');
      setBotThinking(!mp.isMyTurn);
      return;
    }
    // Opponent still placing — show waiting state
    if (gs.phase === theirPlacingPhase && phase === 'placement') {
      // We're already on placement screen, just poll
      return;
    }

    // Battle: opponent fired at me
    if (gs.phase === 'battle' && mp.isMyTurn && phase === 'battle') {
      // Update their shots (firing at my grid) and my ships' damage
      const theirNewShots = (isP1 ? gs.p2Shots : gs.p1Shots) as Shots;
      const myNewShips    = (isP1 ? gs.p1Ships : gs.p2Ships) ?? myShips;
      setTheirShots(theirNewShots);
      theirShotsRef.current = theirNewShots;
      setMyShips(myNewShips);
      myShipsRef.current = myNewShips;
      setBotThinking(false);
      setTurn('player');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mp.gameRow?.updated_at, mp.isMyTurn]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const sunkEnemyCells = new Set<string>();
  for (const ship of botShips) {
    if (sunkEnemyIds.has(ship.id))
      for (const [r, c] of ship.cells) sunkEnemyCells.add(`${r},${c}`);
  }
  const playerSunkCount = botShips.filter(s => s.hits >= s.length).length;
  const mySunkCount     = myShips.filter(s => s.hits >= s.length).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#0A1628' }}>
      {/* Scanlines */}
      <div className="fixed inset-0 pointer-events-none z-40 opacity-[0.02]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,1) 3px,rgba(255,255,255,1) 4px)' }} />

      {/* Multiplayer overlays */}
      {isMultiplayer && (
        <>
          <WaitingForOpponentOverlay visible={phase === 'battle' && !mp.bothPresent} opponentName="opponent" matchId={matchId!} />
          <ReconnectOverlay visible={graceActive} opponentName="opponent" />
          <OpponentLeftOverlay visible={showForfeit} opponentName="opponent" />
          <LeaveGameDialog visible={showLeaveDialog} opponentName="opponent" onStay={() => setShowLeaveDialog(false)} onLeave={handleLeaveConfirm} />
        </>
      )}

      {/* Result overlay */}
      <AnimatePresence>
        {phase === 'result' && result && (
          <ResultScreen
            result={result} myShots={myShots} playerSunk={playerSunkCount}
            onBack={() => navigate('/play')}
            onChat={() => {
              if (matchId) localStorage.setItem(`first_game_played_${matchId}`, 'true');
              navigate('/chat', matchId ? { state: { matchId } } : undefined);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── PLACEMENT ─────────────────────────────────────────────────────── */}
      {phase === 'placement' && (
        <>
          <div className="flex-none px-4 pt-4 pb-2">
            <div className="flex items-center gap-2 mb-0.5">
              <button onClick={() => navigate('/play')} className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>← Games</button>
            </div>
            <h1 className="font-display text-2xl text-center" style={{ color: '#FFE66D', textShadow: '0 0 15px rgba(255,230,109,0.5)' }}>
              DEPLOY YOUR FLEET
            </h1>
            <p className="font-body text-xs text-center mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {allPlaced
                ? 'Fleet ready! Tap READY to battle.'
                : `Hover/tap to preview, tap again to place · ${currentShipDef.name} (${currentShipDef.length})`}
            </p>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ minHeight: 0 }}
            onMouseLeave={() => setPreviewCell(null)}>

            <PlacementGrid
              grid={myGrid} previewCells={previewCells} previewValid={previewValid}
              cellSize={CELL_P} onTap={handlePlacementTap} onHover={handleHover}
            />

            {/* Ship status chips */}
            <div className="flex items-end gap-2">
              {SHIP_DEFS.map((def, i) => {
                const placed  = i < shipIdx;
                const current = i === shipIdx && !allPlaced;
                return (
                  <div key={def.id} className="flex flex-col items-center gap-0.5">
                    <div style={{ fontSize: 8, color: placed ? def.color : current ? def.color + 'AA' : 'rgba(255,255,255,0.2)', fontFamily: 'monospace', letterSpacing: 0.5 }}>
                      {def.name.slice(0, 3).toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {Array.from({ length: def.length }, (_, j) => (
                        <div key={j} style={{
                          width: 7, height: 7, borderRadius: 1.5,
                          background: placed ? def.color : current ? def.color + '55' : 'rgba(255,255,255,0.08)',
                          border: `1px solid ${placed || current ? def.color + '99' : 'rgba(255,255,255,0.12)'}`,
                        }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-2">
              {!allPlaced && (
                <motion.button onClick={() => setHorizontal(h => !h)}
                  className="font-display text-xs px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(78,255,196,0.1)', border: '1.5px solid rgba(78,255,196,0.35)', color: '#4EFFC4' }}
                  whileTap={{ scale: 0.95 }}>
                  {horizontal ? '→ HORIZ' : '↓ VERT'} ↻
                </motion.button>
              )}
              <motion.button onClick={handleRandom}
                className="font-display text-xs px-3 py-2 rounded-xl"
                style={{ background: 'rgba(255,230,109,0.1)', border: '1.5px solid rgba(255,230,109,0.35)', color: '#FFE66D' }}
                whileTap={{ scale: 0.95 }}>
                🎲 RANDOM
              </motion.button>
              {myShips.length > 0 && (
                <motion.button onClick={handleReset}
                  className="font-display text-xs px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(255,61,113,0.08)', border: '1.5px solid rgba(255,61,113,0.3)', color: '#FF3D71' }}
                  whileTap={{ scale: 0.95 }}>
                  ✕ CLEAR
                </motion.button>
              )}
            </div>

            {/* Ready button */}
            <motion.button onClick={handleReady} disabled={!allPlaced}
              className="font-display text-xl px-8 py-3 rounded-2xl"
              style={{
                background: allPlaced ? 'linear-gradient(135deg,#4EFFC4,#B565FF)' : 'rgba(255,255,255,0.06)',
                color: allPlaced ? '#12122A' : 'rgba(255,255,255,0.2)',
                border: allPlaced ? '3px solid rgba(255,255,255,0.2)' : '2px solid rgba(255,255,255,0.08)',
                boxShadow: allPlaced ? '0 0 24px rgba(78,255,196,0.4),4px 4px 0 rgba(0,0,0,0.35)' : 'none',
                cursor: allPlaced ? 'pointer' : 'not-allowed',
              }}
              whileTap={allPlaced ? { scale: 0.97 } : {}}>
              ⚓ BATTLE!
            </motion.button>
          </div>
        </>
      )}

      {/* ── BATTLE ────────────────────────────────────────────────────────── */}
      {phase === 'battle' && (
        <>
          {/* Header */}
          <header className="flex-none px-4 pt-3 pb-1">
            <div className="flex items-center justify-between">
              {/* Player side */}
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full overflow-hidden"
                  style={{ border: '2px solid #4EFFC4', background: '#0E0E22', boxShadow: '0 0 10px rgba(78,255,196,0.4)' }}>
                  <img src={characterImages[playerChar] ?? '/characters/Ghost.png'} alt="" className="w-full h-full object-contain p-0.5" draggable={false} />
                </div>
                <div>
                  <div className="font-body font-bold" style={{ fontSize: 9, color: '#4EFFC4', letterSpacing: 1 }}>YOU</div>
                  <div className="font-body" style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>
                    {5 - mySunkCount}/5 afloat
                  </div>
                </div>
              </div>

              {/* Turn indicator */}
              <div className="flex flex-col items-center gap-0.5">
                <AnimatePresence mode="wait">
                  <motion.div key={turn}
                    initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                    className="font-display text-xs"
                    style={{ color: turn === 'player' ? '#4EFFC4' : 'rgba(255,255,255,0.3)' }}>
                    {turn === 'player' ? 'YOUR TURN' : 'THEIR TURN'}
                  </motion.div>
                </AnimatePresence>
                {botThinking && (
                  <motion.div animate={{ opacity: [0.3, 0.9, 0.3] }} transition={{ duration: 1.0, repeat: Infinity }}
                    className="font-body" style={{ fontSize: 9, color: 'rgba(255,61,113,0.7)' }}>
                    targeting…
                  </motion.div>
                )}
              </div>

              {/* Bot side */}
              <div className="flex items-center gap-2 flex-row-reverse">
                <div className="w-9 h-9 rounded-full overflow-hidden"
                  style={{ border: '2px solid #FF3D71', background: '#0E0E22', boxShadow: '0 0 10px rgba(255,61,113,0.4)' }}>
                  <img src={characterImages[BOT_CHAR]} alt="" className="w-full h-full object-contain p-0.5" draggable={false} />
                </div>
                <div className="text-right">
                  <div className="font-body font-bold" style={{ fontSize: 9, color: '#FF3D71', letterSpacing: 1 }}>THEM</div>
                  <div className="font-body" style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>
                    {5 - playerSunkCount}/5 afloat
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Battle event banner */}
          <div className="flex-none flex items-center justify-center" style={{ height: 28 }}>
            <AnimatePresence>
              {battleMsg && (
                <motion.div key={battleMsg + Math.random()}
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="font-display text-sm px-4 py-0.5 rounded-full"
                  style={{
                    background: battleMsg.includes('MISS') ? 'rgba(255,255,255,0.08)' : 'rgba(255,61,113,0.25)',
                    border: `1px solid ${battleMsg.includes('MISS') ? 'rgba(255,255,255,0.18)' : '#FF3D71'}`,
                    color: battleMsg.includes('MISS') ? 'rgba(255,255,255,0.55)' : '#FF7070',
                  }}>
                  {battleMsg}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Battle grids */}
          <div className="flex-1 flex flex-col items-center justify-evenly" style={{ minHeight: 0, paddingBottom: 4 }}>

            {/* Enemy radar */}
            <div>
              <div className="font-body font-bold text-center mb-1"
                style={{ fontSize: 9, color: 'rgba(78,255,196,0.5)', letterSpacing: 1.5 }}>
                ENEMY WATERS
              </div>
              <RadarGrid
                shots={myShots} sunkCells={sunkEnemyCells} selectedCell={selectedCell}
                locked={turn !== 'player'} cellSize={CELL_B} onTap={handleRadarTap}
              />
              {/* Fire button */}
              <div className="flex items-center justify-center mt-2" style={{ minHeight: 36 }}>
                <AnimatePresence>
                  {selectedCell && turn === 'player' ? (
                    <motion.button key="fire"
                      initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                      onClick={handleFire}
                      className="font-display text-sm px-5 py-2 rounded-xl"
                      style={{ background: 'linear-gradient(135deg,#FF3D71,#FF9F1C)', color: '#fff', border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 0 14px rgba(255,61,113,0.5),3px 3px 0 rgba(0,0,0,0.3)' }}
                      whileTap={{ scale: 0.94 }}>
                      🎯 FIRE! {COL_LABELS[selectedCell[1]]}{selectedCell[0] + 1}
                    </motion.button>
                  ) : turn === 'player' ? (
                    <motion.div key="hint" className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      Tap enemy waters to target
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            {/* Player fleet */}
            <div>
              <div className="font-body font-bold text-center mb-1"
                style={{ fontSize: 9, color: 'rgba(255,61,113,0.5)', letterSpacing: 1.5 }}>
                YOUR FLEET
              </div>
              <FleetGrid myGrid={myGrid} botShots={theirShots} myShips={myShips} cellSize={CELL_B} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex-none flex items-center justify-between px-5 py-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(10,15,26,0.9)' }}>
            {isMultiplayer && phase === 'battle' && mp.bothPresent ? (
              <button onClick={() => setShowLeaveDialog(true)} className="font-body text-xs" style={{ color: '#FF3D71' }}>
                Leave Game
              </button>
            ) : (
              <button onClick={() => navigate('/play')} className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>
                ← Games
              </button>
            )}
            <div className="font-display text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>DUEL</div>
          </div>
        </>
      )}
    </div>
  );
}
