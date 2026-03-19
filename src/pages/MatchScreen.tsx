import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import {
  getProfile,
  getMatchById,
  getGamesByMatch,
  getMessages,
  sendMessage,
  markMessagesRead,
} from '../lib/database';
import type { UserProfile, GameRow, DbMessage } from '../lib/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHAT_POLL_MS = 5_000;

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

const GAME_LABELS: Record<string, string> = {
  guess_who: 'Guess Who?',
  'guess-who': 'Guess Who?',
  dot_dash: 'Dot Dash',
  'dot-dash': 'Dot Dash',
  word_blitz: 'Word Blitz',
  'word-blitz': 'Word Blitz',
  draughts: 'Draughts',
  connect_four: 'Connect Four',
  'connect-four': 'Connect Four',
  battleship: 'Battleship',
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
  if (!game.winner) return 'In progress';
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
          className="px-4 py-2.5 rounded-2xl font-body text-sm leading-relaxed"
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
        <span className="font-body text-xs px-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
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
  const { user } = useAuthStore();
  const myUserId = user?.id ?? '';

  // ── State ──────────────────────────────────────────────────────
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [theirProfile, setTheirProfile] = useState<UserProfile | null>(null);
  const [games, setGames] = useState<GameRow[]>([]);
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesLenRef = useRef(0);

  const theirAvatar = charImg(theirProfile?.character ?? null);
  const myAvatar = charImg(myProfile?.character ?? null);

  // ── Load profiles + games + messages on mount ──────────────────
  useEffect(() => {
    if (!matchId || !myUserId) return;
    let cancelled = false;

    (async () => {
      try {
        // Resolve opponent from match
        const match = await getMatchById(matchId);
        if (cancelled || !match) { setLoading(false); return; }

        const opponentId = match.user_a === myUserId ? match.user_b : match.user_a;

        // Load in parallel
        const [myP, theirP, gameRows, msgs] = await Promise.all([
          getProfile(myUserId),
          getProfile(opponentId),
          getGamesByMatch(matchId),
          getMessages(matchId),
        ]);

        if (cancelled) return;
        setMyProfile(myP.data);
        setTheirProfile(theirP.data);
        setGames(gameRows);
        setMessages(msgs);
        messagesLenRef.current = msgs.length;

        markMessagesRead(matchId, myUserId);
      } catch (err) {
        console.error('[MatchScreen] load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [matchId, myUserId]);

  // ── Poll for new messages every 5s ─────────────────────────────
  useEffect(() => {
    if (!matchId || !myUserId) return;

    const id = setInterval(async () => {
      try {
        const msgs = await getMessages(matchId);
        if (msgs.length !== messagesLenRef.current) {
          setMessages(msgs);
          messagesLenRef.current = msgs.length;
          markMessagesRead(matchId, myUserId);
        }
      } catch { /* retry on next tick */ }
    }, CHAT_POLL_MS);

    return () => clearInterval(id);
  }, [matchId, myUserId]);

  // ── Realtime via Supabase channel (complements polling) ────────
  useEffect(() => {
    if (!matchId || !supabase) return;

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
          if (msg.sender !== myUserId) markMessagesRead(matchId, myUserId);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, myUserId]);

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
        className="flex-none px-4 pt-4 pb-3 z-10"
        style={{
          background: 'rgba(18,18,42,0.96)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Top row: back + names */}
        <div className="flex items-center gap-3">
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

          {/* Both avatars with VS */}
          <div className="flex items-center gap-2 flex-1 justify-center">
            <AvatarBubble src={myAvatar} size={40} />
            <span
              className="font-display font-extrabold text-sm"
              style={{ color: '#FFE66D', textShadow: '0 0 10px rgba(255,230,109,0.4)' }}
            >
              VS
            </span>
            <AvatarBubble src={theirAvatar} size={40} />
          </div>

          {/* Spacer to balance back button */}
          <div className="w-9" />
        </div>

        {/* Names below avatars */}
        <div className="flex justify-center gap-6 mt-1.5">
          <span className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {myProfile?.name ?? 'You'}
          </span>
          <span className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {theirName}
          </span>
        </div>
      </header>

      {/* ── Scrollable body ───────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto flex flex-col"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {/* ── Challenge button (Stage 3 placeholder) ──────────── */}
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

        {/* ── Game history ─────────────────────────────────────── */}
        {games.length > 0 && (
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-body text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Game History
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>
            <div className="flex flex-col gap-2">
              {games.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                      {GAME_LABELS[g.game_type] ?? g.game_type}
                    </p>
                    <p className="font-body text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {formatDate(g.created_at)}
                    </p>
                  </div>
                  <span
                    className="font-display font-bold text-xs px-2 py-0.5 rounded-full"
                    style={{
                      color: winnerColor(g, myUserId),
                      background: `${winnerColor(g, myUserId)}18`,
                      border: `1px solid ${winnerColor(g, myUserId)}44`,
                    }}
                  >
                    {winnerLabel(g, myUserId)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Chat section divider ─────────────────────────────── */}
        <div className="px-4 pt-4 pb-1">
          <div className="flex items-center gap-2">
            <span className="font-body text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Chat
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
        </div>

        {/* ── Messages ─────────────────────────────────────────── */}
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
              <p className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
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
      </div>

      {/* ── Chat input ────────────────────────────────────────── */}
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
            className="flex-1 px-4 py-2.5 rounded-2xl font-body text-sm outline-none"
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
    </div>
  );
}
