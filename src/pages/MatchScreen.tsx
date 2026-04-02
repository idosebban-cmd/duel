import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import {
  getProfile,
  getMatchById,
  getGamesByMatch,
  getChallengesForMatch,
  acceptChallenge,
  declineChallenge,
  cancelChallenge,
  getMessages,
  sendMessage,
  markMessagesRead,
  blockUser,
  getPhotos,
} from '../lib/database';
import type { UserProfile, GameRow, DbMessage, ChallengeRow, IntentValue } from '../lib/database';
import {
  normalizeGameType,
  prepareAcceptedChallenge,
  resolveGameRoute,
} from '../lib/challengeGameFlow';
import { GAME_LABELS } from '../lib/gameConstants';
import { SafetyMenuSheet } from '../components/safety/SafetyMenuSheet';
import { ReportUserModal } from '../components/safety/ReportUserModal';
import { ProfileDetailSheet } from '../components/profile/ProfileDetailSheet';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHAT_POLL_MS = 5_000;
const CHALLENGE_POLL_MS = 5_000;

const FALLBACK_PROD_SERVER_URL = 'https://duel-fast.onrender.com';
const SERVER_URL = import.meta.env.VITE_SERVER_URL
  || (import.meta.env.DEV ? 'http://localhost:3001' : FALLBACK_PROD_SERVER_URL);

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function charImg(character: string | null): string | undefined {
  return character ? characterImages[character] : undefined;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86_400_000) return 'Today';
  if (diff < 172_800_000) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function winnerLabel(game: GameRow, myId: string): string {
  if (!game.winner) {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const isStale = new Date(game.created_at) < twoHoursAgo;
    return isStale ? 'Abandoned' : 'In progress';
  }
  if (game.winner === 'draw') return 'Draw';
  const isP1 = game.player1_id === myId;
  const iWon = (game.winner === 'player1' && isP1) || (game.winner === 'player2' && !isP1);
  return iWon ? 'You won' : 'You lost';
}

function winnerColor(game: GameRow, myId: string): string {
  if (!game.winner) return 'rgba(255,255,255,0.4)';
  if (game.winner === 'draw') return '#FFE66D';
  const isP1 = game.player1_id === myId;
  const iWon = (game.winner === 'player1' && isP1) || (game.winner === 'player2' && !isP1);
  return iWon ? '#4EFFC4' : '#FF6BA8';
}

