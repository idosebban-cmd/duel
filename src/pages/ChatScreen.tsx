import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatState {
  name: string;
  avatar?: string;
  character?: string;
}

interface Message {
  id: number;
  from: 'them' | 'me';
  text: string;
  time: string;
}

// ─── Character image map ───────────────────────────────────────────────────────

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

// ─── Mock conversation ────────────────────────────────────────────────────────

function buildConversation(_theirName: string): Message[] {
  return [
    { id: 1,  from: 'them', text: `Hey! That was such a fun game 😄`,                          time: '14:02' },
    { id: 2,  from: 'me',   text: `Right?? I can't believe I got that last one`,                time: '14:03' },
    { id: 3,  from: 'them', text: `Haha you were on fire 🔥 I had no idea who your character was`, time: '14:03' },
    { id: 4,  from: 'me',   text: `Lucky guess honestly. I was convinced it was the Dragon`,    time: '14:04' },
    { id: 5,  from: 'them', text: `Okay that's fair, I do give off Dragon energy apparently 😂`, time: '14:04' },
    { id: 6,  from: 'me',   text: `Very much so. Want to go again? Or maybe something different?`, time: '14:06' },
    { id: 7,  from: 'them', text: `Definitely down for another round... or we could grab coffee sometime? ☕`, time: '14:07' },
    { id: 8,  from: 'me',   text: `I'd love that actually`,                                     time: '14:08' },
    { id: 9,  from: 'them', text: `How about Saturday? There's a great place in Shoreditch`,    time: '14:09' },
    { id: 10, from: 'me',   text: `Saturday works! 2pm?`,                                       time: '14:09' },
    { id: 11, from: 'them', text: `Perfect. It's a date 🎮☕`,                                   time: '14:10' },
  ] as Message[];
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

function MessageBubble({ msg, theirAvatar }: { msg: Message; theirAvatar?: string }) {
  const isMe = msg.from === 'me';

  return (
    <motion.div
      className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {/* Their avatar */}
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
          {msg.text}
        </div>
        <span className="font-body text-xs px-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {msg.time}
        </span>
      </div>

      {/* My spacer */}
      {isMe && <div style={{ width: 30 }} />}
    </motion.div>
  );
}

// ─── Chat screen ───────────────────────────────────────────────────────────────

export function ChatScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const state = (location.state ?? {}) as Partial<ChatState>;
  const theirName = state.name ?? 'Match';
  const theirAvatar = state.avatar ?? (state.character ? characterImages[state.character] : undefined);

  const messages = buildConversation(theirName);

  // Scroll to bottom on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

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
        {/* Back */}
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

        {/* Their avatar */}
        <div className="relative flex-shrink-0">
          <AvatarBubble src={theirAvatar} size={40} />
          {/* Online dot */}
          <div
            className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
            style={{ background: '#4EFFC4', borderColor: '#12122A' }}
          />
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <h1
            className="font-display text-xl leading-none truncate"
            style={{ color: '#FFE66D', textShadow: '0 0 10px rgba(255,230,109,0.45)' }}
          >
            {theirName}
          </h1>
          <p className="font-body text-xs mt-0.5" style={{ color: 'rgba(78,255,196,0.7)' }}>
            Active now
          </p>
        </div>

        {/* Game button */}
        <motion.button
          onClick={() => navigate('/play')}
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

      {/* Date divider */}
      <div className="flex items-center gap-3 px-6 py-3 flex-none">
        <div className="flex-1" style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
        <span className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Today</span>
        <div className="flex-1" style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 flex flex-col gap-3 pb-3"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {/* Matched badge at top */}
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

        {/* Message bubbles with staggered entrance */}
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.06, type: 'spring', stiffness: 400, damping: 32 }}
          >
            <MessageBubble msg={msg} theirAvatar={theirAvatar} />
          </motion.div>
        ))}
      </div>

      {/* Input area */}
      <div
        className="flex-none px-4 py-3"
        style={{
          background: 'rgba(14,14,34,0.97)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex-1 flex items-center px-4 py-2.5 rounded-2xl font-body text-sm"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1.5px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.25)',
            }}
          >
            Message {theirName}...
          </div>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(78,255,196,0.08)', border: '1.5px solid rgba(78,255,196,0.2)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 8L2 2L5 8L2 14L14 8Z" fill="rgba(78,255,196,0.3)" />
            </svg>
          </div>
        </div>
        <p className="text-center font-body text-xs mt-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Chat functionality coming soon
        </p>
      </div>
    </div>
  );
}
