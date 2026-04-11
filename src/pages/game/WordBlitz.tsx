/**
 * Word Blitz – fast-paced crossword builder
 * 2-minute timer, most points wins
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useAuthStore } from '../../store/authStore';
import { usePostGameRedirect } from '../../lib/usePostGameRedirect';
import { FirstGameFeedbackModal } from '../../components/feedback/FirstGameFeedbackModal';
import { useFirstGameFeedback } from '../../components/feedback/useFirstGameFeedback';
import { useMultiplayerGame } from '../../lib/useMultiplayerGame';
import { isValidWord, isWordListLoaded, preloadWordList, scoreWord } from '../../utils/wordList';
import { abandonGame, getProfile, updateWordBlitzPlayerSlice, updateWordBlitzStartedAt, finishWordBlitzGame } from '../../lib/database';
import { supabase } from '../../lib/supabase';
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
const GAME_SECONDS = 120;        // 2 minutes

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

type GWPlayerSlice = { grid: (string | null)[][]; score: number };

type GWState = {
  ready: Record<string, unknown>;
  present: Record<string, boolean>;
  player1?: GWPlayerSlice;
  player2?: GWPlayerSlice;
  started_at?: string;
};

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

const BOT_OPPONENT = { name: 'Zara', character: 'phoenix' };

// ─── Grid utilities ───────────────────────────────────────────────────────────

function emptyGrid(): GridCell[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

function emptyLetterMatrix(): (string | null)[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

function gridToLetterMatrix(grid: GridCell[][]): (string | null)[][] {
  return grid.map((row) => row.map((cell) => (cell ? cell.letter : null)));
}

function lettersToGridLettersOnly(letters: (string | null)[][] | undefined | null): GridCell[][] {
  const base = letters ?? emptyLetterMatrix();
  return base.map((row, r) => row.map((cell, c) => (cell ? { letterId: `opp-${r}-${c}`, letter: cell } : null)));
}

function lettersToGridWithPrefix(prefix: string, letters: (string | null)[][] | undefined | null): GridCell[][] {
  const base = letters ?? emptyLetterMatrix();
  return base.map((row, r) => row.map((cell, c) => (cell ? { letterId: `${prefix}-${r}-${c}`, letter: cell } : null)));
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

function SetupScreen({ onGo, myCharacter, myName, opponentCharacter, opponentName }: {
  onGo: () => void;
  myCharacter: string;
  myName: string;
  opponentCharacter: string;
  opponentName: string;
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
          <span className="font-body text-ui-body font-bold" style={{ color: '#4EFFC4' }}>{myName}</span>
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
            <img src={characterImages[opponentCharacter]} alt="" className="w-14 h-14 object-contain" draggable={false} />
          </div>
          <span className="font-body text-ui-body font-bold" style={{ color: '#FF6BA8' }}>{opponentName}</span>
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
        <p className="font-body text-ui-body" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Build connecting words from your letters
        </p>
        <p className="font-body text-ui-body mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
          2 minutes · Most points wins
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

function ResultScreen({ myScore, oppScore, myName, myCharacter, oppName, oppCharacter, onPlayAgain, onChat }: {
  myScore: number; oppScore: number;
  myName: string; myCharacter: string;
  oppName: string; oppCharacter: string;
  onPlayAgain: () => void; onChat: () => void;
}) {
  const isDraw = myScore === oppScore;
  const won = myScore > oppScore;
  const lost = myScore < oppScore;
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 px-6 overflow-y-auto"
      style={{ background: '#0A1628' }}
    >
      {/* Result heading */}
      <motion.div
        className="text-center"
        initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      >
        <div className="font-display text-6xl mb-2"
          style={{
            color: isDraw ? '#4EFFC4' : won ? '#4EFFC4' : '#FF6BA8',
            textShadow: `0 0 30px ${
              isDraw ? 'rgba(78,255,196,0.7)' : won ? 'rgba(78,255,196,0.7)' : 'rgba(255,107,168,0.7)'
            }`,
          }}
        >
          {isDraw ? "IT'S A DRAW!" : won ? 'YOU WIN!' : 'THEY WIN!'}
        </div>
        <div className="font-display text-xl" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {isDraw ? '🤝 Neck and neck' : won ? '🏆 Word Master' : '✦ Nice Try!'}
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
          <span className="font-body text-ui-body" style={{ color: 'rgba(255,255,255,0.6)' }}>{myName}</span>
          <span className="font-display text-3xl" style={{ color: won || isDraw ? '#4EFFC4' : 'rgba(255,255,255,0.8)' }}>{myScore}</span>
        </div>
        <div className="font-display text-2xl" style={{ color: 'rgba(255,255,255,0.2)' }}>vs</div>
        <div className="flex flex-col items-center gap-2">
          <img src={characterImages[oppCharacter]} alt="" className="w-14 h-14 object-contain" draggable={false} />
          <span className="font-body text-ui-body" style={{ color: 'rgba(255,255,255,0.6)' }}>{oppName}</span>
          <span className="font-display text-3xl" style={{ color: lost ? '#FF6BA8' : 'rgba(255,255,255,0.8)' }}>{oppScore}</span>
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
          className="font-body text-ui-body text-center"
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

