import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { getMessages, sendMessage, markMessagesRead, hasCompletedGame } from '../lib/database';
import type { DbMessage } from '../lib/database';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatState {
  matchId?: string;
  name?: string;
  avatar?: string;
  character?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ─── Avatar bubble ─────────────────────────────────────────────────────────────

function AvatarBubble({ src, size = 32 }: { src?: string; size?: number }) {
  return (
    <div
      className="rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
      style={{
        width: size, height: size,
        background: '#1C1C3E',
        border: '1.5px solid rgba(78,255,196,0.35)',
        boxShadow: '0 0 8px rgba(78,255,196,0.2)',
      }}
    >
      {src
        ? <img src={src} alt="" className="w-full h-full object-contain p-0.5" draggable={false} />
        : <div className="w-full h-full" style={{ background: 'rgba(78,255,196,0.15)' }} />
      }
    </div>
  );
}

// ─── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg, myUserId, theirAvatar }: {
  msg: DbMessage;
  myUserId: string;
  theirAvatar?: string;
}) {
  const isMe = msg.sender === myUserId;

  return (
    <motion.div
      className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {!isMe && <AvatarBubble src={theirAvatar} size={30} />}

      <div className={`flex flex-col gap-0.5 max-w-[72%] ${isMe ? 'items-end' : 'items-start'}`}>
        <div
          className="px-4 py-2.5 rounded-2xl font-body text-sm leading-relaxed"
          style={isMe ? {
            background: 'linear-gradient(135deg, rgba(255,107,168,0.35) 0%, rgba(181,101,255,0.35) 100%)',
            border: '1px solid rgba(255,107,168,0.35)',
            color: 'rgba(255,255,255,0.92)',
            borderBottomRightRadius: 4,
            boxShadow: '0 2px 12px rgba(255,107,168,0.15)',
          } : {
            background: 'linear-gradient(135deg, rgba(78,255,196,0.18) 0%, rgba(78,200,255,0.18) 100%)',
            border: '1px solid rgba(78,255,196,0.3)',
            color: 'rgba(255,255,255,0.92)',
            borderBottomLeftRadius: 4,
            boxShadow: '0 2px 12px rgba(78,255,196,0.1)',
          }}
        >
          {msg.content}
        </div>
        <span className="font-body text-xs px-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {formatTime(msg.created_at)}
          {isMe && (
            <span className="ml-1" style={{ color: msg.delivered ? '#4EFFC4' : 'rgba(255,255,255,0.25)' }}>
              {msg.delivered ? ' ✓✓' : ' ✓'}
            </span>
          )}
        </span>
      </div>

      {isMe && <div style={{ width: 30 }} />}
    </motion.div>
  );
}

