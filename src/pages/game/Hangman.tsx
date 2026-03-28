/**
 * Hangman — turn-based phrase guessing (player 1 sets word, player 2 guesses).
 */
import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useOnboardingStore } from '../../store/onboardingStore';
import { characterImages } from '../../utils/assetMaps';
import { useMultiplayerGame } from '../../lib/useMultiplayerGame';
import { usePostGameRedirect } from '../../lib/usePostGameRedirect';
import {
  abandonGame,
  getProfile,
  hangmanSubmitGuess,
  hangmanSubmitSetup,
} from '../../lib/database';
import { GameTitleCard } from '../../components/game/GameTitleCard';
import { HangmanPixelSvg } from '../../components/game/HangmanPixelSvg';
import { useNoShowGuard } from '../../lib/useNoShowGuard';
import {
  WaitingForOpponentOverlay,
  LeaveGameDialog,
  OpponentLeftOverlay,
  ReconnectOverlay,
  useOpponentLeftRedirect,
  useBeforeUnload,
  useReconnectGrace,
} from '../../components/game/MultiplayerOverlays';

export const HANGMAN_MENU = [
  {
    name: 'Nature & Animals',
    subs: ['Mammals', 'Sea Creatures', 'Insects', 'Reptiles'],
  },
  {
    name: 'Geography',
    subs: ['Countries', 'Cities', 'Oceans', 'Landmarks'],
  },
  {
    name: 'Entertainment',
    subs: ['Movies', 'Actors', 'TV Shows', 'Cartoon Characters', 'Disney Characters'],
  },
  {
    name: 'Food & Drink',
    subs: ['Fruits', 'Vegetables', 'Desserts', 'Specific Dishes'],
  },
  {
    name: 'Sports',
    subs: ['Sports Teams', 'Athletes', 'Olympic Events'],
  },
  {
    name: 'Science & Tech',
    subs: ['Chemical Elements', 'Technology', 'Space', 'Engineering'],
  },
  {
    name: 'Everyday Life',
    subs: ['Clothing', 'Human Body', 'Jobs', 'Furniture', 'Holidays'],
  },
] as const;

interface HangmanState {
  present?: Record<string, boolean>;
  ready?: Record<string, boolean>;
  phase?: string;
  category?: string;
  subcategory?: string;
  wordLengths?: number[];
  wordStartIndices?: number[];
  phraseLength?: number;
  revealMap?: Record<string, string>;
  revealedSlots?: Record<string, string>;
  guessedLetters?: string[];
  wrongLetters?: string[];
  wrongCount?: number;
  solution?: string;
}

type LocalPhase = 'setup_ui' | 'playing' | 'result';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function parseNumArray(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => Number(x)).filter((n) => !Number.isNaN(n));
}

