import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { connectSocket } from '../../lib/socket';
import { CharacterCard } from '../../components/game/CharacterCard';
import { GuessModal } from '../../components/game/GuessModal';
import type { GameOverPayload } from '../../types/game';

const PLACEHOLDER_EXAMPLES = [
  'Does your person wear glasses?',
  'Does your person have long hair?',
  'Is your person a woman?',
  'Does your person wear a hat?',
  'Does your person have facial hair?',
  'Is your person older?',
  'Does your person have blonde hair?',
];

export function GameBoard() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const store = useGameStore();
  const socketRef = useRef(connectSocket());

  const [question, setQuestion] = useState('');
  const [showGuessModal, setShowGuessModal] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [disconnectMsg, setDisconnectMsg] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const game = store.gameState;
  const myId = store.myUserId;
  const isMyTurn = game?.currentTurn === myId;

  // ── Elapsed timer ────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Cycle placeholder (only when input is empty) ─────────────
  useEffect(() => {
    if (question.length > 0) return;
    const t = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 3000);
    return () => clearInterval(t);
  }, [question.length]);

  // ── Socket events ────────────────────────────────────────────
  useEffect(() => {
    if (!gameId || !myId) return;
    const socket = socketRef.current;

    socket.on('question_asked', ({ question: q }: { question: string; askedBy: string }) => {
      store.applyQuestionAsked(q, '');
    });

    socket.on('question_answered', ({ answer }: { answer: 'yes' | 'no' }) => {
      store.applyQuestionAnswered(answer);
    });

    socket.on('cards_flipped', ({ cardIds, flippedBy }: { cardIds: string[]; flippedBy: string }) => {
      store.applyCardsFlipped(cardIds, flippedBy);
    });

    socket.on('turn_changed', ({ currentTurn }: { currentTurn: string }) => {
      store.applyTurnChanged(currentTurn);
    });

    socket.on('game_over', (payload: GameOverPayload) => {
      store.setGameOver(payload);
      navigate(`/game/${gameId}/result`);
    });

    socket.on('opponent_disconnected', ({ message }: { message: string }) => {
      setDisconnectMsg(message);
      setTimeout(() => setDisconnectMsg(null), 32000);
    });

    socket.on('opponent_reconnected', () => {
      setDisconnectMsg(null);
    });

    socket.on('error', ({ message }: { message: string }) => {
      store.setError(message);
      setTimeout(() => store.setError(null), 4000);
    });

    socket.on('game_rejoined', ({ gameState }: { gameState: any }) => {
      store.setGameState(gameState);
    });

    // Reconnect: if we have a gameId but no game state, rejoin
    if (!game) {
      socket.emit('rejoin_game', { gameId, userId: myId });
    }

    return () => {
      socket.off('question_asked');
      socket.off('question_answered');
      socket.off('cards_flipped');
      socket.off('turn_changed');
      socket.off('game_over');
      socket.off('opponent_disconnected');
      socket.off('opponent_reconnected');
      socket.off('error');
      socket.off('game_rejoined');
    };
  }, [gameId, myId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAskQuestion = useCallback(() => {
    if (!gameId || !myId || !question.trim()) return;
    const err = validateQuestion(question);
    if (err) { store.setError(err); return; }
    socketRef.current.emit('ask_question', { gameId, userId: myId, question: question.trim() });
    setQuestion('');
  }, [gameId, myId, question]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = useCallback((answer: 'yes' | 'no') => {
    if (!gameId || !myId) return;
    socketRef.current.emit('answer_question', { gameId, userId: myId, answer });
  }, [gameId, myId]);

  const handleCardFlipToggle = useCallback((charId: string) => {
    if (!isMyTurn || game?.turnPhase !== 'flip') return;
    store.togglePendingFlip(charId);
  }, [isMyTurn, game?.turnPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirmFlips = useCallback(() => {
    if (!gameId || !myId || store.pendingFlips.length === 0) return;
    socketRef.current.emit('flip_cards', { gameId, userId: myId, cardIds: store.pendingFlips });
    store.clearPendingFlips();
  }, [gameId, myId, store.pendingFlips]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEndTurn = useCallback(() => {
    if (!gameId || !myId) return;
    socketRef.current.emit('end_turn', { gameId, userId: myId });
  }, [gameId, myId]);

  const handleGuess = useCallback((charId: string) => {
    if (!gameId || !myId) return;
    socketRef.current.emit('make_guess', { gameId, userId: myId, guessedCharacterId: charId });
    setShowGuessModal(false);
  }, [gameId, myId]);

  if (!game) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0f172a' }}
      >
        <p className="font-body text-white/50">Loading game...</p>
      </div>
    );
  }

  const myChar = game.characters.find((c) => c.id === game.me.secretCharacterId);
  const myFlipped = game.me.flippedCards;

  const elapsedMins = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const elapsedSecs = String(elapsed % 60).padStart(2, '0');

  const questionValid = !validateQuestion(question);
  const canFlip = isMyTurn && game.turnPhase === 'flip';
  const opponentName = game.opponent.name;

  return (
    <>
      <AnimatePresence>
        {showGuessModal && (
          <GuessModal
            characters={game.characters}
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
              <span className="text-lg">⏱️</span>
              <span
                className="font-mono font-bold text-xl"
                style={{ color: '#FFE66D', letterSpacing: 1 }}
              >
                {elapsedMins}:{elapsedSecs}
              </span>
            </div>

            <div className="flex-1" />

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
              {store.errorMessage && (
                <motion.div
                  className="px-4 py-2 rounded-xl font-body text-sm text-white text-center"
                  style={{ background: '#FF3D7188', border: '2px solid #FF3D71' }}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {store.errorMessage}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Disconnection notice */}
            <AnimatePresence>
              {disconnectMsg && (
                <motion.div
                  className="px-4 py-3 rounded-xl font-body text-sm text-white text-center"
                  style={{ background: 'rgba(255,163,0,0.2)', border: '2px solid #FF9F1C' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  ⚠️ {disconnectMsg}
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
                  ★ Your Mystery Character
                </p>
                <div className="max-w-xs">
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
                      — tap to eliminate
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
                <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
                  {game.characters.map((char) => {
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
            {game.turnHistory.length > 0 && (
              <div>
                <p className="font-display font-bold text-xs uppercase tracking-widest text-white/30 mb-2">
                  Question History
                </p>
                <div className="flex flex-col gap-2">
                  {[...game.turnHistory].reverse().slice(0, 5).map((entry, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 rounded-xl font-body text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <span className="text-white/60">{entry.asker === myId ? 'You' : opponentName} asked: </span>
                      <span className="text-white/80 italic">"{entry.question}"</span>
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
                  ))}
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
              {/* Their turn to ask → we answer */}
              {!isMyTurn && game.turnPhase === 'answer' && game.currentQuestion && (
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
                    <p className="font-body text-xs text-grape-neon/70 mb-1">{opponentName} asks:</p>
                    <p className="font-display font-bold text-white text-base">"{game.currentQuestion}"</p>
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
                      YES ✓
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
                      NO ✗
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Waiting for opponent to answer */}
              {isMyTurn && game.turnPhase === 'answer' && (
                <motion.div
                  key="waiting-answer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-3 py-4"
                >
                  <WaitingDots />
                  <p className="font-body text-white/50">Waiting for {opponentName} to answer...</p>
                </motion.div>
              )}

              {/* Flip phase answer reveal + End Turn */}
              {game.turnPhase === 'flip' && (
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
                      background: game.currentAnswer === 'yes'
                        ? 'rgba(78,255,196,0.15)' : 'rgba(255,61,113,0.15)',
                      border: `2px solid ${game.currentAnswer === 'yes' ? '#4EFFC4' : '#FF3D71'}`,
                    }}
                  >
                    <span className="text-2xl">{game.currentAnswer === 'yes' ? '✅' : '❌'}</span>
                    <div>
                      <p className="font-body text-xs text-white/50">
                        {game.currentTurn === myId ? opponentName : 'You'} answered:
                      </p>
                      <p
                        className="font-display font-extrabold text-xl"
                        style={{ color: game.currentAnswer === 'yes' ? '#4EFFC4' : '#FF3D71' }}
                      >
                        {game.currentAnswer?.toUpperCase()}
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
                            Flip {store.pendingFlips.length} card{store.pendingFlips.length !== 1 ? 's' : ''}
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
                          Done Eliminating → End Turn
                        </motion.button>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* My turn to ask */}
              {isMyTurn && game.turnPhase === 'ask' && (
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

              {/* Waiting for their turn to ask */}
              {!isMyTurn && game.turnPhase === 'ask' && (
                <motion.div
                  key="waiting-ask"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-3 py-4"
                >
                  <WaitingDots />
                  <p className="font-body text-white/50">{opponentName} is thinking...</p>
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
                  onClick={() => navigate('/')}
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

function validateQuestion(q: string): string | null {
  if (!q || q.trim().length < 5) return 'Question too short (min 5 characters)';
  if (q.trim().length > 100) return 'Too long (max 100 characters)';
  if (!q.trim().endsWith('?')) return 'Yes/no questions must end with "?"';
  return null;
}