// ─── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator({ theirAvatar }: { theirAvatar?: string }) {
  return (
    <motion.div
      className="flex items-end gap-2"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
    >
      <AvatarBubble src={theirAvatar} size={30} />
      <div
        className="px-4 py-3 rounded-2xl flex gap-1 items-center"
        style={{
          background: 'linear-gradient(135deg, rgba(78,255,196,0.18) 0%, rgba(78,200,255,0.18) 100%)',
          border: '1px solid rgba(78,255,196,0.3)',
          borderBottomLeftRadius: 4,
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'rgba(78,255,196,0.7)' }}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Chat screen ───────────────────────────────────────────────────────────────

export function ChatScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const myUserId = user?.id ?? '';

  const state = (location.state ?? {}) as ChatState;
  const matchId = state.matchId ?? localStorage.getItem('pending_match_id') ?? null;
  const theirName = state.name ?? 'Match';
  const theirAvatar = state.avatar ?? (state.character ? characterImages[state.character] : undefined);

  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [chatUnlocked, setChatUnlocked] = useState(false);

  // Gate: redirect to game picker if no game has been completed for this match
  useEffect(() => {
    if (!matchId) return;
    hasCompletedGame(matchId).then((done) => {
      if (done) {
        setChatUnlocked(true);
      } else {
        localStorage.setItem('pending_match_id', matchId);
        navigate('/play', { state: { matchId }, replace: true });
      }
    });
  }, [matchId, navigate]);

  // Scroll to bottom whenever messages or typing state changes
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  // Load message history
  useEffect(() => {
    if (!matchId) { setLoading(false); return; }
    getMessages(matchId).then((msgs) => {
      setMessages(msgs);
      setLoading(false);
    });
    if (myUserId) markMessagesRead(matchId, myUserId);
  }, [matchId, myUserId]);

  // Realtime: new messages + read-receipt updates + typing broadcasts
  useEffect(() => {
    if (!matchId || !supabase) return;

    const channel = supabase
      .channel(`chat-${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${matchId}` },
        (payload) => {
          const msg = payload.new as DbMessage;
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
          if (msg.sender !== myUserId && myUserId) {
            markMessagesRead(matchId, myUserId);
          }
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
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.userId !== myUserId) {
          setIsTyping(true);
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setIsTyping(false), 2500);
        }
      })
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, myUserId]);

  const broadcastTyping = useCallback(() => {
    if (!matchId || !supabase) return;
    supabase.channel(`chat-${matchId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: myUserId },
    });
  }, [matchId, myUserId]);

  const handleSend = async () => {
    if (!input.trim() || !matchId || !myUserId || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    const msg = await sendMessage(matchId, myUserId, content);
    if (msg) {
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    broadcastTyping();
  };

  const canSend = !!input.trim() && !!matchId && !!myUserId;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#12122A' }}>
      {/* Scanlines */}
      <div
        className="fixed inset-0 pointer-events-none z-40 opacity-[0.02]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,1) 3px, rgba(255,255,255,1) 4px)' }}
      />

      {/* Header */}
      <header
        className="flex-none flex items-center gap-3 px-4 pt-safe pt-4 pb-3 z-10"
        style={{
          background: 'rgba(18,18,42,0.96)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <motion.button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          whileTap={{ scale: 0.88 }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9L11 14" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>

        <div className="relative flex-shrink-0">
          <AvatarBubble src={theirAvatar} size={40} />
          <div
            className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
            style={{ background: '#4EFFC4', borderColor: '#12122A' }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h1
            className="font-display text-xl leading-none truncate"
            style={{ color: '#FFE66D', textShadow: '0 0 10px rgba(255,230,109,0.45)' }}
          >
            {theirName}
          </h1>
          <p className="font-body text-xs mt-0.5" style={{ color: isTyping ? '#4EFFC4' : 'rgba(78,255,196,0.5)' }}>
            {isTyping ? 'typing...' : 'Active now'}
          </p>
        </div>

        <motion.button
          onClick={() => navigate('/play', { state: { matchId } })}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-body font-bold text-xs"
          style={{
            background: 'rgba(78,255,196,0.1)',
            border: '1.5px solid rgba(78,255,196,0.35)',
            color: '#4EFFC4',
          }}
          whileTap={{ scale: 0.93 }}
          whileHover={{ background: 'rgba(78,255,196,0.18)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="4" width="12" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M4 7H6M5 6V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="9" cy="7" r="0.8" fill="currentColor"/>
            <circle cx="11" cy="7" r="0.8" fill="currentColor"/>
          </svg>
          Play
        </motion.button>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 flex flex-col gap-3 pb-3"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {/* Match badge */}
        <motion.div
          className="flex flex-col items-center gap-2 py-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <AvatarBubble src={theirAvatar} size={56} />
          <div className="text-center">
            <p className="font-display text-base" style={{ color: '#4EFFC4', textShadow: '0 0 10px rgba(78,255,196,0.5)' }}>
              YOU MATCHED!
            </p>
            <p className="font-body text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Say hello to {theirName}
            </p>
          </div>
        </motion.div>

        {/* Loading dots */}
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

        {/* No matchId – navigated here directly without context */}
        {!matchId && !loading && (
          <div className="flex flex-col items-center gap-3 py-8 text-center px-4">
            <p className="font-display text-base" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Open a chat from your matches list.
            </p>
            <motion.button
              onClick={() => navigate('/matches')}
              className="px-6 py-2 rounded-xl font-display font-bold text-sm"
              style={{ background: 'rgba(78,255,196,0.15)', border: '1.5px solid rgba(78,255,196,0.35)', color: '#4EFFC4' }}
              whileTap={{ scale: 0.95 }}
            >
              Go to Matches
            </motion.button>
          </div>
        )}

        {/* Message list */}
        {!loading && messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} myUserId={myUserId} theirAvatar={theirAvatar} />
        ))}

        {/* Empty state */}
        {!loading && matchId && messages.length === 0 && (
          <motion.div
            className="text-center py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
              No messages yet. Say hi! 👋
            </p>
          </motion.div>
        )}

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && <TypingIndicator key="typing" theirAvatar={theirAvatar} />}
        </AnimatePresence>
      </div>

      {/* Input */}
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
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={matchId ? `Message ${theirName}...` : 'Select a match to chat'}
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