function ResultScreenHangman({
  result,
  wrongCount,
  solution,
  onBack,
  onChat,
}: {
  result: 'player_wins' | 'bot_wins';
  wrongCount: number;
  solution: string | null;
  onBack: () => void;
  onChat: () => void;
}) {
  const won = result === 'player_wins';
  const color = won ? '#4EFFC4' : '#FF3D71';
  const shadow = won ? 'rgba(78,255,196,0.25)' : 'rgba(255,61,113,0.2)';

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.92)', zIndex: 60 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-full max-w-sm rounded-3xl px-6 py-8 text-center"
        style={{
          background: 'linear-gradient(175deg,#1C1C3E,#12122A)',
          border: '2px solid rgba(255,255,255,0.1)',
          boxShadow: `0 0 60px ${shadow}`,
        }}
        initial={{ scale: 0.7, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        <motion.div
          className="font-display text-4xl mb-1"
          style={{ color, textShadow: `0 0 30px ${color}` }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          {won ? 'YOU WIN!' : 'THEY WIN!'}
        </motion.div>
        <p className="font-body text-sm mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {won ? 'Great guessing!' : 'Six wrong guesses — phrase wins.'}
        </p>
        {solution ? (
          <p
            className="font-display text-lg mb-6 break-words px-1"
            style={{ color: '#FFE66D' }}
          >
            {solution}
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: 'Wrong', value: wrongCount.toString() },
            { label: 'Result', value: won ? 'Win' : 'Loss' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl py-3"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="font-display text-xl" style={{ color: '#FFE66D' }}>
                {s.value}
              </div>
              <div className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <motion.button
          onClick={onChat}
          className="w-full py-4 rounded-2xl font-display text-xl mb-3"
          style={{
            background: 'linear-gradient(135deg,#00F5FF,#FF006E)',
            color: '#12122A',
            border: '3px solid rgba(255,255,255,0.2)',
            boxShadow: '0 0 28px rgba(0,245,255,0.45),4px 4px 0 rgba(0,0,0,0.35)',
          }}
          whileTap={{ scale: 0.97 }}
        >
          START CHATTING →
        </motion.button>
        <button type="button" onClick={onBack} className="font-body text-sm w-full py-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Back to Games
        </button>
      </motion.div>
    </motion.div>
  );
}

function WordRows({
  gs,
}: {
  gs: HangmanState;
}) {
  const starts = parseNumArray(gs.wordStartIndices);
  const phraseLen = gs.phraseLength ?? 0;
  const reveal = gs.revealMap ?? {};
  const revealed = gs.revealedSlots ?? {};
  if (!starts.length || !phraseLen) return null;

  return (
    <div className="flex flex-col gap-4 items-center w-full max-w-md">
      {starts.map((start, wi) => {
        const endEx = wi + 1 < starts.length ? starts[wi + 1]! : phraseLen;
        const cells: ReactNode[] = [];
        for (let g = start; g < endEx; g += 1) {
          const key = String(g);
          const auto = reveal[key];
          const slot = revealed[key];
          let ch: string | null = null;
          let isLetter = false;
          if (auto !== undefined && auto !== null) {
            ch = String(auto);
          } else if (slot !== undefined && slot !== null) {
            ch = String(slot);
            isLetter = true;
          } else {
            isLetter = true;
            ch = '_';
          }
          cells.push(
            <span
              key={g}
              className="inline-flex items-end justify-center font-display"
              style={{
                minWidth: isLetter && ch === '_' ? 22 : 16,
                marginRight: 4,
                fontSize: isLetter && ch === '_' ? 28 : 22,
                color: isLetter && ch === '_' ? 'rgba(255,255,255,0.35)' : '#4EFFC4',
                borderBottom: isLetter && ch === '_' ? '3px solid rgba(78,255,196,0.5)' : 'none',
                lineHeight: 1,
              }}
            >
              {ch === ' ' ? '\u00A0' : ch}
            </span>,
          );
        }
        return (
          <div key={wi} className="flex flex-wrap justify-center gap-0.5">
            {cells}
          </div>
        );
      })}
    </div>
  );
}

export function Hangman() {
  const navigate = useNavigate();
  const params = useParams<{ matchId?: string }>();
  const { character } = useOnboardingStore();
  const playerChar = character ?? 'ghost';

  const matchId = params.matchId ?? null;
  const matchIdLooksMultiplayer = !!matchId && matchId !== 'demo';

  const mp = useMultiplayerGame<HangmanState>({
    matchId: matchId ?? '',
    gameType: 'hangman',
    enabled: matchIdLooksMultiplayer,
  });
  const isMultiplayer = matchIdLooksMultiplayer && !mp.fallbackToBotMode;
  const myRole = mp.myRole;
  const isP1 = myRole === 'player1';

  const gs = mp.gameState;

  const [titleCardComplete, setTitleCardComplete] = useState(!isMultiplayer);
  const titleCardActiveRef = useRef(false);
  const [opponentName, setOpponentName] = useState<string | null>(null);

  const [expandedCat, setExpandedCat] = useState<number | null>(null);
  const [pickedCategory, setPickedCategory] = useState<string | null>(null);
  const [pickedSub, setPickedSub] = useState<string | null>(null);
  const [phraseInput, setPhraseInput] = useState('');
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupErr, setSetupErr] = useState<string | null>(null);
  const [guessBusy, setGuessBusy] = useState(false);
  const [guessErr, setGuessErr] = useState<string | null>(null);

  const [localPhase, setLocalPhase] = useState<LocalPhase>('playing');
  const [result, setResult] = useState<'player_wins' | 'bot_wins' | null>(null);

  usePostGameRedirect({
    isMultiplayer,
    matchId,
    phase: localPhase === 'result' ? 'result' : 'playing',
  });

  useEffect(() => {
    if (!isMultiplayer) {
      titleCardActiveRef.current = false;
      setTitleCardComplete(true);
      return;
    }
    if (!titleCardComplete) titleCardActiveRef.current = true;
  }, [isMultiplayer, titleCardComplete]);

  const handleTitleCardComplete = useCallback(() => {
    titleCardActiveRef.current = false;
    setTitleCardComplete(true);
  }, []);

  useEffect(() => {
    if (!mp.opponentId) return;
    let cancelled = false;
    (async () => {
      const { data } = await getProfile(mp.opponentId);
      if (!cancelled && data?.name) setOpponentName(data.name);
    })();
    return () => {
      cancelled = true;
    };
  }, [mp.opponentId]);

  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const { graceActive, showForfeit } = useReconnectGrace(
    isMultiplayer,
    mp.bothPresent,
    mp.opponentLeft,
    localPhase === 'result' ? 'result' : 'playing',
  );

  useBeforeUnload(isMultiplayer && gs?.phase === 'in_progress' && mp.bothPresent);
  useOpponentLeftRedirect(showForfeit, matchId, 'opponent');

  const leavingRef = useRef(false);
  const handleLeaveConfirm = async () => {
    leavingRef.current = true;
    if (mp.gameRow?.id) await abandonGame(mp.gameRow.id);
    navigate(matchId ? `/match/${matchId}` : '/matches');
  };

  const wrongCount = gs?.wrongCount ?? 0;
  const guessed = new Set((gs?.guessedLetters ?? []).map((x) => String(x).toUpperCase()));
  const wrongSet = new Set((gs?.wrongLetters ?? []).map((x) => String(x).toUpperCase()));

  // Drive local phase from DB
  useEffect(() => {
    if (!isMultiplayer || !mp.gameRow) return;
    if (mp.gameRow.winner) {
      const iWon = mp.gameRow.winner === myRole;
      setResult(iWon ? 'player_wins' : 'bot_wins');
      setLocalPhase('result');
      return;
    }
    if (gs?.phase === 'in_progress') {
      setLocalPhase('playing');
      return;
    }
    if (!gs?.phase && isP1) {
      setLocalPhase('setup_ui');
      return;
    }
    if (!gs?.phase && !isP1) {
      setLocalPhase('playing');
    }
  }, [isMultiplayer, mp.gameRow, mp.gameRow?.winner, gs?.phase, myRole, isP1]);

  const noShow = useNoShowGuard({
    enabled:
      isMultiplayer &&
      gs?.phase === 'in_progress' &&
      !!matchId &&
      !!mp.gameId &&
      !!mp.gameRow &&
      titleCardComplete &&
      !mp.gameRow?.winner,
    matchId: matchId ?? '',
    gameId: mp.gameId,
    gameStatus: mp.gameRow?.status,
    titleCardComplete,
    opponentActivityTick: mp.opponentActivityTick,
    opponentDisplayName: opponentName ?? 'Opponent',
    navigate,
    titleCardActiveRef,
  });

  const handleSubmitSetup = async () => {
    if (!mp.gameId || !pickedCategory || !pickedSub || !phraseInput.trim()) return;
    setSetupErr(null);
    setSetupBusy(true);
    try {
      await hangmanSubmitSetup(mp.gameId, phraseInput.trim(), pickedCategory, pickedSub);
    } catch (e) {
      setSetupErr(e instanceof Error ? e.message : 'Setup failed');
    } finally {
      setSetupBusy(false);
    }
  };

  const handleGuess = async (letter: string) => {
    if (!mp.gameId || guessBusy) return;
    const L = letter.toUpperCase();
    if (!/^[A-Z]$/.test(L)) return;
    setGuessErr(null);
    setGuessBusy(true);
    try {
      await hangmanSubmitGuess(mp.gameId, L);
    } catch (e) {
      setGuessErr(e instanceof Error ? e.message : 'Guess failed');
    } finally {
      setGuessBusy(false);
    }
  };

  const showWaitingOverlay =
    isMultiplayer &&
    gs?.phase === 'in_progress' &&
    !mp.bothPresent;

  const canGuess =
    isMultiplayer &&
    mp.isMyTurn &&
    gs?.phase === 'in_progress' &&
    mp.bothPresent &&
    !guessBusy &&
    !mp.gameRow?.winner;

  if (!matchIdLooksMultiplayer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#12122A' }}>
        <p className="font-body text-center" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Open Hangman from a match to play.
        </p>
        <button
          type="button"
          className="ml-4 font-display text-sm"
          style={{ color: '#4EFFC4' }}
          onClick={() => navigate('/matches')}
        >
          Matches
        </button>
      </div>
    );
  }

  if (mp.fallbackToBotMode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4" style={{ background: '#12122A' }}>
        <p className="font-body text-center" style={{ color: 'rgba(255,255,255,0.6)' }}>
          This match is not available for multiplayer.
        </p>
        <button
          type="button"
          className="font-display"
          style={{ color: '#4EFFC4' }}
          onClick={() => navigate('/matches')}
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#12122A' }}>
      <div
        className="fixed inset-0 pointer-events-none z-40 opacity-[0.02]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,1) 3px,rgba(255,255,255,1) 4px)',
        }}
      />

      {isMultiplayer && !titleCardComplete && (
        <GameTitleCard gameName="Hangman" opponentName={opponentName} onComplete={handleTitleCardComplete} />
      )}

      {isMultiplayer && (
        <>
          <WaitingForOpponentOverlay
            visible={showWaitingOverlay}
            opponentName="opponent"
            matchId={matchId!}
          />
          <ReconnectOverlay visible={graceActive} opponentName="opponent" />
          <OpponentLeftOverlay visible={showForfeit} opponentName="opponent" />
          <LeaveGameDialog
            visible={showLeaveDialog}
            opponentName="opponent"
            onStay={() => setShowLeaveDialog(false)}
            onLeave={handleLeaveConfirm}
          />
          <AnimatePresence>
            {(guessErr || setupErr) && (
              <motion.div
                className="fixed top-20 left-1/2 z-[120] -translate-x-1/2 px-4 py-2 rounded-2xl font-body text-xs font-bold text-white text-center max-w-xs"
                style={{
                  background: 'rgba(255,61,113,0.18)',
                  border: '1.5px solid rgba(255,61,113,0.55)',
                  backdropFilter: 'blur(10px)',
                }}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                role="status"
              >
                {guessErr ?? setupErr}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <AnimatePresence>
        {localPhase === 'result' && result && (
          <ResultScreenHangman
            result={result}
            wrongCount={wrongCount}
            solution={gs?.solution ?? null}
            onBack={() => navigate('/matches')}
            onChat={() => {
              if (matchId) localStorage.setItem(`first_game_played_${matchId}`, 'true');
              navigate(matchId ? `/match/${matchId}` : '/matches');
            }}
          />
        )}
      </AnimatePresence>

      <header className="flex-none px-4 pt-4 pb-2 flex items-center justify-between z-10">
        <button
          type="button"
          onClick={() => setShowLeaveDialog(true)}
          className="font-body text-xs"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          Leave
        </button>
        <div className="font-display text-sm" style={{ color: '#4EFFC4' }}>
          HANGMAN
        </div>
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ border: '2px solid #4EFFC4' }}>
          <img
            src={characterImages[playerChar] ?? '/characters/Ghost.png'}
            alt=""
            className="w-full h-full object-contain p-0.5"
            draggable={false}
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-8 flex flex-col items-center gap-6">
        {localPhase === 'setup_ui' && isP1 && titleCardComplete && (
          <div className="w-full max-w-md flex flex-col gap-4">
            <p className="font-body text-center text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Pick a category, then type your phrase. Only letters A–Z are guessed; spaces and symbols show automatically.
            </p>
            <div className="flex flex-col gap-2">
              {HANGMAN_MENU.map((cat, i) => (
                <div key={cat.name} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 font-display text-sm"
                    style={{
                      background: expandedCat === i ? 'rgba(78,255,196,0.12)' : 'rgba(255,255,255,0.04)',
                      color: '#FFE66D',
                    }}
                    onClick={() => setExpandedCat(expandedCat === i ? null : i)}
                  >
                    {cat.name}
                  </button>
                  <AnimatePresence>
                    {expandedCat === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="flex flex-col"
                      >
                        {cat.subs.map((sub) => (
                          <button
                            key={sub}
                            type="button"
                            className="text-left px-6 py-2 font-body text-sm"
                            style={{
                              background:
                                pickedCategory === cat.name && pickedSub === sub
                                  ? 'rgba(78,255,196,0.2)'
                                  : 'rgba(0,0,0,0.25)',
                              color: '#fff',
                            }}
                            onClick={() => {
                              setPickedCategory(cat.name);
                              setPickedSub(sub);
                            }}
                          >
                            {sub}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
            <input
              type="text"
              value={phraseInput}
              onChange={(e) => setPhraseInput(e.target.value)}
              placeholder="Type your word or phrase..."
              className="w-full rounded-xl px-4 py-3 font-body text-base outline-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
              }}
            />
            <motion.button
              type="button"
              disabled={setupBusy || !pickedSub || !phraseInput.trim()}
              onClick={() => void handleSubmitSetup()}
              className="w-full py-4 rounded-2xl font-display text-lg disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg,#4EFFC4,#00AAFF)',
                color: '#12122A',
              }}
              whileTap={{ scale: 0.98 }}
            >
              {setupBusy ? 'SENDING…' : 'START GAME'}
            </motion.button>
          </div>
        )}

        {!gs?.phase && !isP1 && titleCardComplete && (
          <div className="flex flex-col items-center gap-4 mt-12">
            <p className="font-display text-lg" style={{ color: '#FF6BA8' }}>
              Opponent is choosing a word…
            </p>
            <p className="font-body text-sm text-center" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Hang tight — you will guess once they finish.
            </p>
          </div>
        )}

        {gs?.phase === 'in_progress' && titleCardComplete && (
          <>
            <div className="text-center">
              <p className="font-body text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {gs.category} · {gs.subcategory}
              </p>
              {isP1 ? (
                <p className="font-display text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Watching — {opponentName ?? 'Opponent'} is guessing
                </p>
              ) : (
                <p className="font-display text-xs" style={{ color: mp.isMyTurn ? '#4EFFC4' : 'rgba(255,255,255,0.3)' }}>
                  {mp.isMyTurn ? 'YOUR TURN' : 'WAITING…'}
                </p>
              )}
            </div>

            <HangmanPixelSvg wrongCount={wrongCount} className="w-40 h-44 mx-auto" />

            {gs ? <WordRows gs={gs} /> : null}

            <div className="w-full max-w-md">
              <p className="font-body text-xs mb-2 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Wrong letters
              </p>
              <div className="flex flex-wrap justify-center gap-2 min-h-[28px]">
                {(gs.wrongLetters ?? []).map((L) => (
                  <span key={L} className="font-display text-lg" style={{ color: '#FF6BA8' }}>
                    {String(L).toUpperCase()}
                  </span>
                ))}
              </div>
            </div>

            <div className="w-full max-w-lg grid grid-cols-7 gap-2 sm:grid-cols-9">
              {LETTERS.map((L) => {
                const up = L.toUpperCase();
                const used = guessed.has(up);
                const wrong = wrongSet.has(up);
                const hit = used && !wrong;
                const active = canGuess && !used;
                return (
                  <button
                    key={L}
                    type="button"
                    disabled={!active}
                    onClick={() => void handleGuess(up)}
                    className="py-2 rounded-lg font-display text-sm"
                    style={{
                      background: used
                        ? hit
                          ? 'rgba(78,255,196,0.25)'
                          : 'rgba(255,107,168,0.2)'
                        : 'rgba(255,255,255,0.08)',
                      color: used ? (hit ? '#4EFFC4' : '#FF6BA8') : '#fff',
                      border: '1px solid rgba(255,255,255,0.12)',
                      opacity: isP1 || !mp.isMyTurn ? 0.45 : 1,
                      cursor: active ? 'pointer' : 'default',
                    }}
                  >
                    {up}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </main>
      <AnimatePresence>
        {titleCardComplete && noShow.waitingLineVisible && !noShow.promptVisible && gs?.phase === 'in_progress' && (
          <motion.div
            key="no-show-line-hm"
            className="fixed inset-x-0 bottom-4 z-[55] flex justify-center px-4 pointer-events-none"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <p className="w-full max-w-[min(92vw,420px)] min-w-0 text-center font-body text-sm text-white/45">
              Waiting for {opponentName ?? 'Opponent'}...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {titleCardComplete && noShow.promptVisible && gs?.phase === 'in_progress' && (
          <motion.div
            key="no-show-prompt-hm"
            className="fixed inset-x-0 bottom-4 z-[55] flex justify-center px-4 pointer-events-none"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="w-full max-w-[min(92vw,420px)] min-w-0 pointer-events-auto rounded-2xl px-4 py-3 box-border"
              style={{
                background: 'rgba(15,23,42,0.95)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <p className="font-body text-sm text-center text-white/75 mb-3 break-words">
                {opponentName ?? 'Opponent'} hasn&apos;t shown up yet — keep waiting or cancel?
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => void noShow.cancelWaiting()}
                  className="px-4 py-2 rounded-xl font-display font-bold text-xs"
                  style={{ background: '#FF3D71', border: '2px solid black', color: 'white' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={noShow.dismissPrompt}
                  className="px-4 py-2 rounded-xl font-body text-xs text-white/50"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
