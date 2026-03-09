import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '../store/onboardingStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type MatchState =
  | 'new_match'       // matched, no game played
  | 'game_active'     // game in progress, their turn
  | 'my_turn'         // game in progress, my turn
  | 'chat_unread'     // new message waiting
  | 'chat_read'       // chat, last message read
  | 'game_done'       // game finished recently
  | 'old';            // old match

interface Match {
  id: string;
  name: string;
  age: number;
  character: string;
  element: string;
  affiliation: string;
  state: MatchState;
  lastMessage?: string;
  lastMessageFrom?: 'me' | 'them';
  game?: string;
  time: string;
  unread: boolean;
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

// ─── Mock matches ─────────────────────────────────────────────────────────────

const MOCK_MATCHES: Match[] = [
  {
    id: 'm1',
    name: 'Zara',
    age: 26,
    character: 'phoenix',
    element: 'fire',
    affiliation: 'art',
    state: 'chat_unread',
    lastMessage: 'That was so fun!! Rematch? 🔥',
    lastMessageFrom: 'them',
    game: 'Dot Dash',
    time: '3m ago',
    unread: true,
  },
  {
    id: 'm2',
    name: 'Jordan',
    age: 29,
    character: 'robot',
    element: 'electric',
    affiliation: 'tech',
    state: 'my_turn',
    game: 'Dot Dash',
    lastMessage: 'Your turn to play Dot Dash',
    time: '18m ago',
    unread: true,
  },
  {
    id: 'm3',
    name: 'Mia',
    age: 24,
    character: 'unicorn',
    element: 'water',
    affiliation: 'academia',
    state: 'new_match',
    time: '1h ago',
    unread: false,
  },
  {
    id: 'm4',
    name: 'Eli',
    age: 31,
    character: 'wolf',
    element: 'electric',
    affiliation: 'music',
    state: 'chat_read',
    lastMessage: 'haha okay okay you win this round 😅',
    lastMessageFrom: 'me',
    game: 'Guess Who',
    time: '2h ago',
    unread: false,
  },
  {
    id: 'm5',
    name: 'Priya',
    age: 27,
    character: 'owl',
    element: 'air',
    affiliation: 'academia',
    state: 'game_active',
    game: 'Guess Who',
    lastMessage: "Waiting for them to play...",
    time: '4h ago',
    unread: false,
  },
  {
    id: 'm6',
    name: 'Sam',
    age: 30,
    character: 'fox',
    element: 'fire',
    affiliation: 'city',
    state: 'game_done',
    game: 'Dot Dash',
    lastMessage: 'Played Dot Dash • You won! 🏆',
    time: 'Yesterday',
    unread: false,
  },
  {
    id: 'm7',
    name: 'Nadia',
    age: 25,
    character: 'mermaid',
    element: 'water',
    affiliation: 'nature',
    state: 'chat_unread',
    lastMessage: 'omg are you into hiking too?? 🌿',
    lastMessageFrom: 'them',
    time: 'Yesterday',
    unread: true,
  },
  {
    id: 'm8',
    name: 'Kai',
    age: 28,
    character: 'ninja',
    element: 'electric',
    affiliation: 'fitness',
    state: 'new_match',
    time: '2 days ago',
    unread: false,
  },
  {
    id: 'm9',
    name: 'Lily',
    age: 23,
    character: 'pixie',
    element: 'air',
    affiliation: 'art',
    state: 'old',
    game: 'Guess Who',
    lastMessage: 'Played Guess Who • 3 days ago',
    time: '3 days ago',
    unread: false,
  },
  {
    id: 'm10',
    name: 'Marcus',
    age: 32,
    character: 'bear',
    element: 'earth',
    affiliation: 'country',
    state: 'old',
    game: 'Dot Dash',
    lastMessage: 'Played Dot Dash • 5 days ago',
    time: '5 days ago',
    unread: false,
  },
];

// ─── Avatar stack ─────────────────────────────────────────────────────────────

function AvatarStack({ character, element, size = 60 }: {
  character: string; element: string; affiliation?: string; size?: number;
}) {
  const half = size / 2;
  const quarter = size / 4;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* Main circle */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center"
        style={{ background: 'rgba(78,255,196,0.08)', border: '2px solid rgba(78,255,196,0.25)' }}
      >
        <img src={characterImages[character]} alt={character} className="object-contain" style={{ width: '78%', height: '78%' }} draggable={false} />
      </div>
      {/* Element badge */}
      <div
        className="absolute rounded-full overflow-hidden flex items-center justify-center"
        style={{
          width: half * 0.9, height: half * 0.9,
          bottom: -quarter * 0.2, right: -quarter * 0.2,
          background: '#0A1628',
          border: '2px solid rgba(255,255,255,0.12)',
        }}
      >
        <img src={elementImages[element]} alt={element} className="object-contain w-full h-full p-0.5" draggable={false} />
      </div>
    </div>
  );
}

