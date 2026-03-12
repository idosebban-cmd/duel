import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '../store/onboardingStore';
import { useAuthStore } from '../store/authStore';
import { getMatches, getLastMessages } from '../lib/database';
import type { MatchWithProfile, LastMessageInfo } from '../lib/database';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Match {
  id: string;
  name: string;
  age: number;
  character: string;
  element: string;
  affiliation: string;
  matchedAt: string;
  lastMessage?: LastMessageInfo;
}

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

const elementImages: Record<string, string> = {
  fire: '/elements/Fire.png', water: '/elements/Water.png',
  earth: '/elements/Earth.png', air: '/elements/Wind.png',
  electric: '/elements/Electricity.png',
};

const affiliationImages: Record<string, string> = {
  city: '/affiliation/City.png', country: '/affiliation/Country.png',
  nature: '/affiliation/Nature.png', fitness: '/affiliation/Sports.png',
  academia: '/affiliation/Library.png', music: '/affiliation/Music.png',
  art: '/affiliation/Art.png', tech: '/affiliation/Tech.png',
  cosmic: '/affiliation/Cosmos.png', travel: '/affiliation/Travel.png',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function rowFromMatch(m: MatchWithProfile): Match {
  return {
    id:          m.matchId,
    name:        m.partner.name        ?? 'Player',
    age:         m.partner.age         ?? 0,
    character:   m.partner.character   ?? 'ghost',
    element:     m.partner.element     ?? 'fire',
    affiliation: m.partner.affiliation ?? 'city',
    matchedAt:   m.matchedAt,
  };
}

// ─── Avatar stack ─────────────────────────────────────────────────────────────

function AvatarStack({ character, element, size = 60 }: {
  character: string; element: string; size?: number;
}) {
  const half = size / 2;
  const quarter = size / 4;
  const charSrc = characterImages[character] ?? characterImages['ghost'];
  const elemSrc = elementImages[element]     ?? elementImages['fire'];
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center"
        style={{ background: 'rgba(78,255,196,0.08)', border: '2px solid rgba(78,255,196,0.25)' }}
      >
        <img src={charSrc} alt={character} className="object-contain" style={{ width: '78%', height: '78%' }} draggable={false} />
      </div>
      <div
        className="absolute rounded-full overflow-hidden flex items-center justify-center"
        style={{
          width: half * 0.9, height: half * 0.9,
          bottom: -quarter * 0.2, right: -quarter * 0.2,
          background: '#0A1628',
          border: '2px solid rgba(255,255,255,0.12)',
        }}
      >
        <img src={elemSrc} alt={element} className="object-contain w-full h-full p-0.5" draggable={false} />
      </div>
    </div>
  );
}

// ─── Match card ───────────────────────────────────────────────────────────────

