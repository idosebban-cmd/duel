/**
 * GameBoard – Guess Who (Supabase multiplayer via useMultiplayerGame)
 *
 * Replaces the old Socket.IO implementation. All game state lives in
 * the `games.state` JSONB column and is polled every 2.5 s by the hook.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { useMultiplayerGame } from '../../lib/useMultiplayerGame';
import { generateGuessWhoBoard } from '../../lib/guessWhoCharacters';
import { getMySecret, checkGuess } from '../../lib/database';
import { CharacterCard } from '../../components/game/CharacterCard';
import { GuessModal } from '../../components/game/GuessModal';
import type { Character } from '../../types/game';

// ── DB state shape ──────────────────────────────────────────────────────────

interface GWTurnHistory {
  asker: 'player1' | 'player2';
  question: string;
  answer: 'yes' | 'no';
}

interface GuessWhoState {
  characters: Character[];
  p1Flipped: string[];
  p2Flipped: string[];
  turnPhase: 'ask' | 'answer' | 'flip';
  currentQuestion: string | null;
  currentAnswer: 'yes' | 'no' | null;
  turnHistory: GWTurnHistory[];
  moveCount: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const PLACEHOLDER_EXAMPLES = [
  'Does your person wear glasses?',
  'Does your person have long hair?',
  'Is your person a woman?',
  'Does your person wear a hat?',
  'Does your person have facial hair?',
  'Is your person older?',
  'Does your person have blonde hair?',
];

function validateQuestion(q: string): string | null {
  if (!q || q.trim().length < 5) return 'Question too short (min 5 characters)';
  if (q.trim().length > 100) return 'Too long (max 100 characters)';
  if (!q.trim().endsWith('?')) return 'Yes/no questions must end with "?"';
  return null;
}

function WaitingDots() {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-white/40"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function GameBoard() {
  // Route param is actually the matchId (set by LobbyScreen)
  const { gameId: matchId } = useParams<{ gameId: string }>();
  console.log('[GameBoard] mounted — matchId from useParams:', matchId);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const store = useGameStore();
  const myUserId = user?.id ?? '';

  // Generate the deterministic board from matchId
  const boardRef = useRef(matchId ? generateGuessWhoBoard(matchId) : null);

  const initialState: GuessWhoState = boardRef.current
    ? {
        characters: boardRef.current.characters,
        p1Flipped: [],
        p2Flipped: [],
        turnPhase: 'ask',
        currentQuestion: null,
        currentAnswer: null,
        turnHistory: [],
        moveCount: 0,
      }
    : {
        characters: [],
        p1Flipped: [],
        p2Flipped: [],
        turnPhase: 'ask',
        currentQuestion: null,
        currentAnswer: null,
        turnHistory: [],
        moveCount: 0,
      };

  const mp = useMultiplayerGame<GuessWhoState>({
    matchId: matchId ?? '',
    gameType: 'guess_who',
    initialState,
    enabled: !!matchId,
  });

  const myRole = mp.myRole;
  const gs = mp.gameState;
  const isMyTurn = mp.isMyTurn;

  // ── Local UI state ──────────────────────────────────────────────
  const [question, setQuestion] = useState('');
  const [showGuessModal, setShowGuessModal] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mySecretId, setMySecretId] = useState('');
  const [isGuessing, setIsGuessing] = useState(false);

  // ── Load my secret from game_secrets table ─────────────────────
  useEffect(() => {
    if (!mp.gameId) return;
    let cancelled = false;
    (async () => {
      const charId = await getMySecret(mp.gameId!);
      if (!cancelled && charId) setMySecretId(charId);
    })();
    return () => { cancelled = true; };
  }, [mp.gameId]);

  // ── Elapsed timer ─────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Cycle placeholder ─────────────────────────────────────────
  useEffect(() => {
    if (question.length > 0) return;
    const t = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 3000);
    return () => clearInterval(t);
  }, [question.length]);

  // ── Detect game over from polling ─────────────────────────────
  const navigatedRef = useRef(false);
  useEffect(() => {
    if (!mp.gameRow || !gs || navigatedRef.current) return;
    const winner = mp.gameRow.winner;
    if (!winner) return;

    navigatedRef.current = true;
    navigate(`/game/${matchId}/result`, {
      state: {
        winner,
        myRole,
        myUserId,
        opponentId: mp.opponentId,
        gameId: mp.gameRow.id,
        characters: gs.characters,
        matchId,
        turnHistory: gs.turnHistory ?? [],
        gameRowPlayer1Id: mp.gameRow.player1_id,
        gameRowPlayer2Id: mp.gameRow.player2_id,
      },
    });
  }, [mp.gameRow?.winner, mp.gameRow?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Self-heal stale DB row with empty state ────────────────────
  const healedRef = useRef(false);
  useEffect(() => {
    if (!gs || healedRef.current) return;
    if (gs.characters && gs.characters.length > 0) return;
    // State is empty/incomplete — re-initialize it
    healedRef.current = true;
    console.warn('[GameBoard] stale game state detected — re-initializing');
    mp.submitMove({ type: 'heal_init' }, initialState);
  }, [gs]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived values ────────────────────────────────────────────
  const characters = gs?.characters ?? [];
  const myFlipped = gs ? (myRole === 'player1' ? gs.p1Flipped : gs.p2Flipped) ?? [] : [];
  const myChar = characters.find((c) => c.id === mySecretId);
  const turnPhase = gs?.turnPhase ?? 'ask';
  const currentQuestion = gs?.currentQuestion ?? null;
  const currentAnswer = gs?.currentAnswer ?? null;
  const turnHistory = gs?.turnHistory ?? [];
  const canFlip = isMyTurn && turnPhase === 'flip';

  // ── Move handlers ─────────────────────────────────────────────

  const handleAskQuestion = useCallback(() => {
    if (!gs || !isMyTurn) return;
    const q = question.trim();
    const err = validateQuestion(q);
    if (err) { setErrorMsg(err); setTimeout(() => setErrorMsg(null), 3000); return; }

    const newState: GuessWhoState = {
      ...gs,
      turnPhase: 'answer',
      currentQuestion: q,
      currentAnswer: null,
      moveCount: gs.moveCount + 1,
    };
    // Turn swaps to opponent (they answer)
    mp.submitMove({ type: 'ask', question: q }, newState);
    setQuestion('');
  }, [gs, isMyTurn, question, mp]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = useCallback((answer: 'yes' | 'no') => {
    if (!gs || !isMyTurn) return;

    const newHistory: GWTurnHistory[] = [
      ...gs.turnHistory,
      {
        asker: myRole === 'player1' ? 'player2' : 'player1', // opponent asked
        question: gs.currentQuestion ?? '',
        answer,
      },
    ];

    const newState: GuessWhoState = {
      ...gs,
      turnPhase: 'flip',
      currentAnswer: answer,
      turnHistory: newHistory,
      moveCount: gs.moveCount + 1,
    };
    // Turn swaps back to asker (they flip cards)
    mp.submitMove({ type: 'answer', answer }, newState);
  }, [gs, isMyTurn, myRole, mp]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirmFlips = useCallback(() => {
    if (!gs || !isMyTurn || store.pendingFlips.length === 0) return;

    const flippedKey = myRole === 'player1' ? 'p1Flipped' : 'p2Flipped';
    const newFlipped = [...new Set([...gs[flippedKey], ...store.pendingFlips])];

    const newState: GuessWhoState = {
      ...gs,
      [flippedKey]: newFlipped,
      moveCount: gs.moveCount + 1,
    };
    // Flip doesn't change turn — still asker's turn to end
    // We need to submit WITHOUT swapping turn. But the hook always swaps.
    // So we combine flip + end_turn into a single submit that also resets phase.
    const finalState: GuessWhoState = {
      ...newState,
      turnPhase: 'ask',
      currentQuestion: null,
      currentAnswer: null,
    };
    // Turn swaps to opponent (new round)
    mp.submitMove({ type: 'flip_and_end', cardIds: store.pendingFlips }, finalState);
    store.clearPendingFlips();
  }, [gs, isMyTurn, myRole, store.pendingFlips, mp]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEndTurn = useCallback(() => {
    if (!gs || !isMyTurn) return;

    const newState: GuessWhoState = {
      ...gs,
      turnPhase: 'ask',
      currentQuestion: null,
      currentAnswer: null,
      moveCount: gs.moveCount + 1,
    };
    // Turn swaps to opponent (new round)
    mp.submitMove({ type: 'end_turn' }, newState);
    store.clearPendingFlips();
  }, [gs, isMyTurn, mp]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCardFlipToggle = useCallback((charId: string) => {
    if (!canFlip) return;
    store.togglePendingFlip(charId);
  }, [canFlip]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGuess = useCallback(async (charId: string) => {
    if (!gs || !isMyTurn || !mp.gameId || isGuessing) return;

    setIsGuessing(true);
    try {
      const result = await checkGuess(mp.gameId, charId);
      const winner = result.correct
        ? myRole
        : (myRole === 'player1' ? 'player2' : 'player1');

      const newState: GuessWhoState = {
        ...gs,
        moveCount: gs.moveCount + 1,
      };
      mp.submitMove({ type: 'guess', guessedCharacterId: charId, correct: result.correct }, newState, winner);
      setShowGuessModal(false);
    } finally {
      setIsGuessing(false);
    }
  }, [gs, isMyTurn, myRole, mp, isGuessing]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleForfeit = useCallback(() => {
    if (!gs) return;
    const opponentRole = myRole === 'player1' ? 'player2' : 'player1';
    mp.submitMove({ type: 'forfeit' }, gs, opponentRole);
    navigate('/');
  }, [gs, myRole, mp, navigate]);

  // ── Stale DB row guard (after all hooks) ────────────────────
  if (gs && (!gs.characters || gs.characters.length === 0)) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0f172a' }}
      >
        <div className="flex flex-col items-center gap-3">
          <WaitingDots />
          <p className="font-body text-white/50">Setting up game...</p>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────
  if (mp.loading || !gs) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0f172a' }}
      >
        <div className="flex flex-col items-center gap-3">
          <WaitingDots />
          <p className="font-body text-white/50">Loading game...</p>
        </div>
      </div>
    );
  }

  const elapsedMins = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const elapsedSecs = String(elapsed % 60).padStart(2, '0');
  const questionValid = !validateQuestion(question);
  // For display: who answered? During flip phase, current_turn is the asker.
  // If it's my turn during flip → opponent answered.
  const answererIsMe = !isMyTurn && turnPhase === 'answer';

  return (
    <>
      <AnimatePresence>
        {showGuessModal && (
          <GuessModal
            characters={characters}
            flippedCards={myFlipped}
            onConfirm={handleGuess}
            onClose={() => setShowGuessModal(false)}
          />
        )}
      </AnimatePresence>

      <div
        className="min-h-screen flex flex-col"
        style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1a0a2e 60%, #0a1628 100%)' }}
      >
        {/* Halftone */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />

        <div className="relative flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: '2px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{'\u23F1\uFE0F'}</span>
              <span
                className="font-mono font-bold text-xl"
                style={{ color: '#FFE66D', letterSpacing: 1 }}
              >
                {elapsedMins}:{elapsedSecs}
              </span>
            </div>

            <div className="font-display font-bold text-sm text-white/30">
              {isMyTurn ? 'YOUR TURN' : 'WAITING\u2026'}
            </div>

            <button
              onClick={() => setShowExitConfirm(true)}
              className="font-body text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Exit
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
            {/* Error */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  className="px-4 py-2 rounded-xl font-body text-sm text-white text-center"
                  style={{ background: '#FF3D7188', border: '2px solid #FF3D71' }}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {errorMsg}
                </motion.div>
              )}
            </AnimatePresence>

            {/* My secret character */}
            {myChar && (
              <div>
                <p
                  className="font-display font-bold text-xs mb-2 uppercase tracking-widest"
                  style={{ color: '#FF9F1C' }}
                >
                  {'\u2605'} Your Mystery Character
                </p>
                <div style={{ width: 120 }}>
                  <CharacterCard character={myChar} isFlipped={false} isMySecret size="lg" />
                </div>
              </div>
            )}

            {/* My board (my eliminations) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-display font-bold text-xs uppercase tracking-widest text-white/50">
                  Your Board
                  {canFlip && (
                    <span className="ml-2 text-electric-mint normal-case font-body">
                      {'\u2014'} tap to eliminate
                    </span>
                  )}
                </p>
                <span className="font-body text-xs text-white/30">
                  {myFlipped.length} eliminated
                </span>
              </div>
              <div
                className="rounded-2xl p-2"
                style={{
                  background: canFlip
                    ? 'rgba(78,255,196,0.05)'
                    : 'rgba(255,255,255,0.04)',
                  border: canFlip
                    ? '2px solid rgba(78,255,196,0.3)'
                    : '2px solid rgba(255,255,255,0.08)',
                }}
              >
                <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}>
                  {characters.map((char) => {
                    const isFlipped = myFlipped.includes(char.id);
                    const isPending = store.pendingFlips.includes(char.id);
                    return (
                      <div key={char.id} style={{ position: 'relative' }}>
                        <CharacterCard
                          character={char}
                          isFlipped={isFlipped}
                          isSelected={isPending}
                          isSelectable={canFlip && !isFlipped}
                          onClick={() => handleCardFlipToggle(char.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Turn history */}
            {turnHistory.length > 0 && (
              <div>
                <p className="font-display font-bold text-xs uppercase tracking-widest text-white/30 mb-2">
                  Question History
                </p>
                <div className="flex flex-col gap-2">
                  {[...turnHistory].reverse().slice(0, 5).map((entry, i) => {
                    const askerIsMe = entry.asker === myRole;
                    return (
                      <div
                        key={i}
                        className="px-3 py-2 rounded-xl font-body text-sm"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <span className="text-white/60">{askerIsMe ? 'You' : 'Opponent'} asked: </span>
                        <span className="text-white/80 italic">&quot;{entry.question}&quot;</span>
                        <span
                          className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{
                            background: entry.answer === 'yes' ? '#4EFFC433' : '#FF3D7133',
                            color: entry.answer === 'yes' ? '#4EFFC4' : '#FF3D71',
                            border: `1px solid ${entry.answer === 'yes' ? '#4EFFC4' : '#FF3D71'}`,
                          }}
                        >
                          {entry.answer.toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="h-32 flex-shrink-0" />
          </div>

          {/* Bottom Action Area */}
          <div
            className="flex-shrink-0 px-4 pb-safe pt-3 pb-6"
            style={{
              borderTop: '2px solid rgba(255,255,255,0.06)',
              background: 'rgba(15,23,42,0.95)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <AnimatePresence mode="wait">
              {/* Answerer sees the question → YES / NO */}
              {isMyTurn && turnPhase === 'answer' && currentQuestion && (
                <motion.div
                  key="answer"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  className="flex flex-col gap-3"
                >
                  <div
                    className="px-4 py-3 rounded-2xl"
                    style={{ background: 'rgba(181,101,255,0.15)', border: '2px solid #B565FF' }}
                  >
                    <p className="font-body text-xs text-grape-neon/70 mb-1">Opponent asks:</p>
                    <p className="font-display font-bold text-white text-base">&quot;{currentQuestion}&quot;</p>
                  </div>
                  <div className="flex gap-3">
                    <motion.button
                      onClick={() => handleAnswer('yes')}
                      className="flex-1 py-4 rounded-2xl font-display font-extrabold text-xl"
                      style={{
                        background: 'linear-gradient(135deg, #4EFFC4, #00D9FF)',
                        border: '4px solid black',
                        color: '#0f172a',
                        boxShadow: '6px 6px 0px 0px #4EFFC488',
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      YES {'\u2713'}
                    </motion.button>
                    <motion.button
                      onClick={() => handleAnswer('no')}
                      className="flex-1 py-4 rounded-2xl font-display font-extrabold text-xl"
                      style={{
                        background: 'linear-gradient(135deg, #FF3D71, #FF6BA8)',
                        border: '4px solid black',
                        color: 'white',
                        boxShadow: '6px 6px 0px 0px #FF3D7188',
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      NO {'\u2717'}
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Asker waiting for answer */}
              {!isMyTurn && turnPhase === 'answer' && (
                <motion.div
                  key="waiting-answer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-3 py-4"
                >
                  <WaitingDots />
                  <p className="font-body text-white/50">Waiting for opponent to answer...</p>
                </motion.div>
              )}

              {/* Flip phase: answer reveal + card elimination */}
              {turnPhase === 'flip' && (
                <motion.div
                  key="flip"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-3"
                >
                  <div
                    className="px-4 py-3 rounded-2xl flex items-center gap-3"
                    style={{
                      background: currentAnswer === 'yes'
                        ? 'rgba(78,255,196,0.15)' : 'rgba(255,61,113,0.15)',
                      border: `2px solid ${currentAnswer === 'yes' ? '#4EFFC4' : '#FF3D71'}`,
                    }}
                  >
                    <span className="text-2xl">{currentAnswer === 'yes' ? '\u2705' : '\u274C'}</span>
                    <div>
                      <p className="font-body text-xs text-white/50">
                        {answererIsMe ? 'You' : 'Opponent'} answered:
                      </p>
                      <p
                        className="font-display font-extrabold text-xl"
                        style={{ color: currentAnswer === 'yes' ? '#4EFFC4' : '#FF3D71' }}
                      >
                        {currentAnswer?.toUpperCase()}
                      </p>
                    </div>
                    {isMyTurn && (
                      <p className="font-body text-xs text-white/40 ml-auto text-right">
                        Tap cards to<br />eliminate
                      </p>
                    )}
                  </div>

                  {isMyTurn && (
                    <div className="flex gap-2">
                      {store.pendingFlips.length > 0 ? (
                        <>
                          <motion.button
                            onClick={handleConfirmFlips}
                            className="flex-1 py-3 rounded-2xl font-display font-bold text-base"
                            style={{
                              background: 'linear-gradient(135deg, #4EFFC4, #00D9FF)',
                              border: '4px solid black',
                              color: '#0f172a',
                              boxShadow: '6px 6px 0px 0px #B565FF',
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            Flip {store.pendingFlips.length} card{store.pendingFlips.length !== 1 ? 's' : ''} & End Turn
                          </motion.button>
                          <button
                            onClick={() => store.clearPendingFlips()}
                            className="px-4 py-3 rounded-2xl font-body text-sm text-white/50 hover:text-white/80 transition-colors"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)' }}
                          >
                            Clear
                          </button>
                        </>
                      ) : (
                        <motion.button
                          onClick={handleEndTurn}
                          className="w-full py-3 rounded-2xl font-display font-bold text-base"
                          style={{
                            background: 'linear-gradient(135deg, #B565FF, #FF6BA8)',
                            border: '4px solid black',
                            color: 'white',
                            boxShadow: '6px 6px 0px 0px #4EFFC4',
                          }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          Done Eliminating {'\u2192'} End Turn
                        </motion.button>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* My turn to ask */}
              {isMyTurn && turnPhase === 'ask' && (
                <motion.div
                  key="ask"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-3"
                >
                  <div className="relative">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value.slice(0, 100))}
                      onKeyDown={(e) => e.key === 'Enter' && questionValid && handleAskQuestion()}
                      placeholder={PLACEHOLDER_EXAMPLES[placeholderIdx]}
                      className="w-full py-3 px-4 pr-16 rounded-2xl font-body text-base text-charcoal placeholder:text-charcoal/40 outline-none"
                      style={{
                        background: 'white',
                        border: question && !questionValid
                          ? '3px solid #FF3D71'
                          : '3px solid #00D9FF',
                      }}
                    />
                    <span
                      className="absolute right-3 bottom-3 font-mono text-xs"
                      style={{ color: question.length > 90 ? '#FF3D71' : 'rgba(0,0,0,0.25)' }}
                    >
                      {question.length}/100
                    </span>
                  </div>

                  {question && !questionValid && (
                    <p className="font-body text-xs text-cherry-punch -mt-1">
                      {validateQuestion(question)}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <motion.button
                      onClick={handleAskQuestion}
                      disabled={!questionValid}
                      className="flex-1 py-3 rounded-2xl font-display font-bold text-base"
                      style={{
                        background: questionValid
                          ? 'linear-gradient(135deg, #4EFFC4, #00D9FF)'
                          : '#374151',
                        border: '4px solid black',
                        color: questionValid ? '#0f172a' : '#6b7280',
                        boxShadow: questionValid ? '6px 6px 0px 0px #B565FF' : 'none',
                        cursor: questionValid ? 'pointer' : 'not-allowed',
                      }}
                      whileHover={questionValid ? { scale: 1.02 } : {}}
                      whileTap={questionValid ? { scale: 0.97 } : {}}
                    >
                      Ask Question
                    </motion.button>
                    <motion.button
                      onClick={() => setShowGuessModal(true)}
                      className="px-4 py-3 rounded-2xl font-display font-bold text-sm"
                      style={{
                        background: 'linear-gradient(135deg, #FF9F1C, #FF3D71)',
                        border: '4px solid black',
                        color: 'white',
                        boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.4)',
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Guess!
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Waiting for opponent to ask */}
              {!isMyTurn && turnPhase === 'ask' && (
                <motion.div
                  key="waiting-ask"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-3 py-4"
                >
                  <WaitingDots />
                  <p className="font-body text-white/50">Opponent is thinking...</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Exit confirmation */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl p-6 text-center"
              style={{ background: '#1e1040', border: '4px solid #FF3D71', boxShadow: '8px 8px 0 #FF3D71' }}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              <p className="font-display font-bold text-white text-xl mb-2">Leave game?</p>
              <p className="font-body text-white/50 text-sm mb-6">
                Leaving will forfeit the match. Your opponent wins.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
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
    </>
  );
}