// ─── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({ match }: { match: Match }) {
  if (match.state === 'new_match') {
    return (
      <span className="font-body text-xs font-bold" style={{ color: '#4EFFC4' }}>
        ✨ New match! Pick a game to play
      </span>
    );
  }
  if (match.state === 'my_turn') {
    return (
      <span className="font-body text-xs font-bold" style={{ color: '#FFE66D' }}>
        🎮 {match.lastMessage}
      </span>
    );
  }
  if (match.state === 'game_active') {
    return (
      <span className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
        ⏳ {match.lastMessage}
      </span>
    );
  }
  if (match.state === 'chat_unread') {
    return (
      <span className="font-body text-xs font-bold truncate max-w-[190px] block" style={{ color: 'rgba(255,255,255,0.9)' }}>
        {match.lastMessage}
      </span>
    );
  }
  if (match.state === 'chat_read') {
    const prefix = match.lastMessageFrom === 'me' ? 'You: ' : `${match.name}: `;
    return (
      <span className="font-body text-xs truncate max-w-[190px] block" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {prefix}{match.lastMessage}
      </span>
    );
  }
  if (match.state === 'game_done') {
    return (
      <span className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
        🏁 {match.lastMessage}
      </span>
    );
  }
  // old
  return (
    <span className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
      {match.lastMessage}
    </span>
  );
}

// ─── Match card ───────────────────────────────────────────────────────────────

