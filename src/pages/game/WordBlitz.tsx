/**
 * Word Blitz – fast-paced crossword builder
 * 3-minute timer, most points wins
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useOnboardingStore } from '../../store/onboardingStore';
import { usePostGameRedirect } from '../../lib/usePostGameRedirect';
import { useMultiplayerGame } from '../../lib/useMultiplayerGame';
import { isValidWord, scoreWord } from '../../utils/wordList';
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

// ─── Constants ────────────────────────────────────────────────────────────────

const GRID_SIZE    = 9;          // 9×9 grid
const CELL_PX      = 40;         // px per cell (my grid)
const OPP_CELL_PX  = 36;         // px per cell (opponent grid – slightly smaller)
const GAME_SECONDS = 180;        // 3 minutes

// Letter pool: 21 letters with Scrabble-like distribution
const LETTER_POOL = [
  'A','A','E','E','E','I','I','O','U',       // 9 vowels
  'R','S','T','N','L','C','D','M',           // 8 common consonants
  'P','B','G','H','Y','K','W','F',           // extras (pick 4 from this set)
].slice(0, 21);

// Deterministic shuffle so both players get same letters
function seededLetters(seed: string): string[] {
  const base = [...LETTER_POOL];
  // simple fisher-yates with string-hash seed
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const rng = () => { h ^= h << 13; h ^= h >> 17; h ^= h << 5; return (h >>> 0) / 0x100000000; };
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  return base;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'setup' | 'playing' | 'result';

interface PoolLetter {
  id: string;     // unique id
  letter: string;
  rotation: number; // slight tilt in pool
}

type GridCell = { letterId: string; letter: string } | null;

interface ScorePopup {
  id: string;
  text: string;
  row: number;
  col: number;
}

// Bot word placements (scripted, timed in seconds after game start)
const BOT_MOVES = [
  { at: 13, word: 'CAT',    row: 4, col: 3, dir: 'h', pts: 10 },
  { at: 33, word: 'CATS',   row: 4, col: 3, dir: 'h', pts: 15 },
  { at: 58, word: 'CAST',   row: 4, col: 3, dir: 'h', pts: 15 },
  { at: 90, word: 'SMART',  row: 2, col: 3, dir: 'h', pts: 25 },
  { at: 120, word: 'MASTER',row: 2, col: 3, dir: 'h', pts: 40 },
] as const;

// ─── Asset maps ───────────────────────────────────────────────────────────────

const characterImages: Record<string, string> = {
  dragon: '/characters/Dragon.png', cat: '/characters/Cat.png',
  robot: '/characters/Robot.png', phoenix: '/characters/Phoenix.png',
  bear: '/characters/Bear.png', fox: '/characters/Fox.png',
  octopus: '/characters/Octopus.png', owl: '/characters/Owl.png',
  wolf: '/characters/Wolf.png', unicorn: '/characters/Unicorn.png',
  ghost: '/characters/Ghost.png', lion: '/characters/Lion.png',
  witch: '/characters/Witch.png', knight: '/characters/Knight.png',
  viking: '/characters/Viking.png', pixie: '/characters/Pixie.png',
  ninja: '/characters/Ninja.png', mermaid: '/characters/Mermaid.png',
};

const OPPONENT = { name: 'Zara', character: 'phoenix', element: 'fire' };

// ─── Grid utilities ───────────────────────────────────────────────────────────

function emptyGrid(): GridCell[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

/** Extract all horizontal runs of 2+ placed letters */
function getHorizontalRuns(grid: GridCell[][]): { word: string; row: number; col: number; len: number }[] {
  const runs: { word: string; row: number; col: number; len: number }[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    let c = 0;
    while (c < GRID_SIZE) {
      if (grid[r][c]) {
        const start = c;
        let word = '';
        while (c < GRID_SIZE && grid[r][c]) { word += grid[r][c]!.letter; c++; }
        if (word.length >= 2) runs.push({ word, row: r, col: start, len: word.length });
      } else c++;
    }
  }
  return runs;
}

/** Extract all vertical runs of 2+ placed letters */
function getVerticalRuns(grid: GridCell[][]): { word: string; row: number; col: number; len: number }[] {
  const runs: { word: string; row: number; col: number; len: number }[] = [];
  for (let c = 0; c < GRID_SIZE; c++) {
    let r = 0;
    while (r < GRID_SIZE) {
      if (grid[r][c]) {
        const start = r;
        let word = '';
        while (r < GRID_SIZE && grid[r][c]) { word += grid[r][c]!.letter; r++; }
        if (word.length >= 2) runs.push({ word, row: start, col: c, len: word.length });
      } else r++;
    }
  }
  return runs;
}


/**
 * Validate grid: find valid words, return score and invalid cells
 */
