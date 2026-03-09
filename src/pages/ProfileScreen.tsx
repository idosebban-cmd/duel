import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '../store/onboardingStore';

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

const gameTypeIcons: Record<string, string> = {
  trivia: '/game-icons/Trivia%20%26%20quizzes.png',
  strategy: '/game-icons/Strategy.png',
  party: '/game-icons/Party%20games.png',
  word: '/game-icons/Word%20games.png',
  drawing: '/game-icons/Drawing%20%26%20Creative.png',
  active: '/game-icons/Active%20games.png',
  board: '/game-icons/Boardgames.png',
  card: '/game-icons/Card%20games.png',
  coop: '/game-icons/Coop%20games.png',
  competitive: '/game-icons/Competative%20games.png',
  roleplay: '/game-icons/Role%20play.png',
  mobile: '/game-icons/Mobile%20games.png',
  video: '/game-icons/Video%20games.png',
  puzzles: '/game-icons/Puzzles.png',
};

const gameTypeLabels: Record<string, string> = {
  trivia: 'Trivia', strategy: 'Strategy', party: 'Party', word: 'Word',
  drawing: 'Drawing', active: 'Active', board: 'Board', card: 'Card',
  coop: 'Co-op', competitive: 'Competitive', roleplay: 'Role Play',
  mobile: 'Mobile', video: 'Video', puzzles: 'Puzzles',
};

const lifestyleIcons: Record<string, string> = {
  kids: '/Lifestyle/Baby.png',
  drinking: '/Lifestyle/Cocktail.png',
  smoking: '/Lifestyle/Smoking.png',
  cannabis: '/Lifestyle/Cannabis.png',
  pets: '/Lifestyle/Pets.png',
  exercise: '/Lifestyle/Exercise.png',
};

const lifestyleLabels: Record<string, string> = {
  kids: 'Kids', drinking: 'Drinking', smoking: 'Smoking',
  cannabis: 'Cannabis', pets: 'Pets', exercise: 'Exercise',
};

const goalLabels: Record<string, string> = {
  'short-term': 'Short-term fun',
  'long-term': 'Long-term relationship',
  'not-sure': 'Not sure yet',
  'open': 'Open to see what happens',
};

const goalColors: Record<string, string> = {
  'short-term': '#FF9F1C',
  'long-term': '#4EFFC4',
  'not-sure': '#B565FF',
  'open': '#FFE66D',
};

// ─── Mock defaults (shown when store fields are blank) ────────────────────────

const MOCK = {
  name: 'Alex',
  age: 29,
  location: 'Hackney, London',
  bio: "DJ & producer. My love language is sending playlists and losing to you at Scrabble. Probably crying at a film I've seen six times.",
  character: 'fox',
  element: 'fire',
  affiliation: 'music',
  gameTypes: ['trivia', 'party', 'word', 'strategy', 'drawing'],
  favoriteGames: ['Guess Who', 'Dot Dash'],
  lookingFor: ['open'],
  kids: 'Want kids someday',
  drinking: 'Socially',
  smoking: 'No',
  cannabis: 'Occasionally',
  pets: 'Have a cat',
  exercise: 'Few times a week',
};