function MatchCard({ match, onTap }: { match: Match; onTap: () => void }) {
  const isNew = match.state === 'new_match';
  const isHighPriority = match.unread || match.state === 'my_turn';

  return (
    <motion.button
      onClick={onTap}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left relative overflow-hidden"
      style={{
        background: isHighPriority
          ? 'rgba(78,255,196,0.04)'
          : 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
      whileTap={{ scale: 0.98, backgroundColor: 'rgba(78,255,196,0.08)' }}
      transition={{ duration: 0.12 }}
    >
      {/* Gradient left edge for new/unread */}
      {isHighPriority && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ background: match.state === 'my_turn' ? '#FFE66D' : '#4EFFC4' }}
        />
      )}

      {/* Avatar */}
      <div className="relative">
        <AvatarStack character={match.character} element={match.element} affiliation={match.affiliation} size={58} />
        {/* New match pulse ring */}
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
            {match.name},
          </span>
          <span className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {match.age}
          </span>
        </div>
        {/* Avatar badge */}
        <div className="flex items-center gap-1 mb-1">
          <img src={affiliationImages[match.affiliation]} alt="" className="w-3.5 h-3.5 object-contain" draggable={false} />
          <span className="font-body text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {match.element.charAt(0).toUpperCase() + match.element.slice(1)} {match.affiliation.charAt(0).toUpperCase() + match.affiliation.slice(1)} {match.character.charAt(0).toUpperCase() + match.character.slice(1)}
          </span>
        </div>
        <StatusChip match={match} />
      </div>

      {/* Right side: time + unread dot */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
        <span className="font-body text-xs" style={{ color: match.unread ? '#4EFFC4' : 'rgba(255,255,255,0.25)' }}>
          {match.time}
        </span>
        {match.unread && (
          <motion.div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: '#FF6BA8', boxShadow: '0 0 8px rgba(255,107,168,0.7)' }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
        {match.state === 'my_turn' && !match.unread && (
          <motion.div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: '#FFE66D', boxShadow: '0 0 8px rgba(255,230,109,0.7)' }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
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

function BottomNav({ active }: { active: 'matches' | 'discover' | 'profile' }) {
  const navigate = useNavigate();
  const activeColor = '#4EFFC4';
  const inactiveColor = 'rgba(255,255,255,0.35)';

  return (
    <nav
      className="flex-none flex items-stretch border-t"
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(10,22,40,0.97)' }}
    >
      {/* Matches */}
      <button
        className="flex-1 flex flex-col items-center justify-center gap-1 py-3 relative"
        onClick={() => navigate('/matches')}
        style={{ color: active === 'matches' ? activeColor : inactiveColor }}
      >
        {active === 'matches' && (
          <motion.div
            layoutId="nav-indicator"
            className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-b-full"
            style={{ background: activeColor, boxShadow: `0 0 8px ${activeColor}` }}
          />
        )}
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 19.25C11 19.25 2.75 14.667 2.75 9.167C2.75 6.728 4.728 4.75 7.167 4.75C8.574 4.75 9.828 5.4 10.657 6.427L11 6.844L11.343 6.427C12.172 5.4 13.426 4.75 14.833 4.75C17.272 4.75 19.25 6.728 19.25 9.167C19.25 14.667 11 19.25 11 19.25Z" fill="currentColor"/>
        </svg>
        <span className={`font-body text-xs ${active === 'matches' ? 'font-bold' : ''}`}>Matches</span>
      </button>

      {/* Discover */}
      <button
        className="flex-1 flex flex-col items-center justify-center gap-1 py-3 relative"
        onClick={() => navigate('/discover')}
        style={{ color: active === 'discover' ? activeColor : inactiveColor }}
      >
        {active === 'discover' && (
          <motion.div
            layoutId="nav-indicator"
            className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-b-full"
            style={{ background: activeColor, boxShadow: `0 0 8px ${activeColor}` }}
          />
        )}
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="8.25" stroke="currentColor" strokeWidth="1.75"/>
          <path d="M14.85 7.15L12.35 12.35L7.15 14.85L9.65 9.65L14.85 7.15Z" fill="currentColor"/>
        </svg>
        <span className={`font-body text-xs ${active === 'discover' ? 'font-bold' : ''}`}>Discover</span>
      </button>

      {/* Profile */}
      <button
        className="flex-1 flex flex-col items-center justify-center gap-1 py-3 relative"
        onClick={() => navigate('/profile')}
        style={{ color: active === 'profile' ? activeColor : inactiveColor }}
      >
        {active === 'profile' && (
          <motion.div
            layoutId="nav-indicator"
            className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-b-full"
            style={{ background: activeColor, boxShadow: `0 0 8px ${activeColor}` }}
          />
        )}
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="7.5" r="3.5" stroke="currentColor" strokeWidth="1.75"/>
          <path d="M3.5 18.5C3.5 15.462 6.91 13 11 13C15.09 13 18.5 15.462 18.5 18.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        </svg>
        <span className={`font-body text-xs ${active === 'profile' ? 'font-bold' : ''}`}>Profile</span>
      </button>
    </nav>
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
        {/* Pixel broken heart */}
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

export function MatchesScreen() {
  const navigate = useNavigate();
  const { character } = useOnboardingStore();
  const [matches] = useState<Match[]>(MOCK_MATCHES);

  const unreadCount = matches.filter((m) => m.unread || m.state === 'my_turn').length;

  // Partition into sections
  const activeMatches = matches.filter((m) =>
    m.state === 'new_match' || m.state === 'chat_unread' || m.state === 'my_turn' || m.state === 'game_active'
  );
  const recentMatches = matches.filter((m) =>
    m.state === 'chat_read' || m.state === 'game_done'
  );
  const oldMatches = matches.filter((m) => m.state === 'old');

  const handleTap = (match: Match) => {
    if (match.state === 'new_match') {
      navigate('/play');
    } else if (match.state === 'game_active' || match.state === 'my_turn') {
      navigate('/play');
    } else {
      navigate('/chat');
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
        {/* Logo */}
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

        {/* Title */}
        <div className="flex-1 flex flex-col items-center">
          <h1 className="font-display text-lg leading-tight" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Your Matches
          </h1>
          {unreadCount > 0 && (
            <span className="font-body text-[11px]" style={{ color: '#4EFFC4' }}>
              {unreadCount} waiting for you
            </span>
          )}
        </div>

        {/* Right: filter icon + avatar */}
        <div className="flex items-center gap-2.5">
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M4 8h8M6 12h4" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <div
            className="w-8 h-8 rounded-full overflow-hidden border-2 flex-shrink-0"
            style={{ borderColor: '#4EFFC4', background: '#0E0E22', boxShadow: '0 0 8px rgba(78,255,196,0.3)' }}
          >
            {character
              ? <img src={characterImages[character]} alt="" className="w-full h-full object-contain p-0.5" draggable={false} />
              : <div className="w-full h-full" style={{ background: 'rgba(78,255,196,0.2)' }} />
            }
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {matches.length === 0 ? (
          <EmptyState />
        ) : (
          <AnimatePresence>
            {/* Active section */}
            {activeMatches.length > 0 && (
              <motion.div
                key="active"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <SectionLabel label="Active" />
                {activeMatches.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.25 }}
                  >
                    <MatchCard match={m} onTap={() => handleTap(m)} />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Recent section */}
            {recentMatches.length > 0 && (
              <motion.div
                key="recent"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              >
                <SectionLabel label="Recent" />
                {recentMatches.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: activeMatches.length * 0.06 + i * 0.06, duration: 0.25 }}
                  >
                    <MatchCard match={m} onTap={() => handleTap(m)} />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Older section */}
            {oldMatches.length > 0 && (
              <motion.div
                key="old"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
              >
                <SectionLabel label="Older" />
                {oldMatches.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (activeMatches.length + recentMatches.length) * 0.06 + i * 0.06, duration: 0.25 }}
                  >
                    <MatchCard match={m} onTap={() => handleTap(m)} />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Bottom padding */}
            <div className="h-4" />
          </AnimatePresence>
        )}
      </div>

      {/* Bottom nav */}
      <BottomNav active="matches" />
    </div>
  );
}