function timeRemaining(expiresAt: string | null): string {
  if (!expiresAt) return '';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `expires in ${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `expires in ${hours}h ${remainMins}m`;
}

function isPendingAndValid(c: ChallengeRow): boolean {
  if (c.status !== 'pending') return false;
  if (!c.expires_at) return true;
  return new Date(c.expires_at).getTime() > Date.now();
}

// ─── Small components ─────────────────────────────────────────────────────────

function AvatarBubble({ src, size = 48 }: { src?: string; size?: number }) {
  return (
    <div
      className="rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
      style={{
        width: size, height: size,
        background: '#1C1C3E',
        border: '2px solid rgba(78,255,196,0.3)',
        boxShadow: '0 0 12px rgba(78,255,196,0.15)',
      }}
    >
      {src
        ? <img src={src} alt="" className="w-full h-full object-contain p-1" draggable={false} />
        : <div className="w-full h-full rounded-full" style={{ background: 'rgba(78,255,196,0.15)' }} />
      }
    </div>
  );
}

function MessageBubble({ msg, myUserId, theirAvatar }: {
  msg: DbMessage; myUserId: string; theirAvatar?: string;
}) {
  const isMe = msg.sender === myUserId;
  return (
    <motion.div
      className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {!isMe && <AvatarBubble src={theirAvatar} size={28} />}
      <div className={`flex flex-col gap-0.5 max-w-[72%] ${isMe ? 'items-end' : 'items-start'}`}>
        <div
          className="px-4 py-2.5 rounded-2xl font-body text-ui-body leading-relaxed"
          style={isMe ? {
            background: 'linear-gradient(135deg, rgba(255,107,168,0.35), rgba(181,101,255,0.35))',
            border: '1px solid rgba(255,107,168,0.35)',
            color: 'rgba(255,255,255,0.92)',
            borderBottomRightRadius: 4,
          } : {
            background: 'linear-gradient(135deg, rgba(78,255,196,0.18), rgba(78,200,255,0.18))',
            border: '1px solid rgba(78,255,196,0.3)',
            color: 'rgba(255,255,255,0.92)',
            borderBottomLeftRadius: 4,
          }}
        >
          {msg.content}
        </div>
        <span className="font-body text-ui-caption px-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {formatTime(msg.created_at)}
          {isMe && (
            <span className="ml-1" style={{ color: msg.delivered ? '#4EFFC4' : 'rgba(255,255,255,0.25)' }}>
              {msg.delivered ? ' \u2713\u2713' : ' \u2713'}
            </span>
          )}
        </span>
      </div>
      {isMe && <div style={{ width: 28 }} />}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MatchScreen() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const myUserId = user?.id ?? '';

  // ── Flash message from navigation state ────────────────────────
  const flash = (location.state as { flash?: string } | null)?.flash ?? null;
  const [showFlash, setShowFlash] = useState(!!flash);
  const [flashDismissed, setFlashDismissed] = useState(false);
  useEffect(() => {
    if (!flash || flashDismissed) return;
    setShowFlash(true);
    const t = setTimeout(() => setShowFlash(false), 3000);
    return () => clearTimeout(t);
  }, [flash, flashDismissed]);

  // ── State ──────────────────────────────────────────────────────
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [theirProfile, setTheirProfile] = useState<UserProfile | null>(null);
  const [games, setGames] = useState<GameRow[]>([]);
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [cancellingOutgoingId, setCancellingOutgoingId] = useState<string | null>(null);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [isGameHistoryExpanded, setIsGameHistoryExpanded] = useState(false);
  const [safetyMenuOpen, setSafetyMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [theirPhotoUrls, setTheirPhotoUrls] = useState<string[]>([]);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesLenRef = useRef(0);
  const navigatedToGameRef = useRef(false);
  const openedPickerFromStateRef = useRef(false);

  const theirAvatar = charImg(theirProfile?.character ?? null);
  const myAvatar = charImg(myProfile?.character ?? null);

  // ── Chat lock: unlocked only when at least one game has a winner ─
  const chatUnlocked = games.some((g) => g.winner !== null);

  // ── Re-check games when window regains focus (e.g. after a game) ─
  useEffect(() => {
    if (!matchId) return;
    const refresh = async () => {
      try {
        const gameRows = await getGamesByMatch(matchId);
        setGames(gameRows);
      } catch { /* ignore */ }
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [matchId]);

  // ── Optional deep-link: open game picker from navigation state ─────
  useEffect(() => {
    if (!matchId || openedPickerFromStateRef.current) return;
    const shouldOpen = (location.state as { openGamePicker?: boolean } | null)?.openGamePicker === true;
    if (!shouldOpen) return;
    openedPickerFromStateRef.current = true;
    navigate('/play', { state: { matchId }, replace: true });
  }, [location.state, matchId, navigate]);

  // ── Load profiles + games + messages on mount ──────────────────
  useEffect(() => {
    if (!matchId || !myUserId) return;
    setLoadError(null);
    let cancelled = false;

    (async () => {
      try {
        // Resolve opponent from match
        const match = await getMatchById(matchId);
        if (cancelled) return;
        if (!match) {
          setLoadError('This match could not be found. It may have expired.');
          setLoading(false);
          return;
        }

        const opponentId = match.user_a === myUserId ? match.user_b : match.user_a;

        // Load in parallel
        const [myP, theirP, gameRows, msgs, challs] = await Promise.all([
          getProfile(myUserId),
          getProfile(opponentId),
          getGamesByMatch(matchId),
          getMessages(matchId),
          getChallengesForMatch(matchId),
        ]);

        if (cancelled) return;
        setMyProfile(myP.data);
        setTheirProfile(theirP.data);
        setGames(gameRows);
        setMessages(msgs);
        setChallenges(challs);
        messagesLenRef.current = msgs.length;

        markMessagesRead(matchId);
      } catch (err) {
        console.error('[MatchScreen] load error:', err);
        if (!cancelled) setLoadError('Failed to load match details. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [matchId, myUserId]);

  const setupAndNavigateToAcceptedChallenge = useCallback(async (challenge: ChallengeRow): Promise<boolean> => {
    const resolvedRoute = resolveGameRoute(challenge.game_type, challenge.match_id);
    const normalizedType = normalizeGameType(challenge.game_type);
    if (!resolvedRoute || !normalizedType) {
      setChallengeError('Unsupported game type for this challenge.');
      return false;
    }

    // Word Blitz is intentionally untouched and keeps direct route navigation.
    if (normalizedType === 'word_blitz') {
      navigate(resolvedRoute.path);
      return true;
    }

    const setup = await prepareAcceptedChallenge({
      matchId: challenge.match_id,
      gameType: challenge.game_type,
      myUserId,
    });

    if (!setup.ok) {
      setChallengeError('Failed to start game. Please try again.');
      return false;
    }

    // Dot Dash uses an in-memory Socket.IO server state.
    // Create the in-memory lobby keyed by the Duel matchId before navigating.
    if (normalizedType === 'dot_dash') {
      try {
        const opponentId = challenge.from_user === myUserId ? challenge.to_user : challenge.from_user;
        const [p1Id, p2Id] = myUserId < opponentId ? [myUserId, opponentId] : [opponentId, myUserId];

        const p1Profile = p1Id === myUserId ? myProfile : theirProfile;
        const p2Profile = p2Id === myUserId ? myProfile : theirProfile;

        const p1Name = p1Profile?.name ?? 'Player 1';
        const p2Name = p2Profile?.name ?? 'Opponent';

        const res = await fetch(`${SERVER_URL}/api/dotdash/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Key the in-memory server game by the Duel matchId,
            // since our routes/results are already using matchId.
            gameId: challenge.match_id,
            player1Id: p1Id,
            player1Name: p1Name,
            player2Id: p2Id,
            player2Name: p2Name,
          }),
        });

        if (!res.ok) throw new Error(`DotDash create failed: ${res.status}`);
        const created = await res.json().catch(() => null) as { gameId?: string } | null;
        const ddGameId = created?.gameId ?? null;
        if (!ddGameId) throw new Error('DotDash create did not return gameId');

        navigate(`/dotdash/${ddGameId}/play`);
        return true;
      } catch (err) {
        console.error('[MatchScreen] DotDash create failed:', err);
        setChallengeError('Failed to start Dot Dash. Please try again.');
        return false;
      }
    }

    if (normalizedType === 'maze_race') {
      try {
        const opponentId = challenge.from_user === myUserId ? challenge.to_user : challenge.from_user;
        const [p1Id, p2Id] = myUserId < opponentId ? [myUserId, opponentId] : [opponentId, myUserId];

        const p1Profile = p1Id === myUserId ? myProfile : theirProfile;
        const p2Profile = p2Id === myUserId ? myProfile : theirProfile;

        const p1Name = p1Profile?.name ?? 'Player 1';
        const p2Name = p2Profile?.name ?? 'Opponent';

        const res = await fetch(`${SERVER_URL}/api/mazerace/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: challenge.match_id,
            player1Id: p1Id,
            player1Name: p1Name,
            player2Id: p2Id,
            player2Name: p2Name,
          }),
        });

        if (!res.ok) throw new Error(`MazeRace create failed: ${res.status}`);
        const created = await res.json().catch(() => null) as { gameId?: string } | null;
        const mrGameId = created?.gameId ?? null;
        if (!mrGameId) throw new Error('MazeRace create did not return gameId');

        navigate(`/mazerace/${mrGameId}/lobby`);
        return true;
      } catch (err) {
        console.error('[MatchScreen] MazeRace create failed:', err);
        setChallengeError('Failed to start Maze Race. Please try again.');
        return false;
      }
    }

    navigate(resolvedRoute.path);
    return true;
  }, [myUserId, navigate, myProfile, theirProfile]);

  // ── Challenges: mount check + Supabase Realtime ─────────────────
  useEffect(() => {
    if (!matchId || !myUserId || !supabase) return;

    // Realtime subscription for challenge changes
    const channel = supabase
      .channel(`match-challenges-${matchId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'challenges', filter: `match_id=eq.${matchId}` },
        async (payload) => {
          const updated = payload.new as ChallengeRow;
          setChallenges((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          // Inviter is on MatchScreen when opponent accepts
          if (updated.from_user === myUserId && updated.status === 'accepted') {
            const age = updated.resolved_at
              ? Date.now() - new Date(updated.resolved_at).getTime()
              : Infinity;
            if (age < 60_000) {
              if (navigatedToGameRef.current) return;
              navigatedToGameRef.current = true;
              try { await supabase!.from('challenges').update({ status: 'consumed' }).eq('id', updated.id); } catch {}
              const ok = await setupAndNavigateToAcceptedChallenge(updated);
              if (!ok) navigatedToGameRef.current = false;
            }
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'challenges', filter: `match_id=eq.${matchId}` },
        (payload) => {
          const newChall = payload.new as ChallengeRow;
          setChallenges((prev) => {
            if (prev.some((c) => c.id === newChall.id)) return prev;
            return [...prev, newChall];
          });
        },
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            const challs = await getChallengesForMatch(matchId);
            setChallenges(challs);
            const accepted = challs.find(
              (c) => c.from_user === myUserId && c.status === 'accepted',
            );
            if (accepted) {
              if (navigatedToGameRef.current) return;
              navigatedToGameRef.current = true;
              try { await supabase!.from('challenges').update({ status: 'consumed' }).eq('id', accepted.id); } catch {}
              const ok = await setupAndNavigateToAcceptedChallenge(accepted);
              if (!ok) navigatedToGameRef.current = false;
            }
          } catch { /* ignore */ }
        }
      });

    return () => { supabase?.removeChannel(channel); };
  }, [matchId, myUserId, setupAndNavigateToAcceptedChallenge]);

  // ── Poll for challenge acceptance every 5s (safety net) ────────
  useEffect(() => {
    if (!matchId || !myUserId) return;

    const id = setInterval(async () => {
      try {
        const challs = await getChallengesForMatch(matchId);
        const accepted = challs.find(
          (c) => c.from_user === myUserId && c.status === 'accepted',
        );
        if (accepted) {
          clearInterval(id);
          if (navigatedToGameRef.current) return;
          navigatedToGameRef.current = true;
          const ok = await setupAndNavigateToAcceptedChallenge(accepted);
          if (!ok) navigatedToGameRef.current = false;
        }
      } catch { /* retry on next tick */ }
    }, CHALLENGE_POLL_MS);

    return () => clearInterval(id);
  }, [matchId, myUserId, setupAndNavigateToAcceptedChallenge]);

  // ── Derived: incoming + outgoing pending challenges ────────────
  const incomingChallenges = challenges.filter(
    (c) => c.to_user === myUserId && isPendingAndValid(c),
  );
  const outgoingChallenges = challenges.filter(
    (c) => c.from_user === myUserId && isPendingAndValid(c),
  );

  const rejoinableWordBlitzIdx = games.findIndex(
    (g) => g.game_type === 'word_blitz'
      && g.winner === null
      && g.status !== 'finished'
      && g.status !== 'abandoned',
  );

  const finishedGames = games.filter((g) => g.winner !== null);
  const gameRecord = finishedGames.reduce(
    (acc, g) => {
      if (g.winner === 'draw') {
        acc.draws += 1;
        return acc;
      }
      const isP1 = g.player1_id === myUserId;
      const iWon = (g.winner === 'player1' && isP1) || (g.winner === 'player2' && !isP1);
      if (iWon) acc.wins += 1;
      else acc.losses += 1;
      return acc;
    },
    { wins: 0, losses: 0, draws: 0 },
  );

  // ── Accept / decline handlers ──────────────────────────────────
  const handleAccept = async (c: ChallengeRow) => {
    if (acceptingId) return;
    setAcceptingId(c.id);
    setChallengeError(null);
    try {
      await acceptChallenge(c.id);
      if (navigatedToGameRef.current) return;
      navigatedToGameRef.current = true;
      const ok = await setupAndNavigateToAcceptedChallenge(c);
      if (!ok) {
        navigatedToGameRef.current = false;
        setAcceptingId(null);
      }
    } catch (err) {
      console.error('[MatchScreen] accept challenge error:', err);
      setChallengeError('Failed to accept challenge. Please try again.');
      setAcceptingId(null);
    }
  };

  const handleDecline = async (c: ChallengeRow) => {
    try {
      await declineChallenge(c.id);
      setChallenges((prev) => prev.filter((ch) => ch.id !== c.id));
    } catch (err) {
      console.error('[MatchScreen] decline challenge error:', err);
      setChallengeError('Failed to decline challenge. Please try again.');
    }
  };

  const handleCancelOutgoing = async (c: ChallengeRow) => {
    if (cancellingOutgoingId) return;
    setCancellingOutgoingId(c.id);
    setChallengeError(null);
    try {
      await cancelChallenge(c.id);
      // Remove immediately from local UI.
      setChallenges((prev) => prev.filter((ch) => ch.id !== c.id));
    } catch (err) {
      console.error('[MatchScreen] cancel outgoing challenge error:', err);
      setChallengeError('Failed to cancel challenge. Please try again.');
    } finally {
      setCancellingOutgoingId(null);
    }
  };

  // ── Poll for new messages every 5s (only when chat unlocked) ───
  useEffect(() => {
    if (!matchId || !myUserId || !chatUnlocked) return;

    const id = setInterval(async () => {
      try {
        const msgs = await getMessages(matchId);
        if (msgs.length !== messagesLenRef.current) {
          setMessages(msgs);
          messagesLenRef.current = msgs.length;
          markMessagesRead(matchId);
        }
      } catch { /* retry on next tick */ }
    }, CHAT_POLL_MS);

    return () => clearInterval(id);
  }, [matchId, myUserId, chatUnlocked]);

  // ── Realtime via Supabase channel (complements polling) ────────
  useEffect(() => {
    if (!matchId || !supabase || !chatUnlocked) return;

    const channel = supabase
      .channel(`match-chat-${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${matchId}` },
        (payload) => {
          const msg = payload.new as DbMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            messagesLenRef.current = prev.length + 1;
            return [...prev, msg];
          });
          if (msg.sender !== myUserId) markMessagesRead(matchId);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${matchId}` },
        (payload) => {
          const updated = payload.new as DbMessage;
          setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m));
        },
      )
      .subscribe();

    return () => { supabase?.removeChannel(channel); };
  }, [matchId, myUserId, chatUnlocked]);

  // ── Auto-scroll when new messages arrive ───────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // ── Send message ───────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!input.trim() || !matchId || !myUserId || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    const msg = await sendMessage(matchId, myUserId, content);
    if (msg) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        messagesLenRef.current = prev.length + 1;
        return [...prev, msg];
      });
    }
    setSending(false);
    inputRef.current?.focus();
  }, [input, matchId, myUserId, sending]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const canSend = !!input.trim() && !!matchId && !!myUserId;
  const theirName = theirProfile?.name ?? 'Match';
  const theirUserId = theirProfile?.id ?? '';

  useEffect(() => {
    if (!theirUserId) {
      setTheirPhotoUrls([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const photos = await getPhotos(theirUserId);
      if (!cancelled) setTheirPhotoUrls(photos);
    })();
    return () => { cancelled = true; };
  }, [theirUserId]);

  const runMatchBlock = async () => {
    if (!myUserId || !theirUserId) return;
    setBlockError(null);
    try {
      const { error } = await blockUser(myUserId, theirUserId);
      if (error) {
        console.error('[MatchScreen] block failed:', error);
        setBlockError(error.message || 'Could not block user.');
        return;
      }
      navigate('/matches', { replace: true });
    } catch (e) {
      console.error('[MatchScreen] block threw:', e);
      setBlockError(e instanceof Error ? e.message : 'Could not block user.');
    }
  };

  if (!loading && loadError) {
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#12122A' }}>
        <header
          className="flex-none px-4 pt-4 pb-3 z-10"
          style={{
            background: 'rgba(18,18,42,0.96)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => navigate('/matches', { replace: true })}
              className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.88 }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M11 4L6 9L11 14" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
            <span className="font-display font-extrabold text-sm" style={{ color: '#FFE66D' }}>
              Match not available
            </span>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-4">
          <div
            className="w-full max-w-sm rounded-2xl px-6 py-7 text-center"
            style={{
              background: 'rgba(14,22,48,0.9)',
              border: '1.5px solid rgba(255,107,168,0.35)',
              boxShadow: '0 12px 48px rgba(0,0,0,0.45)',
            }}
          >
            <p className="font-body text-ui-body" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {loadError}
            </p>
            <motion.button
              onClick={() => navigate('/matches', { replace: true })}
              className="mt-5 w-full py-3 rounded-xl font-display font-bold text-sm"
              style={{
                background: 'linear-gradient(135deg, rgba(255,61,113,0.95), rgba(181,101,255,0.95))',
                color: '#12122A',
                boxShadow: '0 0 18px rgba(255,107,168,0.25)',
                border: '2px solid rgba(0,0,0,0.35)',
              }}
              whileTap={{ scale: 0.98 }}
            >
              Back to Matches
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#12122A' }}>
      {/* Scanlines */}
      <div
        className="fixed inset-0 pointer-events-none z-40 opacity-[0.02]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,1) 3px, rgba(255,255,255,1) 4px)' }}
      />

      {/* ── Header ────────────────────────────────────────────── */}
      <header
        className="flex-none px-4 py-3 z-10"
        style={{
          background: 'rgba(18,18,42,0.96)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2">
          <div className="flex justify-start min-w-0">
            <motion.button
              onClick={() => navigate('/matches')}
              className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.88 }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M11 4L6 9L11 14" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          </div>

          <div className="flex justify-center min-w-0">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="flex flex-col items-center gap-2 min-w-0 max-w-[36vw] sm:max-w-[7.5rem]">
                <AvatarBubble src={myAvatar} size={56} />
                <span
                  className="font-body text-ui-body text-center truncate w-full px-0.5"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  {myProfile?.name ?? 'You'}
                </span>
              </div>
              <div
                className="flex flex-shrink-0 items-center justify-center font-display font-extrabold text-base"
                style={{
                  height: 56,
                  color: '#FFE66D',
                  textShadow: '0 0 10px rgba(255,230,109,0.4)',
                }}
              >
                VS
              </div>
              <div className="flex flex-col items-center gap-2 min-w-0 max-w-[36vw] sm:max-w-[7.5rem]">
                <button
                  type="button"
                  onClick={() => setProfileSheetOpen(true)}
                  aria-label={`Open ${theirName}'s profile`}
                  disabled={!theirUserId}
                  className="flex-shrink-0 disabled:opacity-50"
                >
                  <AvatarBubble src={theirAvatar} size={56} />
                </button>
                {theirUserId ? (
                  <button
                    type="button"
                    onClick={() => setProfileSheetOpen(true)}
                    className="font-body text-ui-body text-center truncate w-full px-0.5 max-w-full"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                    aria-label={`Open ${theirName}'s profile`}
                  >
                    {theirName}
                  </button>
                ) : (
                  <span
                    className="font-body text-ui-body text-center truncate w-full px-0.5"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    {theirName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end min-w-0">
            {theirUserId ? (
              <motion.button
                type="button"
                onClick={() => setSafetyMenuOpen(true)}
                className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.88 }}
                aria-label="More options"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                  <circle cx="9" cy="3.5" r="1.5" fill="rgba(255,255,255,0.65)" />
                  <circle cx="9" cy="9" r="1.5" fill="rgba(255,255,255,0.65)" />
                  <circle cx="9" cy="14.5" r="1.5" fill="rgba(255,255,255,0.65)" />
                </svg>
              </motion.button>
            ) : (
              <div className="w-9 flex-shrink-0" aria-hidden />
            )}
          </div>
        </div>
      </header>

      {blockError && (
        <div
          className="flex-none px-4 py-2 z-20 font-body text-ui-caption text-center"
          style={{ background: 'rgba(255,61,113,0.15)', color: '#FF6BA8', borderBottom: '1px solid rgba(255,61,113,0.25)' }}
          role="alert"
        >
          {blockError}
        </div>
      )}

      {/* ── Flash toast ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showFlash && flash && (
          <motion.div
            className="absolute top-20 left-1/2 z-50 px-4 py-2.5 rounded-2xl flex items-center gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(78,255,196,0.25), rgba(0,217,255,0.25))',
              border: '1.5px solid rgba(78,255,196,0.5)',
              color: '#4EFFC4',
              boxShadow: '0 4px 20px rgba(78,255,196,0.3)',
              transform: 'translateX(-50%)',
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <span className="font-display font-bold text-sm whitespace-nowrap">{flash}</span>
            <button
              type="button"
              onClick={() => {
                setFlashDismissed(true);
                setShowFlash(false);
              }}
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                border: '1px solid rgba(78,255,196,0.55)',
                background: 'rgba(10,22,40,0.35)',
                color: '#4EFFC4',
              }}
              aria-label="Dismiss challenge toast"
            >
              <span className="font-body text-ui-caption leading-none">x</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Scrollable body ───────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto flex flex-col"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {/* ── Challenge button ─────────────────────────────────── */}
        <div className="px-4 pt-4 pb-2">
          <motion.button
            onClick={() => navigate('/play', { state: { matchId } })}
            className="w-full py-3 rounded-2xl font-display font-extrabold text-base relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #4EFFC4 0%, #00D9FF 100%)',
              border: '3px solid black',
              boxShadow: '6px 6px 0px 0px #B565FF',
              color: '#1a1a2e',
            }}
            whileHover={{ scale: 1.02, boxShadow: '8px 8px 0px 0px #B565FF' }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
            Challenge to a Game
          </motion.button>
        </div>

        {/* ── Pending challenges ───────────────────────────────── */}
        {(incomingChallenges.length > 0 || outgoingChallenges.length > 0) && (
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-body text-ui-label font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Challenges
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>

            {/* Challenge error */}
            {challengeError && (
              <motion.div
                className="mb-2 px-3 py-2 rounded-xl font-body text-ui-caption"
                style={{ background: 'rgba(255,107,168,0.12)', border: '1px solid rgba(255,107,168,0.3)', color: '#FF6BA8' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {challengeError}
              </motion.div>
            )}

            <div className="flex flex-col gap-2">
              {/* Incoming challenges */}
              <AnimatePresence>
                {incomingChallenges.map((c) => (
                  <motion.div
                    key={c.id}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,107,168,0.08), rgba(181,101,255,0.08))',
                      border: '1.5px solid rgba(255,107,168,0.3)',
                    }}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm" style={{ color: 'rgba(255,255,255,0.92)' }}>
                        {theirName} wants to play{' '}
                        <span style={{ color: '#FF6BA8' }}>{GAME_LABELS[c.game_type] ?? c.game_type}</span>
                      </p>
                      <p className="font-body text-ui-caption mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        {timeRemaining(c.expires_at)}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <motion.button
                        onClick={() => handleAccept(c)}
                        disabled={acceptingId === c.id}
                        className="px-3 py-1.5 rounded-lg font-display font-bold text-xs"
                        style={{
                          background: 'linear-gradient(135deg, #4EFFC4, #00D9FF)',
                          color: '#12122A',
                          opacity: acceptingId === c.id ? 0.6 : 1,
                        }}
                        whileTap={{ scale: 0.93 }}
                      >
                        {acceptingId === c.id ? '...' : 'Accept'}
                      </motion.button>
                      <motion.button
                        onClick={() => handleDecline(c)}
                        className="px-3 py-1.5 rounded-lg font-display font-bold text-xs"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: 'rgba(255,255,255,0.5)',
                        }}
                        whileTap={{ scale: 0.93 }}
                      >
                        Decline
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Outgoing challenges */}
              {outgoingChallenges.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{
                    background: 'rgba(78,255,196,0.04)',
                    border: '1px solid rgba(78,255,196,0.15)',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-ui-body" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      <span style={{ color: '#4EFFC4' }}>{GAME_LABELS[c.game_type] ?? c.game_type}</span>
                      {' \u2014 '}
                      {timeRemaining(c.expires_at)}
                    </p>
                  </div>
                  <motion.button
                    onClick={() => handleCancelOutgoing(c)}
                    disabled={cancellingOutgoingId === c.id}
                    className="px-3 py-1.5 rounded-lg font-display font-bold text-xs flex-shrink-0"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.18)',
                      color: 'rgba(255,255,255,0.78)',
                      opacity: cancellingOutgoingId === c.id ? 0.7 : 1,
                    }}
                    whileTap={{ scale: 0.93 }}
                  >
                    {cancellingOutgoingId === c.id ? 'Cancelling...' : 'Cancel'}
                  </motion.button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Game history ─────────────────────────────────────── */}
        {games.length > 0 && (
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setIsGameHistoryExpanded((prev) => !prev)}
                className="flex items-center gap-2 min-w-0"
                aria-label={isGameHistoryExpanded ? 'Collapse game history' : 'Expand game history'}
              >
                <span className="font-body text-ui-label font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  Game History
                </span>
                <span className="font-body text-ui-label font-bold whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.48)' }}>
                  {`${gameRecord.wins}W · ${gameRecord.losses}L · ${gameRecord.draws}D`}
                </span>
                <span className="font-body text-ui-label font-bold" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {isGameHistoryExpanded ? '▲' : '▼'}
                </span>
              </button>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>
            <AnimatePresence initial={false}>
              {isGameHistoryExpanded && (
                <motion.div
                  className="flex flex-col gap-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {games.map((g, idx) => (
                    <div
                      key={g.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                          {GAME_LABELS[g.game_type] ?? g.game_type}
                        </p>
                        <p className="font-body text-ui-caption" style={{ color: 'rgba(255,255,255,0.7)' }}>
                          {formatDate(g.created_at)}
                        </p>
                      </div>
                      {idx === rejoinableWordBlitzIdx ? (
                        <motion.button
                          type="button"
                          onClick={() => navigate(`/games/word-blitz/${matchId}`)}
                          className="font-display font-bold text-xs px-2 py-0.5 rounded-full animate-pulse flex-shrink-0"
                          style={{
                            textTransform: 'uppercase',
                            color: '#4EFFC4',
                            background: 'transparent',
                            border: '1px solid #4EFFC4',
                            boxShadow: '0 0 12px rgba(78,255,196,0.25)',
                          }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Rejoin
                        </motion.button>
                      ) : (
                        <span
                          className="font-display font-bold text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{
                            color: winnerColor(g, myUserId),
                            background: `${winnerColor(g, myUserId)}18`,
                            border: `1px solid ${winnerColor(g, myUserId)}44`,
                          }}
                        >
                          {winnerLabel(g, myUserId)}
                        </span>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Chat section divider ─────────────────────────────── */}
        <div className="px-4 pt-4 pb-1">
          <div className="flex items-center gap-2">
            <span className="font-body text-ui-label font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Chat
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            {!chatUnlocked && !loading && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                <rect x="3" y="6" width="8" height="6" rx="1.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
                <path d="M5 6V4.5C5 3.4 5.9 2.5 7 2.5C8.1 2.5 9 3.4 9 4.5V6" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            )}
          </div>
        </div>

        {/* ── Chat content (locked or unlocked) ────────────────── */}
        {!chatUnlocked && !loading ? (
          /* Locked state */
          <div className="flex-1 px-4 flex flex-col items-center justify-center gap-3 pb-6 pt-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '2px solid rgba(255,255,255,0.08)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="11" width="14" height="10" rx="2" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                <path d="M8 11V8C8 5.8 9.8 4 12 4C14.2 4 16 5.8 16 8V11" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="12" cy="16" r="1.5" fill="rgba(255,255,255,0.3)" />
              </svg>
            </div>
            <p className="font-display text-sm text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Play a game first to unlock chat
            </p>
            <motion.button
              onClick={() => navigate('/play', { state: { matchId } })}
              className="px-5 py-2 rounded-xl font-display font-bold text-xs"
              style={{
                background: 'rgba(78,255,196,0.1)',
                border: '1.5px solid rgba(78,255,196,0.3)',
                color: '#4EFFC4',
              }}
              whileTap={{ scale: 0.95 }}
            >
              Challenge Now
            </motion.button>
          </div>
        ) : (
          /* Unlocked: show messages */
          <div className="flex-1 px-4 flex flex-col gap-3 pb-3 pt-2">
            {loading && (
              <div className="flex justify-center py-4">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{ background: 'rgba(78,255,196,0.4)' }}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
                    />
                  ))}
                </div>
              </div>
            )}

            {!loading && messages.length === 0 && (
              <motion.div
                className="text-center py-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p className="font-body text-ui-body" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  No messages yet. Say hi!
                </p>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {!loading && messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} myUserId={myUserId} theirAvatar={theirAvatar} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Chat input (only when unlocked) ───────────────────── */}
      {chatUnlocked && (
        <div
          className="flex-none px-4 py-3"
          style={{
            background: 'rgba(14,14,34,0.97)',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${theirName}...`}
              disabled={!matchId || !myUserId}
              className="flex-1 px-4 py-2.5 rounded-2xl font-body text-ui-body outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${input ? 'rgba(78,255,196,0.35)' : 'rgba(255,255,255,0.08)'}`,
                color: 'rgba(255,255,255,0.92)',
                caretColor: '#4EFFC4',
              }}
            />
            <motion.button
              onClick={handleSend}
              disabled={!canSend || sending}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: canSend ? 'linear-gradient(135deg, #4EFFC4, #00D9FF)' : 'rgba(78,255,196,0.08)',
                border: `1.5px solid ${canSend ? '#4EFFC4' : 'rgba(78,255,196,0.2)'}`,
                opacity: sending ? 0.6 : 1,
              }}
              whileTap={canSend ? { scale: 0.88 } : {}}
              whileHover={canSend ? { scale: 1.08 } : {}}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14 8L2 2L5 8L2 14L14 8Z" fill={canSend ? '#12122A' : 'rgba(78,255,196,0.3)'} />
              </svg>
            </motion.button>
          </div>
        </div>
      )}

      <SafetyMenuSheet
        open={safetyMenuOpen}
        targetName={theirName}
        onClose={() => setSafetyMenuOpen(false)}
        onBlock={() => void runMatchBlock()}
        onReport={() => setReportOpen(true)}
      />

      <ReportUserModal
        open={reportOpen && !!theirUserId && !!myUserId}
        onClose={() => setReportOpen(false)}
        reporterId={myUserId}
        reportedId={theirUserId}
        reportedName={theirName}
        onAfterBlock={() => navigate('/matches', { replace: true })}
      />

      <AnimatePresence>
        {profileSheetOpen && theirProfile && (
          <ProfileDetailSheet
            key={theirProfile.id}
            profile={{
              id: theirProfile.id,
              name: theirProfile.name ?? 'Match',
              age: theirProfile.age ?? 0,
              location: theirProfile.location ?? undefined,
              character: theirProfile.character ?? 'ghost',
              element: theirProfile.element ?? 'fire',
              affiliation: theirProfile.affiliation ?? 'city',
              bio: theirProfile.bio ?? 'No bio available yet.',
              games: theirProfile.game_types ?? [],
              favoriteGames: theirProfile.favorite_games ?? [],
              relationshipGoals: theirProfile.looking_for ?? [],
              intent:
                theirProfile.intent === 'play' || theirProfile.intent === 'romance' || theirProfile.intent === 'both'
                  ? (theirProfile.intent as IntentValue)
                  : undefined,
              gender: theirProfile.gender ?? null,
              interestedIn: theirProfile.interested_in ?? null,
              birthday: theirProfile.birthday ?? null,
              kids: theirProfile.kids ?? 'Not set',
              drinking: theirProfile.drinking ?? 'Not set',
              smoking: theirProfile.smoking ?? 'Not set',
              cannabis: theirProfile.cannabis ?? 'Not set',
              pets: theirProfile.pets ?? 'Not set',
              exercise: theirProfile.exercise ?? 'Not set',
            }}
            photoUrls={theirPhotoUrls}
            onClose={() => setProfileSheetOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