function validateGrid(grid: GridCell[][]): {
  score: number;
  validWords: string[];
  invalidCells: Set<string>;
  newWords: string[];
  totalLetters: number;
} {
  const hRuns = getHorizontalRuns(grid);
  const vRuns = getVerticalRuns(grid);
  const allRuns = [...hRuns, ...vRuns];
  const validWords: string[] = [];
  const invalidCells = new Set<string>();

  // Mark cells that are part of length-1 isolated sequences (not touching anything)
  // A cell is "isolated" if it has no neighbour in same row/col
  let score = 0;
  for (const run of allRuns) {
    if (run.len < 3) {
      // 2-letter runs are not valid
      if (run.word.length === 2) {
        // mark as invalid only if part of no other valid run
      }
      continue;
    }
    if (isValidWord(run.word)) {
      validWords.push(run.word);
      score += scoreWord(run.word);
    } else {
      // mark cells as invalid
      // (we'll just track the words themselves for display)
    }
  }

  // Find cells not covered by any valid word
  const coveredCells = new Set<string>();
  for (const run of allRuns) {
    if (run.len >= 3 && isValidWord(run.word)) {
      for (let i = 0; i < run.len; i++) {
        if (hRuns.includes(run)) {
          coveredCells.add(`${run.row},${run.col+i}`);
        } else {
          coveredCells.add(`${run.row+i},${run.col}`);
        }
      }
    }
  }

  // Re-check: mark cells in invalid words as invalid
  for (const run of allRuns) {
    if (run.len < 3 || !isValidWord(run.word)) {
      const isH = hRuns.includes(run);
      for (let i = 0; i < run.len; i++) {
        const key = isH ? `${run.row},${run.col+i}` : `${run.row+i},${run.col}`;
        if (!coveredCells.has(key)) invalidCells.add(key);
      }
    }
  }

  // Single isolated cells
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c]) continue;
      const key = `${r},${c}`;
      if (!coveredCells.has(key)) invalidCells.add(key);
    }
  }

  const totalLetters = hRuns.reduce((s, r) => s + r.len, 0) + vRuns.reduce((s, r) => s + (r.len - 0), 0);

  return { score, validWords, invalidCells, newWords: validWords, totalLetters };
}

// ─── Setup countdown screen ───────────────────────────────────────────────────