// ─── Shared section card ──────────────────────────────────────────────────────

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl px-4 py-4 ${className}`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1.5px solid rgba(255,255,255,0.08)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {children}
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ label, onEdit }: { label: string; onEdit?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="font-display text-base" style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>
        {label}
      </span>
      {onEdit && (
        <button
          onClick={onEdit}
          className="font-body text-xs px-2.5 py-1 rounded-lg"
          style={{
            color: '#4EFFC4',
            background: 'rgba(78,255,196,0.08)',
            border: '1px solid rgba(78,255,196,0.2)',
          }}
        >
          Edit
        </button>
      )}
    </div>
  );
}

// ─── Toast notification ───────────────────────────────────────────────────────

function Toast({ visible, message }: { visible: boolean; message: string }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed top-20 left-1/2 z-50 px-5 py-3 rounded-xl font-body text-sm font-bold"
          style={{
            background: 'rgba(14,22,48,0.95)',
            border: '1.5px solid rgba(78,255,196,0.35)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            color: '#4EFFC4',
            x: '-50%',
          }}
          initial={{ opacity: 0, y: -8, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -8, x: '-50%' }}
          transition={{ duration: 0.22 }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Delete modal ─────────────────────────────────────────────────────────────

function DeleteModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-48px)] max-w-xs rounded-2xl px-6 py-6 flex flex-col gap-4"
            style={{
              background: '#0E1830',
              border: '2px solid rgba(255,107,168,0.3)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
              x: '-50%',
              y: '-50%',
            }}
            initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
          >
            <div className="text-center">
              <p className="font-display text-xl mb-2" style={{ color: '#FF6BA8' }}>Delete Account?</p>
              <p className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                This would permanently delete your profile, matches, and game history. This can't be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl font-body text-sm font-bold"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}
              >
                Cancel
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl font-body text-sm font-bold"
                style={{ background: 'rgba(255,107,168,0.15)', color: '#FF6BA8', border: '1.5px solid rgba(255,107,168,0.3)' }}
              >
                Delete
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Bottom nav (shared pattern) ──────────────────────────────────────────────

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
        className="flex-1 flex flex-col items-center justify-center gap-1 py-3"
        onClick={() => navigate('/matches')}
        style={{ color: inactiveColor }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 19.25C11 19.25 2.75 14.667 2.75 9.167C2.75 6.728 4.728 4.75 7.167 4.75C8.574 4.75 9.828 5.4 10.657 6.427L11 6.844L11.343 6.427C12.172 5.4 13.426 4.75 14.833 4.75C17.272 4.75 19.25 6.728 19.25 9.167C19.25 14.667 11 19.25 11 19.25Z" fill="currentColor"/>
        </svg>
        <span className="font-body text-xs">Matches</span>
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
        className="flex-1 flex flex-col items-center justify-center gap-1 py-3 relative"
        onClick={() => navigate('/profile')}
        style={{ color: activeColor }}
      >
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-b-full"
          style={{ background: activeColor, boxShadow: `0 0 8px ${activeColor}` }}
        />
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="7.5" r="3.5" stroke="currentColor" strokeWidth="1.75"/>
          <path d="M3.5 18.5C3.5 15.462 6.91 13 11 13C15.09 13 18.5 15.462 18.5 18.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        </svg>
        <span className="font-body text-xs font-bold">Profile</span>
      </button>
    </nav>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function ProfileScreen() {
  const navigate = useNavigate();
  const store = useOnboardingStore();

  // Merge store data with mock defaults
  const name        = store.name        || MOCK.name;
  const age         = store.age         ?? MOCK.age;
  const location    = store.location    || MOCK.location;
  const character   = store.character   || MOCK.character;
  const element     = store.element     || MOCK.element;
  const affiliation = store.affiliation || MOCK.affiliation;
  const gameTypes   = store.gameTypes.length   ? store.gameTypes   : MOCK.gameTypes;
  const favoriteGames = store.favoriteGames.length ? store.favoriteGames : MOCK.favoriteGames;
  const lookingFor  = store.lookingFor.length  ? store.lookingFor  : MOCK.lookingFor;
  const kids        = store.kids        || MOCK.kids;
  const drinking    = store.drinking    || MOCK.drinking;
  const smoking     = store.smoking     || MOCK.smoking;
  const cannabis    = store.cannabis    || MOCK.cannabis;
  const pets        = store.pets        || MOCK.pets;
  const exercise    = store.exercise    || MOCK.exercise;

  const lifestyle = { kids, drinking, smoking, cannabis, pets, exercise };

  // Toast state
  const [toast, setToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const showToast = (msg = 'Profile editing coming soon') => {
    setToastMsg(msg);
    setToast(true);
    setTimeout(() => setToast(false), 2200);
  };

  // Mock photos (placeholder gradients since we don't have real photos)
  const photoSlots = [
    { gradient: 'linear-gradient(135deg, #FF6BA8 0%, #B565FF 100%)', label: '♪' },
    { gradient: 'linear-gradient(135deg, #4EFFC4 0%, #00D9FF 100%)', label: '✦' },
    { gradient: 'linear-gradient(135deg, #FFE66D 0%, #FF9F1C 100%)', label: '★' },
  ];

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#0A1628' }}>
      {/* Scanlines */}
      <div
        className="fixed inset-0 pointer-events-none z-10 opacity-[0.02]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,1) 3px, rgba(255,255,255,1) 4px)' }}
      />

      {/* Toast */}
      <Toast visible={toast} message={toastMsg} />

      {/* Delete modal */}
      <DeleteModal visible={deleteOpen} onClose={() => setDeleteOpen(false)} />

      {/* Header */}
      <header
        className="flex-none flex items-center justify-between px-4 pt-5 pb-3"
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

        <h1 className="font-display text-lg" style={{ color: 'rgba(255,255,255,0.85)' }}>
          Your Profile
        </h1>

        {/* Settings gear */}
        <button
          className="w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          onClick={() => showToast('Settings coming soon')}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="2.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
            <path d="M9 1.5v1.8M9 14.7v1.8M1.5 9h1.8M14.7 9h1.8M3.58 3.58l1.27 1.27M13.15 13.15l1.27 1.27M14.42 3.58l-1.27 1.27M4.85 13.15l-1.27 1.27" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>

        {/* ── Avatar hero ─────────────────────────────────────────────── */}
        <motion.div
          className="flex flex-col items-center gap-3 pt-2 pb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Avatar ring */}
          <div className="relative">
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(78,255,196,0.08)',
                border: '3px solid rgba(78,255,196,0.4)',
                boxShadow: '0 0 30px rgba(78,255,196,0.2), inset 0 0 20px rgba(78,255,196,0.05)',
              }}
            >
              <img
                src={characterImages[character]}
                alt={character}
                className="w-20 h-20 object-contain"
                draggable={false}
              />
            </div>

            {/* Element badge */}
            <div
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: '#0A1628', border: '2px solid rgba(255,255,255,0.15)' }}
            >
              <img src={elementImages[element]} alt={element} className="w-6 h-6 object-contain" draggable={false} />
            </div>

            {/* Edit avatar button */}
            <button
              onClick={() => showToast('Profile editing coming soon')}
              className="absolute -bottom-1 left-0 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(78,255,196,0.15)', border: '2px solid rgba(78,255,196,0.35)' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9.5 2L12 4.5L4.5 12H2V9.5L9.5 2Z" stroke="#4EFFC4" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Name + age */}
          <div className="text-center">
            <p className="font-display text-2xl" style={{ color: 'rgba(255,255,255,0.95)' }}>
              {name}, {age}
            </p>
            <p className="font-body text-sm mt-0.5 flex items-center justify-center gap-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1C4.067 1 2.5 2.567 2.5 4.5C2.5 7.5 6 11 6 11C6 11 9.5 7.5 9.5 4.5C9.5 2.567 7.933 1 6 1Z" stroke="currentColor" strokeWidth="1.3"/>
                <circle cx="6" cy="4.5" r="1.2" fill="currentColor"/>
              </svg>
              {location}
            </p>
            {/* Avatar tag */}
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <img src={affiliationImages[affiliation]} alt="" className="w-4 h-4 object-contain" draggable={false} />
              <span className="font-body text-xs" style={{ color: 'rgba(78,255,196,0.7)' }}>
                {cap(element)} {cap(affiliation)} {cap(character)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Photo carousel ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <SectionCard>
            <SectionHeading label="Photos" onEdit={() => showToast('Profile editing coming soon')} />
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {photoSlots.map((slot, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-24 h-28 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: slot.gradient, opacity: 0.75 }}
                >
                  {slot.label}
                </div>
              ))}
              {/* Add photo slot */}
              <button
                onClick={() => showToast('Profile editing coming soon')}
                className="flex-shrink-0 w-24 h-28 rounded-xl flex flex-col items-center justify-center gap-1"
                style={{ border: '2px dashed rgba(255,255,255,0.15)', background: 'transparent' }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 4v12M4 10h12" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Add</span>
              </button>
            </div>
          </SectionCard>
        </motion.div>

        {/* ── Bio ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <SectionCard>
            <SectionHeading label="About" onEdit={() => showToast('Profile editing coming soon')} />
            <p className="font-body text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {MOCK.bio}
            </p>
          </SectionCard>
        </motion.div>

        {/* ── Avatar ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
        >
          <SectionCard>
            <SectionHeading label="Avatar" onEdit={() => showToast('Profile editing coming soon')} />
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Character', img: characterImages[character], name: cap(character) },
                { label: 'Element',   img: elementImages[element],     name: cap(element) },
                { label: 'World',     img: affiliationImages[affiliation], name: cap(affiliation) },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <img src={item.img} alt={item.name} className="w-10 h-10 object-contain" draggable={false} />
                  <div className="text-center">
                    <p className="font-body text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{item.label}</p>
                    <p className="font-body text-xs font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>{item.name}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => showToast('Profile editing coming soon')}
              className="w-full mt-3 py-2.5 rounded-xl font-body text-sm font-bold"
              style={{
                background: 'rgba(78,255,196,0.07)',
                border: '1.5px solid rgba(78,255,196,0.2)',
                color: '#4EFFC4',
              }}
            >
              Change Avatar
            </button>
          </SectionCard>
        </motion.div>

        {/* ── Game preferences ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SectionCard>
            <SectionHeading label="Loves to Play" onEdit={() => showToast('Profile editing coming soon')} />
            {/* Game type chips */}
            <div className="flex flex-wrap gap-2 mb-3">
              {gameTypes.map((g) => (
                <div
                  key={g}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {gameTypeIcons[g] && (
                    <img src={gameTypeIcons[g]} alt="" className="w-4 h-4 object-contain" draggable={false} />
                  )}
                  <span className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {gameTypeLabels[g] || g}
                  </span>
                </div>
              ))}
            </div>
            {/* Favourite games */}
            {favoriteGames.length > 0 && (
              <>
                <p className="font-body text-xs font-bold mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  FAVOURITE GAMES
                </p>
                <div className="flex flex-col gap-1.5">
                  {favoriteGames.map((g) => (
                    <div
                      key={g}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <span className="text-sm">🎮</span>
                      <span className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{g}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </SectionCard>
        </motion.div>

        {/* ── Relationship goal ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
        >
          <SectionCard>
            <SectionHeading label="Looking For" onEdit={() => showToast('Profile editing coming soon')} />
            <div className="flex flex-wrap gap-2">
              {lookingFor.map((id) => {
                const color = goalColors[id] || '#4EFFC4';
                return (
                  <div
                    key={id}
                    className="px-3 py-2 rounded-lg font-body text-sm font-bold"
                    style={{
                      color,
                      background: `${color}18`,
                      border: `1.5px solid ${color}40`,
                    }}
                  >
                    {goalLabels[id] || id}
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </motion.div>

        {/* ── Lifestyle ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
        >
          <SectionCard>
            <SectionHeading label="Lifestyle" onEdit={() => showToast('Profile editing coming soon')} />
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(lifestyle) as [keyof typeof lifestyle, string][]).map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <img src={lifestyleIcons[key]} alt={key} className="w-5 h-5 object-contain flex-shrink-0" draggable={false} />
                  <div className="min-w-0">
                    <p className="font-body text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
                      {lifestyleLabels[key]}
                    </p>
                    <p className="font-body text-xs font-bold truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      {val}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </motion.div>

        {/* ── Account ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
        >
          <SectionCard>
            <SectionHeading label="Account" />
            <div className="flex flex-col gap-2">
              {/* Coming soon items */}
              {[
                { label: 'Privacy Settings', icon: '🔒' },
                { label: 'Notifications',    icon: '🔔' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between px-3 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base" style={{ opacity: 0.4 }}>{item.icon}</span>
                    <span className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>{item.label}</span>
                  </div>
                  <span
                    className="font-body text-[10px] font-bold px-2 py-0.5 rounded-md"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' }}
                  >
                    SOON
                  </span>
                </div>
              ))}

              {/* Logout */}
              <motion.button
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-body text-sm font-bold mt-1"
                style={{
                  background: 'rgba(78,255,196,0.07)',
                  border: '1.5px solid rgba(78,255,196,0.2)',
                  color: '#4EFFC4',
                }}
                whileTap={{ scale: 0.97 }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 14H3C2.448 14 2 13.552 2 13V3C2 2.448 2.448 2 3 2H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M10.5 11L14 8L10.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Log Out
              </motion.button>

              {/* Delete */}
              <motion.button
                onClick={() => setDeleteOpen(true)}
                className="w-full py-3 rounded-xl font-body text-sm font-bold"
                style={{
                  background: 'rgba(255,107,168,0.06)',
                  border: '1.5px solid rgba(255,107,168,0.18)',
                  color: '#FF6BA8',
                }}
                whileTap={{ scale: 0.97 }}
              >
                Delete Account
              </motion.button>
            </div>
          </SectionCard>
        </motion.div>

        {/* bottom padding */}
        <div className="h-4" />
      </div>

      {/* Bottom nav */}
      <BottomNav />
    </div>
  );
}