function poolIndexFromId(id: string): number {
  const parts = id.split('-');
  const parsed = Number(parts[parts.length - 1]);
  return Number.isFinite(parsed) ? parsed : -1;
}

// ─── Main game screen ─────────────────────────────────────────────────────────

export function WordBlitz() {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const { user } = useAuthStore();
  const { character, name } = useOnboardingStore();
  const myUserId = user?.id ?? '';

  const myChar = character || 'fox';
  const myName = name || 'Alex';
  const seed   = matchId || 'demo';

  // ── Phase ─────────────────────────────────────────────────────────────────
  const isMultiplayer = !!matchId && matchId !== 'demo';
  const [phase, setPhase] = useState<Phase>('setup');

  const mp = useMultiplayerGame<GWState>({
    matchId: matchId ?? '',
    gameType: 'word_blitz',
    enabled: isMultiplayer,
  });
  const [myProfileName, setMyProfileName] = useState<string | null>(null);
  const [myProfileCharacter, setMyProfileCharacter] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [opponentCharacter, setOpponentCharacter] = useState<string | null>(null);
  const [firstGameFeedbackDone, setFirstGameFeedbackDone] = useState(false);

  useEffect(() => {
    if (!isMultiplayer || !myUserId) return;
    let cancelled = false;
    (async () => {
      const { data } = await getProfile(myUserId);
      if (cancelled || !data) return;
      if (data.name) setMyProfileName(data.name);
      if (data.character) setMyProfileCharacter(data.character);
    })();
    return () => {
      cancelled = true;
    };
  }, [isMultiplayer, myUserId]);

  useEffect(() => {
    if (!isMultiplayer || !mp.opponentId) return;
    let cancelled = false;
    (async () => {
      const { data } = await getProfile(mp.opponentId);
      if (cancelled || !data) return;
      if (data.name) setOpponentName(data.name);
      if (data.character) setOpponentCharacter(data.character);
    })();
    return () => {
      cancelled = true;
    };
  }, [isMultiplayer, mp.opponentId]);

  const myDisplayName = isMultiplayer ? (myProfileName ?? myName) : myName;
  const myDisplayCharacter = isMultiplayer ? (myProfileCharacter ?? myChar) : myChar;
  const opponentDisplayName = isMultiplayer ? (opponentName ?? 'Opponent') : BOT_OPPONENT.name;
  const opponentDisplayCharacter = isMultiplayer ? (opponentCharacter ?? BOT_OPPONENT.character) : BOT_OPPONENT.character;

  const firstGameFeedback = useFirstGameFeedback(myUserId || undefined, { enabled: phase === 'result' });
  const firstGameFeedbackBlocking =
    phase === 'result' && (firstGameFeedback.loading || (firstGameFeedback.show && !firstGameFeedbackDone));

  usePostGameRedirect({ isMultiplayer, matchId: matchId ?? null, phase, block: firstGameFeedbackBlocking });

  // ── Multiplayer rules state ────────────────────────────────────────────
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const { graceActive, showForfeit } = useReconnectGrace(
    isMultiplayer, mp.bothPresent, mp.opponentLeft, phase,
  );

  useBeforeUnload(isMultiplayer && phase === 'playing' && mp.playSessionActive);
  useOpponentLeftRedirect(showForfeit, matchId ?? null, 'opponent');

  const leavingRef = useRef(false);
  const handleLeaveConfirm = async () => {
    leavingRef.current = true;
    if (mp.gameRow?.id) await abandonGame(mp.gameRow.id);
    navigate(`/match/${matchId}`);
  };

  // ── Timer ─────────────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtWriteForGameRef = useRef<string | null>(null);
  const timerSyncedStartedAtRef = useRef<string | null>(null);

  // ── Pool & grid ───────────────────────────────────────────────────────────
  const [pool, setPool] = useState<PoolLetter[]>(() =>
    seededLetters(seed).map((l, i) => ({
      id: `${l}-${i}`,
      letter: l,
      rotation: (Math.random() - 0.5) * 10,
    }))
  );
  const [dictionaryReady, setDictionaryReady] = useState(isWordListLoaded());
  const [grid, setGrid] = useState<GridCell[][]>(emptyGrid);
  const gridRef = useRef<GridCell[][]>(grid);
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  // ── Selection ─────────────────────────────────────────────────────────────
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);

  // ── Scores ────────────────────────────────────────────────────────────────
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const oppSliceRef = useRef<GWPlayerSlice | null>(null);
  const finishHandledRef = useRef(false);

  // Throttled Word Blitz DB writes (multiplayer only)
  const wordBlitzLastWriteAtRef = useRef(0);
  const wordBlitzPendingWriteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordBlitzLatestSliceRef = useRef<{ letters: (string | null)[][]; score: number } | null>(null);
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
        if (isMultiplayer) {
          const { score } = validateGrid(gridRef.current);
          setMyScore(score);
          setOppScore(oppSliceRef.current?.score ?? 0);
        }
        setPhase('result');
      }
    }, 1000);
  }, [isMultiplayer]);

  const syncTimerFromStartedAt = useCallback((startedAtIso: string): boolean => {
    const startedAtMs = Date.parse(startedAtIso);
    if (!Number.isFinite(startedAtMs)) return false;
    const elapsed = Math.floor((Date.now() - startedAtMs) / 1000);
    const elapsedClamped = Math.max(0, elapsed);
    const remaining = GAME_SECONDS - elapsedClamped;
    const remainingClamped = Math.max(0, remaining);

    elapsedRef.current = elapsedClamped;
    setTimeLeft(remainingClamped);

    if (remainingClamped <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const { score } = validateGrid(gridRef.current);
      setMyScore(score);
      setOppScore(oppSliceRef.current?.score ?? 0);
      setPhase('result');
      return true;
    }
    return false;
  }, []);

  // Preload dictionary during setup/route entry.
  useEffect(() => {
    let active = true;
    preloadWordList()
      .then(() => {
        if (active) setDictionaryReady(true);
      })
      .catch((err) => {
        console.error('[WordBlitz] Failed to preload dictionary', err);
      });
    return () => {
      active = false;
    };
  }, []);

  // ─── Start game ───────────────────────────────────────────────────────────
  const startGame = useCallback(async () => {
    if (!dictionaryReady) {
      try {
        await preloadWordList();
        setDictionaryReady(true);
      } catch (err) {
        console.error('[WordBlitz] Dictionary unavailable; cannot start game', err);
        return;
      }
    }
    elapsedRef.current = 0;
    setTimeLeft(GAME_SECONDS);
    setPhase('playing');
    // Solo: start timer immediately. MP: timer starts when playSessionActive (see effect below).
    if (!isMultiplayer) startTimer();
  }, [dictionaryReady, isMultiplayer, startTimer]);

  // ─── MP: persist started_at once when game starts for both players ──────────
  useEffect(() => {
    if (!isMultiplayer || phase !== 'playing' || !mp.playSessionActive || !mp.gameRow?.id) return;
    const gs = mp.gameState as GWState | null;
    if (gs?.started_at) return;
    if (startedAtWriteForGameRef.current === mp.gameRow.id) return;
    startedAtWriteForGameRef.current = mp.gameRow.id;

    const startedAt = new Date().toISOString();
    (async () => {
      try {
        await updateWordBlitzStartedAt(mp.gameRow!.id, startedAt);
      } catch (err) {
        console.error('[WordBlitz] write started_at threw:', err);
        // Allow retry on next effect run if RPC fails transiently.
        startedAtWriteForGameRef.current = null;
      }
    })();
  }, [isMultiplayer, phase, mp.playSessionActive, mp.gameRow?.id, mp.gameState]);

  // ─── MP: hydrate countdown from server start time on refresh/reconnect ──────
  useEffect(() => {
    if (!isMultiplayer || phase !== 'playing') return;
    const startedAt = (mp.gameState as GWState | null)?.started_at;
    if (!startedAt) return;
    if (timerSyncedStartedAtRef.current === startedAt) return;
    timerSyncedStartedAtRef.current = startedAt;
    void syncTimerFromStartedAt(startedAt);
  }, [isMultiplayer, phase, mp.gameState, syncTimerFromStartedAt]);

  // ─── MP: start timer once both players are present ─────────────────────────
  useEffect(() => {
    const startedAt = (mp.gameState as GWState | null)?.started_at;
    if (!isMultiplayer || phase !== 'playing') return;
    if (!startedAt) return; // wait until started_at is confirmed
    const expired = syncTimerFromStartedAt(startedAt);
    if (expired) return;
    startTimer();
  }, [isMultiplayer, phase, mp.gameState, startTimer, syncTimerFromStartedAt]);

  // ── Multiplayer: hydrate local state from DB + enter play (mirrors Draughts) ──
  useEffect(() => {
    if (!isMultiplayer || mp.loading || !mp.gameState) return;
    const gs = mp.gameState as GWState;

    const mySlice = gs[mp.myRole];
    if (mySlice?.grid) {
      setGrid(lettersToGridWithPrefix('me', mySlice.grid));
      setMyScore(typeof mySlice.score === 'number' ? mySlice.score : 0);
    }

    const oppRole = mp.myRole === 'player1' ? 'player2' : 'player1';
    const oppSlice = gs[oppRole];
    if (oppSlice?.grid) {
      oppSliceRef.current = oppSlice;
      setOppScore(typeof oppSlice.score === 'number' ? oppSlice.score : 0);
      setOppGrid(lettersToGridLettersOnly(oppSlice.grid));
    }

    setPhase('playing');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mp.loading]);

  // ── Multiplayer: ensure state.present exists + persist my presence ─────────
  useEffect(() => {
    if (!isMultiplayer || mp.loading || !mp.gameRow?.id || !mp.gameState || !myUserId) return;
    const gs = mp.gameState as GWState;
    const present = (gs.present ?? {}) as Record<string, boolean>;
    if (present[myUserId]) return;

    (async () => {
      try {
        if (!supabase) return;
        const merged: GWState = {
          ...gs,
          present: { ...present, [myUserId]: true },
        };
        const { error } = await supabase
          .from('games')
          .update({ state: merged as unknown as Record<string, unknown> })
          .eq('id', mp.gameRow!.id);
        if (error) {
          console.error('[WordBlitz] ensure present failed:', error.message);
        }
      } catch (err) {
        console.error('[WordBlitz] ensure present threw:', err);
      }
    })();
  }, [isMultiplayer, mp.loading, mp.gameRow?.id, mp.gameState, myUserId]);

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

  // ── Multiplayer: extract opponent slice from games.state ───────────────
  useEffect(() => {
    if (!isMultiplayer || phase !== 'playing') return;
    const gs = mp.gameState;
    if (!gs) return;

    const oppRole = mp.myRole === 'player1' ? 'player2' : 'player1';
    const slice = (gs as GWState)[oppRole];

    if (!slice || !slice.grid) {
      oppSliceRef.current = null;
      setOppScore(0);
      setOppGrid(emptyGrid());
      return;
    }

    oppSliceRef.current = slice;
    setOppScore(typeof slice.score === 'number' ? slice.score : 0);
    setOppGrid(lettersToGridLettersOnly(slice.grid));
  }, [isMultiplayer, phase, mp.gameState, mp.myRole]);

  // ── Multiplayer: throttle-save my slice into games.state ────────────
  useEffect(() => {
    if (!isMultiplayer || phase !== 'playing' || !mp.gameRow?.id) return;

    const gameId = mp.gameRow.id;
    const letters = gridToLetterMatrix(grid);
    const { score } = validateGrid(grid);

    wordBlitzLatestSliceRef.current = { letters, score };

    const minIntervalMs = 2000; // max once per 2 seconds
    const now = Date.now();
    const sinceLast = now - wordBlitzLastWriteAtRef.current;

    // Clear any scheduled write; we'll either execute immediately or re-schedule below.
    if (wordBlitzPendingWriteTimeoutRef.current) {
      clearTimeout(wordBlitzPendingWriteTimeoutRef.current);
      wordBlitzPendingWriteTimeoutRef.current = null;
    }

    const executeWrite = async () => {
      const latest = wordBlitzLatestSliceRef.current;
      if (!latest) return;
      wordBlitzLastWriteAtRef.current = Date.now();
      try {
        await updateWordBlitzPlayerSlice(gameId, latest.letters, latest.score);
      } catch (err) {
        console.error('[WordBlitz] updateWordBlitzPlayerSlice failed:', err);
        try {
          if (!supabase) return;
          let baseState = mp.gameState as GWState | null;
          if (!baseState) {
            const { data, error } = await supabase
              .from('games')
              .select('state')
              .eq('id', gameId)
              .single();
            if (error) {
              console.error('[WordBlitz] fallback games.select(state) failed:', error.message);
              return;
            }
            baseState = (data?.state ?? { ready: {}, present: {} }) as GWState;
          }
          const merged: GWState = {
            ...baseState,
            [mp.myRole]: { grid: latest.letters, score: latest.score },
          };
          const { error } = await supabase
            .from('games')
            .update({ state: merged as unknown as Record<string, unknown> })
            .eq('id', gameId);
          if (error) {
            console.error('[WordBlitz] fallback games.update failed:', error.message);
          }
        } catch (fallbackErr) {
          console.error('[WordBlitz] fallback games.update threw:', fallbackErr);
        }
      }
    };

    if (sinceLast >= minIntervalMs) {
      void executeWrite();
      return;
    }

    const remaining = minIntervalMs - sinceLast;
    wordBlitzPendingWriteTimeoutRef.current = setTimeout(() => {
      wordBlitzPendingWriteTimeoutRef.current = null;
      void executeWrite();
    }, remaining);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, phase, isMultiplayer, mp.gameRow?.id]);

  useEffect(() => {
    if (!isMultiplayer || phase === 'playing') return;
    if (wordBlitzPendingWriteTimeoutRef.current) {
      clearTimeout(wordBlitzPendingWriteTimeoutRef.current);
      wordBlitzPendingWriteTimeoutRef.current = null;
    }
  }, [isMultiplayer, phase]);

  // ─── Multiplayer: guarded game finish (writes winner once) ─────────────
  useEffect(() => {
    if (!isMultiplayer || phase !== 'result' || !mp.gameRow?.id) return;
    if (finishHandledRef.current) return;
    finishHandledRef.current = true;

    const runFinish = async () => {
      try {
        const gameId = mp.gameRow!.id;
        const myGrid = gridRef.current;
        const { score: myFinalScore } = validateGrid(myGrid);
        const myLetters = gridToLetterMatrix(myGrid);

        const oppSlice = oppSliceRef.current;
        const oppLetters = oppSlice?.grid ?? emptyLetterMatrix();
        const oppFinalScore = typeof oppSlice?.score === 'number' ? oppSlice.score : 0;

        const myRoleKey = mp.myRole;
        const oppRoleKey = myRoleKey === 'player1' ? 'player2' : 'player1';

        const mySlice: GWPlayerSlice = { grid: myLetters, score: myFinalScore };
        const opponentSlice: GWPlayerSlice = { grid: oppLetters, score: oppFinalScore };

        const baseState = (mp.gameState ?? { ready: {}, present: {} }) as GWState;
        const finalState: GWState = {
          ...baseState,
          player1: myRoleKey === 'player1' ? mySlice : opponentSlice,
          player2: myRoleKey === 'player2' ? mySlice : opponentSlice,
        };

        const winner: 'player1' | 'player2' | 'draw' =
          myFinalScore > oppFinalScore ? myRoleKey
            : myFinalScore < oppFinalScore ? oppRoleKey
              : 'draw';

        // Push final slice immediately to reduce "missing last update" races.
        await updateWordBlitzPlayerSlice(gameId, myLetters, myFinalScore);
        await finishWordBlitzGame(gameId, finalState, winner);
      } catch (err) {
        console.error('[WordBlitz] finishWordBlitzGame failed:', err);
      }
    };

    void runFinish();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMultiplayer, phase, mp.gameRow?.id, mp.myRole, mp.gameState]);


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

  // Shuffle/Clear removed — keep controls minimal/obvious.

  // ─── Timer display ────────────────────────────────────────────────────────
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerStr = `${mins}:${String(secs).padStart(2, '0')}`;
  const timerColor = timeLeft < 60 ? '#FF4444' : '#FFE66D';
  const timerGlow  = timeLeft < 60 ? 'rgba(255,68,68,0.7)' : 'rgba(255,230,109,0.6)';

  // ─── Filled count for "all letters" bonus hint ────────────────────────────
  const filledCount = grid.flat().filter(Boolean).length;
  const allUsed = filledCount === 21 && pool.length === 0;

  useEffect(() => {
    if (phase === 'result') {
      window.history.replaceState(null, '', `/matches`);
    }
  }, [phase]);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <SetupScreen
        onGo={startGame}
        myCharacter={myDisplayCharacter}
        myName={myDisplayName}
        opponentCharacter={opponentDisplayCharacter}
        opponentName={opponentDisplayName}
      />
    );
  }

  if (phase === 'result') {
    return (
      <>
        <ResultScreen
          myScore={myScore} oppScore={oppScore}
          myName={myDisplayName}
          myCharacter={myDisplayCharacter}
          oppName={opponentDisplayName}
          oppCharacter={opponentDisplayCharacter}
          onPlayAgain={() => { setPhase('setup'); setGrid(emptyGrid()); setPool(seededLetters(seed).map((l,i)=>({id:`${l}-${i}`,letter:l,rotation:(Math.random()-0.5)*10}))); setMyScore(0); setOppScore(0); setTimeLeft(GAME_SECONDS); botMovesDone.current.clear(); setOppGrid(emptyGrid()); setOppWords([]); }}
          onChat={() => {
            if (matchId) localStorage.setItem(`first_game_played_${matchId}`, 'true');
            if (matchId) navigate(`/match/${matchId}`); else navigate('/matches');
          }}
        />
        {firstGameFeedback.show && !firstGameFeedbackDone && myUserId ? (
          <FirstGameFeedbackModal userId={myUserId} onClose={() => setFirstGameFeedbackDone(true)} />
        ) : null}
      </>
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
      {/* Multiplayer overlays */}
      {isMultiplayer && (
        <>
          <WaitingForOpponentOverlay visible={phase === 'playing' && !mp.playSessionActive} opponentName={opponentDisplayName} matchId={matchId!} />
          <ReconnectOverlay visible={graceActive} opponentName={opponentDisplayName} />
          <OpponentLeftOverlay visible={showForfeit} opponentName={opponentDisplayName} />
          <AnimatePresence>
            {mp.moveError && (
              <motion.div
                className="fixed top-20 left-1/2 z-[120] -translate-x-1/2 px-4 py-2 rounded-2xl font-body text-ui-label font-bold text-white text-center"
                style={{
                  background: 'rgba(255,61,113,0.18)',
                  border: '1.5px solid rgba(255,61,113,0.55)',
                  backdropFilter: 'blur(10px)',
                }}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                role="status"
                aria-live="polite"
              >
                {mp.moveError}
              </motion.div>
            )}
          </AnimatePresence>
          <LeaveGameDialog visible={showLeaveDialog} opponentName={opponentDisplayName} onStay={() => setShowLeaveDialog(false)} onLeave={handleLeaveConfirm} />
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
              <img src={characterImages[myDisplayCharacter]} alt="" className="w-6 h-6 object-contain" draggable={false} />
            </div>
            <div>
              <p className="font-body text-ui-caption" style={{ color: 'rgba(255,255,255,0.35)' }}>YOU</p>
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
              <p className="font-body text-ui-caption text-right" style={{ color: 'rgba(255,255,255,0.35)' }}>{opponentDisplayName.toUpperCase()}</p>
              <div className="flex items-center gap-1">
                <p className="font-display text-xl leading-none text-right" style={{ color: '#FF6BA8', textShadow: '0 0 10px rgba(255,107,168,0.5)' }}>{oppScore}</p>
                <AnimatePresence>
                  {oppPopup && (
                    <motion.span
                      className="font-body text-ui-label font-bold"
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
              <img src={characterImages[opponentDisplayCharacter]} alt="" className="w-6 h-6 object-contain" draggable={false} />
            </div>
          </div>
        </header>

        {/* Opponent score popup */}
        <AnimatePresence>
          {oppPopup && (
            <motion.div
              className="fixed top-16 right-4 z-30 px-3 py-1.5 rounded-lg font-body text-ui-body font-bold"
              style={{ background: 'rgba(255,107,168,0.15)', border: '1.5px solid rgba(255,107,168,0.4)', color: '#FF6BA8' }}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            >
              {opponentDisplayName}: {oppPopup} 🔥
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
              <span className="font-body text-ui-label font-bold px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(255,255,255,0.06)', color, border: `1px solid ${color}33` }}
              >
                {label}
              </span>
              <span className="font-mono text-ui-caption" style={{ color: 'rgba(255,255,255,0.3)' }}>={pts}pts</span>
            </div>
          ))}
          <span className="font-body text-ui-caption ml-1" style={{ color: 'rgba(78,255,196,0.5)' }}>· all used +50</span>
        </div>

        {/* ── Letter pool ──────────────────────────────────────────────────── */}
        <div
          className="flex-none px-3 py-2.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
        >
          <div
            className="grid justify-center gap-2 pb-1"
            style={{ gridTemplateColumns: 'repeat(7, 44px)' }}
          >
            {Array.from({ length: 21 }, (_, idx) => {
              const slot = pool.find((pl) => poolIndexFromId(pl.id) === idx);
              if (!slot) {
                return (
                  <div
                    key={`slot-${idx}`}
                    className="w-11 h-11 rounded-lg"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1.5px dashed rgba(255,255,255,0.08)',
                    }}
                  />
                );
              }
              return (
                <PoolTile
                  key={slot.id}
                  pl={slot}
                  selected={selectedPoolId === slot.id}
                  onClick={() => handlePoolTap(slot.id)}
                />
              );
            })}
          </div>
          {pool.length === 0 && (
            <div className="flex items-center justify-center pt-1">
              <span className="font-body text-ui-caption" style={{ color: allUsed ? '#4EFFC4' : 'rgba(255,255,255,0.7)' }}>
                {allUsed ? '✓ All letters placed! +50 bonus' : 'No letters left'}
              </span>
            </div>
          )}
          {pool.length > 0 && (
            <div className="flex items-center justify-center pt-1">
              <span className="font-body text-ui-caption" style={{ color: 'rgba(255,255,255,0.28)' }}>
                Tap a letter to start
              </span>
            </div>
          )}
        </div>

        {/* ── Grid board area ──────────────────────────────────────────────── */}
        <div className="flex-none overflow-auto flex items-start justify-center p-3" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          <div className="relative">
            <AnimatePresence>
              {scorePopups.map((popup) => (
                <motion.div
                  key={popup.id}
                  className="absolute z-20 pointer-events-none font-body text-ui-body font-bold whitespace-nowrap"
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

        {/* ── Scroll cue (mobile only) ─────────────────────────────────────── */}
        <motion.button
          onClick={() => oppSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="flex-none md:hidden w-full flex flex-col items-center py-2 gap-0.5"
          style={{ background: 'rgba(78,255,196,0.03)', borderTop: '1px solid rgba(78,255,196,0.12)' }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="font-body text-ui-caption font-semibold" style={{ color: '#4EFFC4' }}>
            They're building words too! Peek at {opponentDisplayName}'s board
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
              <img src={characterImages[opponentDisplayCharacter]} alt="" className="w-7 h-7 object-contain" draggable={false} />
            </div>
            <div>
              <p className="font-display text-sm" style={{ color: '#FF6BA8', letterSpacing: '0.1em' }}>
                {opponentDisplayName.toUpperCase()}'S BOARD
              </p>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF6BA8', boxShadow: '0 0 4px #FF6BA8' }} />
                <span className="font-body text-ui-caption" style={{ color: 'rgba(255,255,255,0.35)' }}>Live</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AnimatePresence>
              {oppPopup && (
                <motion.div
                  className="font-body text-ui-label font-bold px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(255,107,168,0.15)', color: '#FF6BA8', border: '1px solid rgba(255,107,168,0.3)' }}
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                >
                  {oppPopup} 🔥
                </motion.div>
              )}
            </AnimatePresence>
            <div className="text-right">
              <p className="font-body text-ui-caption" style={{ color: 'rgba(255,255,255,0.7)' }}>SCORE</p>
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
                className="font-body text-ui-caption px-2 py-0.5 rounded-md font-bold flex items-center gap-1"
                style={{ background: 'rgba(255,107,168,0.1)', color: '#FF6BA8', border: '1px solid rgba(255,107,168,0.25)' }}
              >
                {w.toUpperCase()}
                <span style={{ opacity: 0.6, fontSize: '12px' }}>+{scoreWord(w)}</span>
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
          <span className="font-body text-ui-caption" style={{ color: 'rgba(255,255,255,0.25)' }}>Back to your board</span>
        </motion.button>
      </div>

      {/* Leave Game button (multiplayer only) */}
      {isMultiplayer && phase === 'playing' && mp.playSessionActive && (
        <button
          onClick={() => setShowLeaveDialog(true)}
          className="fixed bottom-4 left-4 z-20 font-body text-ui-caption px-3 py-1.5 rounded-lg"
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