function SetupScreen({ onGo, myCharacter, myName }: {
  onGo: () => void;
  myCharacter: string;
  myName: string;
}) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    const t = setInterval(() => {
      setCount((c) => {
        if (c <= 1) { clearInterval(t); setTimeout(onGo, 400); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [onGo]);

  return (
    <div
      className="h-screen flex flex-col items-center justify-center gap-8 px-6"
      style={{ background: '#0A1628' }}
    >
      {/* Scanlines */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,1) 3px, rgba(255,255,255,1) 4px)' }}
      />

      {/* Avatars */}
      <div className="flex items-center gap-8">
        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(78,255,196,0.12)', border: '3px solid rgba(78,255,196,0.4)' }}
          >
            <img src={characterImages[myCharacter] || characterImages.fox} alt="" className="w-14 h-14 object-contain" draggable={false} />
          </div>
          <span className="font-body text-sm font-bold" style={{ color: '#4EFFC4' }}>{myName}</span>
        </motion.div>

        <motion.div
          className="font-display text-3xl"
          style={{ color: '#FFE66D', textShadow: '0 0 20px rgba(255,230,109,0.6)' }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          VS
        </motion.div>

        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,107,168,0.12)', border: '3px solid rgba(255,107,168,0.4)' }}
          >
            <img src={characterImages[OPPONENT.character]} alt="" className="w-14 h-14 object-contain" draggable={false} />
          </div>
          <span className="font-body text-sm font-bold" style={{ color: '#FF6BA8' }}>{OPPONENT.name}</span>
        </motion.div>
      </div>

      {/* Title */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h1 className="font-display text-5xl mb-2" style={{
          background: 'linear-gradient(135deg, #4EFFC4, #FFE66D)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          filter: 'drop-shadow(0 0 20px rgba(78,255,196,0.4))',
        }}>
          WORD BLITZ
        </h1>
        <p className="font-body text-base" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Build connecting words from your letters
        </p>
        <p className="font-body text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
          3 minutes · Most points wins
        </p>
      </motion.div>

      {/* Countdown */}
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          className="font-display"
          style={{
            fontSize: count === 0 ? '5rem' : '7rem',
            color: count === 0 ? '#4EFFC4' : '#FFE66D',
            textShadow: `0 0 40px ${count === 0 ? 'rgba(78,255,196,0.8)' : 'rgba(255,230,109,0.8)'}`,
          }}
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {count === 0 ? 'GO!' : count}
        </motion.div>
      </AnimatePresence>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 h-[3px]"
        style={{ background: 'linear-gradient(90deg, #FF6BA8, #FFE66D, #4EFFC4, #B565FF, #FF6BA8)', boxShadow: '0 0 14px rgba(78,255,196,0.7)' }}
      />
    </div>
  );
}

// ─── Result screen ────────────────────────────────────────────────────────────

function ResultScreen({ myScore, oppScore, myName, myCharacter, onPlayAgain, onChat }: {
  myScore: number; oppScore: number;
  myName: string; myCharacter: string;
  onPlayAgain: () => void; onChat: () => void;
}) {
  const won = myScore >= oppScore;
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 px-6 overflow-y-auto"
      style={{ background: '#0A1628' }}
    >
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,1) 3px, rgba(255,255,255,1) 4px)' }}
      />

      {/* Result heading */}
      <motion.div
        className="text-center"
        initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      >
        <div className="font-display text-6xl mb-2"
          style={{
            color: won ? '#4EFFC4' : '#FF6BA8',
            textShadow: `0 0 30px ${won ? 'rgba(78,255,196,0.7)' : 'rgba(255,107,168,0.7)'}`,
          }}
        >
          {won ? 'YOU WIN!' : 'THEY WIN!'}
        </div>
        <div className="font-display text-xl" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {won ? '🏆 Word Master' : '✦ Nice Try!'}
        </div>
      </motion.div>

      {/* Score comparison */}
      <motion.div
        className="w-full max-w-xs rounded-2xl px-6 py-5 flex items-center justify-around"
        style={{ background: 'rgba(255,255,255,0.04)', border: '2px solid rgba(255,255,255,0.1)' }}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex flex-col items-center gap-2">
          <img src={characterImages[myCharacter] || characterImages.fox} alt="" className="w-14 h-14 object-contain" draggable={false} />
          <span className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{myName}</span>
          <span className="font-display text-3xl" style={{ color: won ? '#4EFFC4' : 'rgba(255,255,255,0.8)' }}>{myScore}</span>
        </div>
        <div className="font-display text-2xl" style={{ color: 'rgba(255,255,255,0.2)' }}>vs</div>
        <div className="flex flex-col items-center gap-2">
          <img src={characterImages[OPPONENT.character]} alt="" className="w-14 h-14 object-contain" draggable={false} />
          <span className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{OPPONENT.name}</span>
          <span className="font-display text-3xl" style={{ color: !won ? '#FF6BA8' : 'rgba(255,255,255,0.8)' }}>{oppScore}</span>
        </div>
      </motion.div>

      {/* Buttons */}
      <motion.div
        className="flex flex-col w-full max-w-xs gap-3"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <button
          onClick={onChat}
          className="w-full py-4 rounded-xl font-display text-xl"
          style={{
            background: 'linear-gradient(135deg, #4EFFC4, #B565FF)',
            color: '#12122A',
            boxShadow: '0 0 24px rgba(78,255,196,0.35)',
          }}
        >
          💬 Chat Unlocked →
        </button>
        <button
          onClick={onPlayAgain}
          className="w-full py-3 rounded-xl font-display text-base"
          style={{ background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
        >
          Play Again
        </button>
        <button
          onClick={() => navigate('/matches')}
          className="font-body text-sm text-center"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          Back to Matches
        </button>
      </motion.div>

      <div className="fixed bottom-0 left-0 right-0 h-[3px]"
        style={{ background: 'linear-gradient(90deg, #FF6BA8, #FFE66D, #4EFFC4, #B565FF, #FF6BA8)', boxShadow: '0 0 14px rgba(78,255,196,0.7)' }}
      />
    </div>
  );
}

// ─── Letter Tile ──────────────────────────────────────────────────────────────

function PoolTile({ pl, selected, onClick }: {
  pl: PoolLetter; selected: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-lg font-display text-xl select-none"
      style={{
        background: selected ? '#4EFFC4' : '#FFF8F0',
        border: selected ? '3px solid #00CC99' : '3px solid #1a1a2e',
        color: selected ? '#0A1628' : '#1a1a2e',
        boxShadow: selected
          ? '0 0 16px rgba(78,255,196,0.6), 0 3px 0 rgba(0,0,0,0.3)'
          : '0 3px 0 rgba(0,0,0,0.35)',
        rotate: `${selected ? 0 : pl.rotation}deg`,
        zIndex: selected ? 10 : 1,
      }}
      whileTap={{ scale: 0.92 }}
      animate={{
        scale: selected ? 1.08 : 1,
        rotate: selected ? 0 : pl.rotation,
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {pl.letter}
    </motion.button>
  );
}

// ─── Main game screen ─────────────────────────────────────────────────────────

export function WordBlitz() {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const { character, name } = useOnboardingStore();

  const myChar = character || 'fox';
  const myName = name || 'Alex';
  const seed   = matchId || 'demo';

  // ── Phase ─────────────────────────────────────────────────────────────────
  const isMultiplayer = !!matchId && matchId !== 'demo';
  const [phase, setPhase] = useState<Phase>('setup');

  const mp = useMultiplayerGame<object>({
    matchId: matchId ?? '',
    gameType: 'word_blitz',
    initialState: {},
    enabled: isMultiplayer,
  });

  usePostGameRedirect({ isMultiplayer, matchId: matchId ?? null, phase });

  // ── Multiplayer rules state ────────────────────────────────────────────
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const { graceActive, showForfeit } = useReconnectGrace(
    isMultiplayer, mp.bothPresent, mp.opponentLeft, phase,
  );

  useBeforeUnload(isMultiplayer && phase === 'playing' && mp.bothPresent);
  useOpponentLeftRedirect(showForfeit, matchId ?? null, 'opponent');

  const handleLeaveConfirm = async () => {
    if (mp.gameRow?.id) await abandonGame(mp.gameRow.id);
    navigate(`/match/${matchId}`);
  };

  // ── Timer ─────────────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Pool & grid ───────────────────────────────────────────────────────────
  const [pool, setPool] = useState<PoolLetter[]>(() =>
    seededLetters(seed).map((l, i) => ({
      id: `${l}-${i}`,
      letter: l,
      rotation: (Math.random() - 0.5) * 10,
    }))
  );
  const [grid, setGrid] = useState<GridCell[][]>(emptyGrid);

  // ── Selection ─────────────────────────────────────────────────────────────
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);

  // ── Scores ────────────────────────────────────────────────────────────────
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [validWords, setValidWords] = useState<string[]>([]);

  // ── Popups ────────────────────────────────────────────────────────────────
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
  const [oppPopup, setOppPopup] = useState<string | null>(null);

  // ── Invalid cells (red highlight) ─────────────────────────────────────────
  const [invalidCells, setInvalidCells] = useState<Set<string>>(new Set());

  // ── Bot moves tracking ────────────────────────────────────────────────────
  const botMovesDone = useRef<Set<number>>(new Set());
  const elapsedRef   = useRef(0);

  // ── Opponent grid & words (live view) ─────────────────────────────────────
  const [oppGrid, setOppGrid]   = useState<GridCell[][]>(emptyGrid);
  const [oppWords, setOppWords] = useState<string[]>([]);

  // ── Scroll refs ────────────────────────────────────────────────────────────
  const rootRef       = useRef<HTMLDivElement>(null);
  const oppSectionRef = useRef<HTMLDivElement>(null);

  // ─── Timer logic (extracted so both solo and MP can start it) ─────────────
  const startTimer = useCallback(() => {
    if (timerRef.current) return; // already running
    elapsedRef.current = 0;
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      const elapsed = elapsedRef.current;
      setTimeLeft(GAME_SECONDS - elapsed);

      // Bot moves (solo only — multiplayer has real opponent)
      if (!isMultiplayer) {
        for (const move of BOT_MOVES) {
          if (!botMovesDone.current.has(move.at) && elapsed >= move.at) {
            botMovesDone.current.add(move.at);
            setOppScore((s) => s + move.pts);
            setOppPopup(`${move.word} +${move.pts}`);
            setTimeout(() => setOppPopup(null), 1800);
            setOppGrid((g) => {
              const next = g.map((r) => [...r]);
              for (let i = 0; i < move.word.length; i++) {
                if (move.dir === 'h') {
                  next[move.row][move.col + i] = { letterId: `opp-${move.word}-${i}`, letter: move.word[i] };
                } else {
                  next[move.row + i][move.col] = { letterId: `opp-${move.word}-${i}`, letter: move.word[i] };
                }
              }
              return next;
            });
            setOppWords((ws) => {
              const pruned = ws.filter((w) => !move.word.startsWith(w));
              return [...pruned, move.word];
            });
          }
        }
      }

      if (GAME_SECONDS - elapsed <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        setPhase('result');
      }
    }, 1000);
  }, [isMultiplayer]);

  // ─── Start game ───────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    setPhase('playing');
    // Solo: start timer immediately. MP: timer starts when bothPresent (see effect below).
    if (!isMultiplayer) startTimer();
  }, [isMultiplayer, startTimer]);

  // ─── MP: start timer once both players are present ─────────────────────────
  useEffect(() => {
    if (!isMultiplayer || phase !== 'playing' || !mp.bothPresent) return;
    startTimer();
  }, [isMultiplayer, phase, mp.bothPresent, startTimer]);

  // Cleanup timer
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ─── Re-validate whenever grid changes ────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    const { score, validWords: vw, invalidCells: ic, newWords } = validateGrid(grid);

    // New words → popups
    const prevSet = new Set(validWords);
    const addedWords = newWords.filter((w) => !prevSet.has(w));
    if (addedWords.length > 0) {
      setMyScore(score);
      addedWords.forEach((w) => {
        const pts = scoreWord(w);
        const popup: ScorePopup = {
          id: `${w}-${Date.now()}`,
          text: `${w} +${pts}`,
          row: 4, col: 4,
        };
        setScorePopups((p) => [...p, popup]);
        setTimeout(() => setScorePopups((p) => p.filter((x) => x.id !== popup.id)), 1600);
      });
    } else {
      setMyScore(score);
    }
    setValidWords(vw);
    setInvalidCells(ic);
  }, [grid, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Pool → Grid interaction ───────────────────────────────────────────────
  const handlePoolTap = (id: string) => {
    setSelectedPoolId((prev) => prev === id ? null : id);
  };

  const handleCellTap = (row: number, col: number) => {
    if (grid[row][col]) {
      // Return letter to pool
      const cell = grid[row][col]!;
      setGrid((g) => {
        const next = g.map((r) => [...r]);
        next[row][col] = null;
        return next;
      });
      setPool((p) => [...p, { id: cell.letterId, letter: cell.letter, rotation: (Math.random()-0.5)*10 }]);
    } else if (selectedPoolId) {
      // Place selected letter
      const pl = pool.find((p) => p.id === selectedPoolId);
      if (!pl) return;
      setGrid((g) => {
        const next = g.map((r) => [...r]);
        next[row][col] = { letterId: pl.id, letter: pl.letter };
        return next;
      });
      setPool((p) => p.filter((x) => x.id !== selectedPoolId));
      setSelectedPoolId(null);
    }
  };

  const handleShuffle = () => {
    setPool((p) => {
      const copy = [...p];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
        copy[i] = { ...copy[i], rotation: (Math.random()-0.5)*10 };
      }
      return copy;
    });
  };

  const handleClear = () => {
    // Return all grid letters to pool
    const returned: PoolLetter[] = [];
    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++)
        if (grid[r][c]) {
          const cell = grid[r][c]!;
          returned.push({ id: cell.letterId, letter: cell.letter, rotation: (Math.random()-0.5)*10 });
        }
    setGrid(emptyGrid());
    setPool((p) => [...p, ...returned]);
    setSelectedPoolId(null);
  };

  // ─── Timer display ────────────────────────────────────────────────────────
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerStr = `${mins}:${String(secs).padStart(2, '0')}`;
  const timerColor = timeLeft < 60 ? '#FF4444' : '#FFE66D';
  const timerGlow  = timeLeft < 60 ? 'rgba(255,68,68,0.7)' : 'rgba(255,230,109,0.6)';

  // ─── Filled count for "all letters" bonus hint ────────────────────────────
  const filledCount = grid.flat().filter(Boolean).length;
  const allUsed = filledCount === 21 && pool.length === 0;

  // ─── Render ───────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return <SetupScreen onGo={startGame} myCharacter={myChar} myName={myName} />;
  }

  if (phase === 'result') {
    return (
      <ResultScreen
        myScore={myScore} oppScore={oppScore}
        myName={myName} myCharacter={myChar}
        onPlayAgain={() => { setPhase('setup'); setGrid(emptyGrid()); setPool(seededLetters(seed).map((l,i)=>({id:`${l}-${i}`,letter:l,rotation:(Math.random()-0.5)*10}))); setMyScore(0); setOppScore(0); setTimeLeft(GAME_SECONDS); botMovesDone.current.clear(); setOppGrid(emptyGrid()); setOppWords([]); }}
        onChat={() => {
          if (matchId) localStorage.setItem(`first_game_played_${matchId}`, 'true');
          navigate('/chat', matchId ? { state: { matchId } } : undefined);
        }}
      />
    );
  }

  return (
    // Root: vertically scrollable on mobile (my board = 100vh, opp board below)
    //       side-by-side on desktop (h-screen, no scroll)
    <div
      ref={rootRef}
      className="h-screen overflow-y-auto flex flex-col md:flex-row md:overflow-hidden"
      style={{ background: '#0A1628' }}
    >
      {/* Scanlines */}
      <div className="fixed inset-0 pointer-events-none z-10 opacity-[0.02]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,1) 3px, rgba(255,255,255,1) 4px)' }}
      />

      {/* Multiplayer overlays */}
      {isMultiplayer && (
        <>
          <WaitingForOpponentOverlay visible={phase === 'playing' && !mp.bothPresent} opponentName="opponent" matchId={matchId!} />
          <ReconnectOverlay visible={graceActive} opponentName="opponent" />
          <OpponentLeftOverlay visible={showForfeit} opponentName="opponent" />
          <LeaveGameDialog visible={showLeaveDialog} opponentName="opponent" onStay={() => setShowLeaveDialog(false)} onLeave={handleLeaveConfirm} />
        </>
      )}

      {/* ══ MY BOARD — above the fold on mobile, left 60% on desktop ══ */}
      <div className="h-screen flex-shrink-0 flex flex-col overflow-hidden md:flex-1 md:h-screen">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="flex-none flex items-center justify-between px-4 pt-3 pb-2 gap-2"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(10,22,40,0.98)' }}
        >
          {/* My avatar + score */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(78,255,196,0.1)', border: '2px solid rgba(78,255,196,0.35)' }}
            >
              <img src={characterImages[myChar]} alt="" className="w-6 h-6 object-contain" draggable={false} />
            </div>
            <div>
              <p className="font-body text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>YOU</p>
              <p className="font-display text-xl leading-none" style={{ color: '#4EFFC4', textShadow: '0 0 10px rgba(78,255,196,0.5)' }}>{myScore}</p>
            </div>
          </div>

          {/* Timer */}
          <motion.div
            className="font-mono text-3xl font-bold"
            style={{ color: timerColor, textShadow: `0 0 16px ${timerGlow}` }}
            animate={timeLeft < 30 ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            {timerStr}
          </motion.div>

          {/* Opponent avatar + score */}
          <div className="flex items-center gap-2">
            <div>
              <p className="font-body text-[10px] text-right" style={{ color: 'rgba(255,255,255,0.35)' }}>{OPPONENT.name.toUpperCase()}</p>
              <div className="flex items-center gap-1">
                <p className="font-display text-xl leading-none text-right" style={{ color: '#FF6BA8', textShadow: '0 0 10px rgba(255,107,168,0.5)' }}>{oppScore}</p>
                <AnimatePresence>
                  {oppPopup && (
                    <motion.span
                      className="font-body text-xs font-bold"
                      style={{ color: '#FF6BA8' }}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    >
                      ↑
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,107,168,0.1)', border: '2px solid rgba(255,107,168,0.35)' }}
            >
              <img src={characterImages[OPPONENT.character]} alt="" className="w-6 h-6 object-contain" draggable={false} />
            </div>
          </div>
        </header>

        {/* Opponent score popup */}
        <AnimatePresence>
          {oppPopup && (
            <motion.div
              className="fixed top-16 right-4 z-30 px-3 py-1.5 rounded-lg font-body text-sm font-bold"
              style={{ background: 'rgba(255,107,168,0.15)', border: '1.5px solid rgba(255,107,168,0.4)', color: '#FF6BA8' }}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            >
              {OPPONENT.name}: {oppPopup} 🔥
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Scoring guide ────────────────────────────────────────────────── */}
        <div
          className="flex-none flex items-center justify-center gap-2 px-3 py-1.5"
          style={{ background: 'rgba(255,255,255,0.015)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          {[
            { label: '3', pts: '10', color: 'rgba(255,255,255,0.35)' },
            { label: '4', pts: '15', color: 'rgba(255,255,255,0.5)'  },
            { label: '5', pts: '25', color: '#FFE66D'                 },
            { label: '6+', pts: '40', color: '#4EFFC4'               },
          ].map(({ label, pts, color }) => (
            <div key={label} className="flex items-center gap-1">
              <span className="font-body text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(255,255,255,0.06)', color, border: `1px solid ${color}33` }}
              >
                {label}
              </span>
              <span className="font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>={pts}pts</span>
            </div>
          ))}
          <span className="font-body text-[10px] ml-1" style={{ color: 'rgba(78,255,196,0.5)' }}>· all used +50</span>
        </div>

        {/* ── Letter pool ──────────────────────────────────────────────────── */}
        <div
          className="flex-none px-3 py-2.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
        >
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {pool.length === 0 ? (
              <div className="flex items-center justify-center w-full h-11">
                <span className="font-body text-xs" style={{ color: allUsed ? '#4EFFC4' : 'rgba(255,255,255,0.2)' }}>
                  {allUsed ? '✓ All letters placed! +50 bonus' : 'No letters left'}
                </span>
              </div>
            ) : pool.map((pl) => (
              <PoolTile
                key={pl.id}
                pl={pl}
                selected={selectedPoolId === pl.id}
                onClick={() => handlePoolTap(pl.id)}
              />
            ))}
          </div>
        </div>

        {/* ── My Grid ──────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto flex items-start justify-center p-3" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          <div className="relative">
            <AnimatePresence>
              {scorePopups.map((popup) => (
                <motion.div
                  key={popup.id}
                  className="absolute z-20 pointer-events-none font-body text-sm font-bold whitespace-nowrap"
                  style={{
                    color: '#4EFFC4',
                    left: popup.col * CELL_PX,
                    top:  popup.row * CELL_PX - 10,
                    textShadow: '0 0 10px rgba(78,255,196,0.8)',
                  }}
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: 1, y: -30 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2 }}
                >
                  +{popup.text.split('+')[1]}
                </motion.div>
              ))}
            </AnimatePresence>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_PX}px)`,
                gap: 2,
                padding: 2,
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 12,
                border: '1.5px solid rgba(255,255,255,0.08)',
              }}
            >
              {grid.map((row, r) =>
                row.map((cell, c) => {
                  const key = `${r},${c}`;
                  const isInvalid = invalidCells.has(key);
                  const hasLetter = !!cell;
                  const isTarget = !hasLetter && !!selectedPoolId;

                  return (
                    <motion.button
                      key={key}
                      onClick={() => handleCellTap(r, c)}
                      className="flex items-center justify-center font-display text-xl select-none"
                      style={{
                        width: CELL_PX,
                        height: CELL_PX,
                        borderRadius: 6,
                        background: hasLetter
                          ? isInvalid ? 'rgba(255,68,68,0.15)' : '#FFF8F0'
                          : isTarget ? 'rgba(78,255,196,0.07)' : 'rgba(255,255,255,0.03)',
                        border: hasLetter
                          ? `2.5px solid ${isInvalid ? '#FF4444' : '#1a1a2e'}`
                          : isTarget ? '2px dashed rgba(78,255,196,0.3)' : '1px solid rgba(255,255,255,0.07)',
                        color: isInvalid ? '#FF4444' : '#1a1a2e',
                        boxShadow: hasLetter && !isInvalid ? '0 2px 0 rgba(0,0,0,0.3)' : 'none',
                        cursor: hasLetter || selectedPoolId ? 'pointer' : 'default',
                      }}
                      whileTap={hasLetter || selectedPoolId ? { scale: 0.93 } : {}}
                      animate={isInvalid ? { x: [0, -3, 3, -3, 0] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      {cell?.letter ?? ''}
                    </motion.button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Controls bar ─────────────────────────────────────────────────── */}
        <div className="flex-none flex items-center gap-3 px-4 py-2.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(10,22,40,0.97)' }}
        >
          {/* Words found */}
          <div className="flex-1 min-w-0">
            {validWords.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {validWords.slice(-4).map((w) => {
                  const pts = scoreWord(w);
                  const isBig = w.length >= 6;
                  return (
                    <span key={w}
                      className="font-body text-xs px-2 py-0.5 rounded-md font-bold flex items-center gap-1"
                      style={{
                        background: isBig ? 'rgba(78,255,196,0.18)' : 'rgba(78,255,196,0.08)',
                        color: isBig ? '#4EFFC4' : 'rgba(78,255,196,0.7)',
                        border: `1px solid ${isBig ? 'rgba(78,255,196,0.45)' : 'rgba(78,255,196,0.2)'}`,
                        boxShadow: isBig ? '0 0 8px rgba(78,255,196,0.25)' : 'none',
                      }}
                    >
                      {w.toUpperCase()}
                      <span style={{ opacity: 0.65, fontSize: '0.65rem' }}>+{pts}</span>
                    </span>
                  );
                })}
              </div>
            ) : (
              <span className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {selectedPoolId ? 'Tap a grid cell to place letter' : 'Tap a letter to start'}
              </span>
            )}
          </div>

          {/* Shuffle */}
          <motion.button
            onClick={handleShuffle}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)' }}
            whileTap={{ scale: 0.9, rotate: 180 }}
            transition={{ duration: 0.3 }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 6h10.5M2 12h10.5M10 3l3 3-3 3M10 9l3 3-3 3" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>

          {/* Clear */}
          <motion.button
            onClick={handleClear}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,107,168,0.07)', border: '1.5px solid rgba(255,107,168,0.2)' }}
            whileTap={{ scale: 0.9 }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 3l12 12M15 3L3 15" stroke="rgba(255,107,168,0.7)" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </motion.button>

          {/* Score total */}
          <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl"
            style={{ background: myScore > 0 ? 'rgba(78,255,196,0.1)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${myScore > 0 ? 'rgba(78,255,196,0.3)' : 'rgba(255,255,255,0.08)'}` }}
          >
            <span className="font-display text-base" style={{ color: myScore > 0 ? '#4EFFC4' : 'rgba(255,255,255,0.3)' }}>
              {myScore} pts
            </span>
          </div>
        </div>

        {/* ── Scroll cue (mobile only) ─────────────────────────────────────── */}
        <motion.button
          onClick={() => oppSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="flex-none md:hidden w-full flex flex-col items-center py-2 gap-0.5"
          style={{ background: 'rgba(78,255,196,0.03)', borderTop: '1px solid rgba(78,255,196,0.12)' }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="font-body text-xs font-semibold" style={{ color: '#4EFFC4' }}>
            They're building words too! Peek at {OPPONENT.name}'s board
          </span>
          <motion.span
            className="text-base leading-none"
            style={{ color: '#4EFFC4' }}
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.0, repeat: Infinity, ease: 'easeInOut' }}
          >
            ↓
          </motion.span>
        </motion.button>
      </div>

      {/* ══ OPP BOARD — below the fold on mobile, right 40% on desktop ══ */}
      <div
        ref={oppSectionRef}
        className="flex-shrink-0 flex flex-col border-t md:border-t-0 md:border-l md:w-[40%] md:overflow-y-auto"
        style={{ borderColor: 'rgba(255,107,168,0.2)', background: 'rgba(8,18,34,0.99)' }}
      >
        {/* Opp section header */}
        <div className="flex-none flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid rgba(255,107,168,0.12)', background: 'rgba(255,107,168,0.03)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,107,168,0.1)', border: '2px solid rgba(255,107,168,0.4)' }}
            >
              <img src={characterImages[OPPONENT.character]} alt="" className="w-7 h-7 object-contain" draggable={false} />
            </div>
            <div>
              <p className="font-display text-sm" style={{ color: '#FF6BA8', letterSpacing: '0.1em' }}>
                {OPPONENT.name.toUpperCase()}'S BOARD
              </p>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF6BA8', boxShadow: '0 0 4px #FF6BA8' }} />
                <span className="font-body text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Live</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AnimatePresence>
              {oppPopup && (
                <motion.div
                  className="font-body text-xs font-bold px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(255,107,168,0.15)', color: '#FF6BA8', border: '1px solid rgba(255,107,168,0.3)' }}
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                >
                  {oppPopup} 🔥
                </motion.div>
              )}
            </AnimatePresence>
            <div className="text-right">
              <p className="font-body text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>SCORE</p>
              <p className="font-display text-2xl leading-none" style={{ color: '#FF6BA8', textShadow: '0 0 10px rgba(255,107,168,0.5)' }}>{oppScore}</p>
            </div>
          </div>
        </div>

        {/* Opp words found */}
        {oppWords.length > 0 && (
          <div className="flex-none flex flex-wrap gap-1.5 px-4 py-2.5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            {oppWords.map((w) => (
              <span key={w}
                className="font-body text-xs px-2 py-0.5 rounded-md font-bold flex items-center gap-1"
                style={{ background: 'rgba(255,107,168,0.1)', color: '#FF6BA8', border: '1px solid rgba(255,107,168,0.25)' }}
              >
                {w.toUpperCase()}
                <span style={{ opacity: 0.6, fontSize: '0.6rem' }}>+{scoreWord(w)}</span>
              </span>
            ))}
          </div>
        )}

        {/* Opp grid (read-only) */}
        <div className="flex-1 overflow-auto flex items-start justify-center p-4" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${GRID_SIZE}, ${OPP_CELL_PX}px)`,
              gap: 2,
              padding: 2,
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 10,
              border: '1.5px solid rgba(255,107,168,0.08)',
            }}
          >
            {oppGrid.map((row, r) =>
              row.map((cell, c) => (
                <motion.div
                  key={`opp-${r},${c}`}
                  className="flex items-center justify-center font-display select-none"
                  style={{
                    width: OPP_CELL_PX,
                    height: OPP_CELL_PX,
                    fontSize: '0.9rem',
                    borderRadius: 5,
                    background: cell ? 'rgba(255,107,168,0.12)' : 'rgba(255,255,255,0.02)',
                    border: cell ? '2px solid rgba(255,107,168,0.32)' : '1px solid rgba(255,255,255,0.04)',
                    color: '#FF6BA8',
                    boxShadow: cell ? '0 1px 0 rgba(0,0,0,0.3)' : 'none',
                  }}
                  animate={cell ? { scale: [1.15, 1] } : {}}
                  transition={{ duration: 0.25 }}
                >
                  {cell?.letter ?? ''}
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Scroll back up cue (mobile only) */}
        <motion.button
          onClick={() => rootRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex-none md:hidden flex flex-col items-center py-3 gap-0.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <motion.span
            className="text-base leading-none"
            style={{ color: 'rgba(255,255,255,0.3)' }}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            ↑
          </motion.span>
          <span className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Back to your board</span>
        </motion.button>
      </div>

      {/* Leave Game button (multiplayer only) */}
      {isMultiplayer && phase === 'playing' && mp.bothPresent && (
        <button
          onClick={() => setShowLeaveDialog(true)}
          className="fixed bottom-4 left-4 z-20 font-body text-xs px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(255,61,113,0.15)', border: '1px solid #FF3D71', color: '#FF3D71' }}
        >
          Leave Game
        </button>
      )}

      {/* Bottom neon bar */}
      <div className="fixed bottom-0 left-0 right-0 h-[3px] pointer-none"
        style={{ background: 'linear-gradient(90deg, #FF6BA8, #FFE66D, #4EFFC4, #B565FF, #FF6BA8)', boxShadow: '0 0 14px rgba(78,255,196,0.7)' }}
      />
    </div>
  );
}