function MatchCard({ match, onTap, isNew }: { match: Match; onTap: () => void; isNew: boolean }) {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <motion.button
      onClick={onTap}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left relative overflow-hidden"
      style={{
        background: isNew ? 'rgba(78,255,196,0.04)' : 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
      whileTap={{ scale: 0.98, backgroundColor: 'rgba(78,255,196,0.08)' }}
      transition={{ duration: 0.12 }}
    >
      {/* New match left-edge accent */}
      {isNew && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: '#4EFFC4' }} />
      )}

      {/* Avatar */}
      <div className="relative">
        <AvatarStack character={match.character} element={match.element} size={58} />
        {isNew && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: '2px solid #4EFFC4' }}
            animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-display text-base" style={{ color: 'rgba(255,255,255,0.92)' }}>
            {match.name}{match.age > 0 ? `, ${match.age}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-1 mb-1">
          {affiliationImages[match.affiliation] && (
            <img src={affiliationImages[match.affiliation]} alt="" className="w-3.5 h-3.5 object-contain" draggable={false} />
          )}
          <span className="font-body text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {cap(match.element)} {cap(match.affiliation)} {cap(match.character)}
          </span>
        </div>
        {isNew && !match.lastMessage
          ? <span className="font-body text-xs font-bold" style={{ color: '#4EFFC4' }}>✨ New match! Pick a game to play</span>
          : match.lastMessage
            ? (
              <span
                className="font-body text-xs truncate max-w-[180px] block"
                style={{ color: match.lastMessage.unread > 0 ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)',
                         fontWeight: match.lastMessage.unread > 0 ? 600 : 400 }}
              >
                {match.lastMessage.content}
              </span>
            )
          : <span className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Matched {timeAgo(match.matchedAt)}</span>
        }
      </div>

      {/* Time + unread */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
        <span className="font-body text-xs" style={{ color: isNew ? '#4EFFC4' : 'rgba(255,255,255,0.25)' }}>
          {timeAgo(match.lastMessage?.createdAt ?? match.matchedAt)}
        </span>
        {match.lastMessage && match.lastMessage.unread > 0 ? (
          <motion.div
            className="min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1"
            style={{ background: '#4EFFC4', boxShadow: '0 0 8px rgba(78,255,196,0.7)' }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <span className="font-body text-[10px] font-bold" style={{ color: '#12122A' }}>
              {match.lastMessage.unread > 9 ? '9+' : match.lastMessage.unread}
            </span>
          </motion.div>
        ) : isNew && !match.lastMessage ? (
          <motion.div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: '#4EFFC4', boxShadow: '0 0 8px rgba(78,255,196,0.7)' }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        ) : null}
      </div>
    </motion.button>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-4 py-2 flex items-center gap-2">
      <span className="font-body text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

// ─── Bottom nav ───────────────────────────────────────────────────────────────

function BottomNav() {
  const navigate = useNavigate();
  const activeColor = '#4EFFC4';
  const inactiveColor = 'rgba(255,255,255,0.35)';

  return (
    <nav
      className="flex-none flex items-stretch border-t"
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(10,22,40,0.97)' }}
    >
      <button
        className="flex-1 flex flex-col items-center justify-center gap-1 py-3 relative"
        onClick={() => navigate('/matches')}
        style={{ color: activeColor }}
      >
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-b-full"
          style={{ background: activeColor, boxShadow: `0 0 8px ${activeColor}` }}
        />
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 19.25C11 19.25 2.75 14.667 2.75 9.167C2.75 6.728 4.728 4.75 7.167 4.75C8.574 4.75 9.828 5.4 10.657 6.427L11 6.844L11.343 6.427C12.172 5.4 13.426 4.75 14.833 4.75C17.272 4.75 19.25 6.728 19.25 9.167C19.25 14.667 11 19.25 11 19.25Z" fill="currentColor"/>
        </svg>
        <span className="font-body text-xs font-bold">Matches</span>
      </button>

      <button
        className="flex-1 flex flex-col items-center justify-center gap-1 py-3"
        onClick={() => navigate('/discover')}
        style={{ color: inactiveColor }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="8.25" stroke="currentColor" strokeWidth="1.75"/>
          <path d="M14.85 7.15L12.35 12.35L7.15 14.85L9.65 9.65L14.85 7.15Z" fill="currentColor"/>
        </svg>
        <span className="font-body text-xs">Discover</span>
      </button>

      <button
        className="flex-1 flex flex-col items-center justify-center gap-1 py-3"
        onClick={() => navigate('/profile')}
        style={{ color: inactiveColor }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="7.5" r="3.5" stroke="currentColor" strokeWidth="1.75"/>
          <path d="M3.5 18.5C3.5 15.462 6.91 13 11 13C15.09 13 18.5 15.462 18.5 18.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        </svg>
        <span className="font-body text-xs">Profile</span>
      </button>
    </nav>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="w-[58px] h-[58px] rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-4 w-24 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-3 w-36 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  const navigate = useNavigate();
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <path d="M36 60L10 36C10 24.5 18 16 28 16C32 16 36 18 36 18L34 28H38L40 20C42 17 44 16 44 16C54 16 62 24.5 62 36L36 60Z" fill="rgba(255,107,168,0.2)" stroke="rgba(255,107,168,0.4)" strokeWidth="2"/>
          <path d="M36 18L34 28H38L36 18Z" fill="rgba(255,255,255,0.15)"/>
        </svg>
      </motion.div>
      <div>
        <p className="font-display text-2xl mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>No matches yet</p>
        <p className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Keep swiping to find your player 2!
        </p>
      </div>
      <motion.button
        onClick={() => navigate('/discover')}
        className="px-8 py-3 rounded-xl font-display text-base"
        style={{
          background: 'linear-gradient(135deg, #4EFFC4 0%, #B565FF 100%)',
          color: '#12122A',
          boxShadow: '0 0 20px rgba(78,255,196,0.3)',
        }}
        whileTap={{ scale: 0.97 }}
      >
        Start Discovering
      </motion.button>
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

const NEW_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

export function MatchesScreen() {
  const navigate = useNavigate();
  const { character } = useOnboardingStore();
  const { user } = useAuthStore();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const rows = await getMatches(user.id);
        if (cancelled) return;
        const matchList = rows.map(rowFromMatch);
        setMatches(matchList);
        setLoading(false);

        if (matchList.length > 0) {
          const lm = await getLastMessages(matchList.map((m) => m.id), user.id);
          if (!cancelled) setMatches((prev) => prev.map((m) => ({ ...m, lastMessage: lm.get(m.id) })));
        }
      } catch {
        if (!cancelled) {
          setError('Could not load matches. Check your connection.');
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  const isNew = (m: Match) => Date.now() - new Date(m.matchedAt).getTime() < NEW_THRESHOLD_MS;

  const newMatches    = matches.filter((m) =>  isNew(m));
  const olderMatches  = matches.filter((m) => !isNew(m));

  const handleTap = (m: Match) => {
    // If they've exchanged messages, go straight to chat; otherwise pick a game
    if (m.lastMessage) {
      navigate('/chat', { state: { matchId: m.id, name: m.name, character: m.character } });
    } else {
      navigate('/play', { state: { matchId: m.id } });
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#0A1628' }}>
      {/* Scanlines */}
      <div
        className="fixed inset-0 pointer-events-none z-10 opacity-[0.02]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,1) 3px, rgba(255,255,255,1) 4px)' }}
      />

      {/* Header */}
      <header
        className="flex-none flex items-center px-4 pt-5 pb-3 gap-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(10,22,40,0.97)' }}
      >
        <div
          className="font-display text-2xl leading-none"
          style={{
            background: 'linear-gradient(135deg, #FFE66D 0%, #FF9F1C 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            filter: 'drop-shadow(0 0 12px rgba(255,230,109,0.4))',
          }}
        >
          DUEL
        </div>

        <div className="flex-1 flex flex-col items-center">
          <h1 className="font-display text-lg leading-tight" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Your Matches
          </h1>
          {newMatches.length > 0 && (
            <span className="font-body text-[11px]" style={{ color: '#4EFFC4' }}>
              {newMatches.length} new {newMatches.length === 1 ? 'match' : 'matches'}!
            </span>
          )}
        </div>

        <div
          className="w-8 h-8 rounded-full overflow-hidden border-2 flex-shrink-0"
          style={{ borderColor: '#4EFFC4', background: '#0E0E22', boxShadow: '0 0 8px rgba(78,255,196,0.3)' }}
        >
          {character
            ? <img src={characterImages[character]} alt="" className="w-full h-full object-contain p-0.5" draggable={false} />
            : <div className="w-full h-full" style={{ background: 'rgba(78,255,196,0.2)' }} />
          }
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {loading ? (
          <div>
            {[0, 1, 2].map((i) => <SkeletonRow key={i} />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-12 px-8 text-center">
            <p className="font-body text-sm" style={{ color: 'rgba(255,107,168,0.8)' }}>{error}</p>
            <motion.button
              onClick={() => { setError(null); setLoading(true); }}
              className="px-5 py-2 rounded-xl font-display text-sm"
              style={{ background: 'rgba(255,107,168,0.1)', border: '1.5px solid rgba(255,107,168,0.3)', color: '#FF6BA8' }}
              whileTap={{ scale: 0.95 }}
            >
              Retry
            </motion.button>
          </div>
        ) : matches.length === 0 ? (
          <EmptyState />
        ) : (
          <AnimatePresence>
            {newMatches.length > 0 && (
              <motion.div key="new" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <SectionLabel label="New" />
                {newMatches.map((m, i) => (
                  <motion.div key={m.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06, duration: 0.25 }}>
                    <MatchCard match={m} isNew={true} onTap={() => handleTap(m)} />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {olderMatches.length > 0 && (
              <motion.div key="older" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.3 }}>
                <SectionLabel label="Matches" />
                {olderMatches.map((m, i) => (
                  <motion.div key={m.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: newMatches.length * 0.06 + i * 0.06, duration: 0.25 }}>
                    <MatchCard match={m} isNew={false} onTap={() => handleTap(m)} />
                  </motion.div>
                ))}
              </motion.div>
            )}

            <div className="h-4" />
          </AnimatePresence>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
