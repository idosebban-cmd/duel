import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '../store/onboardingStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { getProfile, getPhotos, savePhotos, updateProfileField } from '../lib/database';
import type { UserProfile } from '../lib/database';
import type { UserPrompt } from '../store/onboardingStore';
import { checkProfileCompleteness } from '../utils/profileValidation';

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
  'casual': 'Something casual',
  'short-term': 'Short-term fun',
  'long-term': 'Long-term relationship',
  'not-sure': 'Not sure yet',
  'open': 'Open to see what happens',
};

const goalColors: Record<string, string> = {
  'casual': '#FF6BA8',
  'short-term': '#FF9F1C',
  'long-term': '#4EFFC4',
  'not-sure': '#B565FF',
  'open': '#FFE66D',
};

// ─── Option sets (matching onboarding) ───────────────────────────────────────

const LIFESTYLE_OPTIONS: Record<string, string[]> = {
  kids: ['Have kids', 'Want kids someday', "Don't want kids", 'Not sure yet', 'Open to partner with kids'],
  drinking: ['Never', 'Rarely', 'Socially', 'Regularly'],
  smoking: ['Yes', 'No', 'Socially', 'Trying to quit'],
  cannabis: ['Never', 'Occasionally', 'Regularly', 'Prefer not to say'],
  pets: ['Have a dog', 'Have a cat', 'Want pets', 'Allergic to pets', 'Not interested in pets'],
  exercise: ['Daily', 'Few times a week', 'Occasionally', 'Rarely'],
};

const GENDER_OPTIONS = [
  { id: 'woman', label: 'Woman', color: '#FF6BA8' },
  { id: 'man', label: 'Man', color: '#4EFFC4' },
  { id: 'non-binary', label: 'Non-binary', color: '#B565FF' },
];

const INTERESTED_IN_OPTIONS = [
  { id: 'men', label: 'Men', color: '#00D9FF' },
  { id: 'women', label: 'Women', color: '#FF6BA8' },
  { id: 'everyone', label: 'Everyone', color: '#B565FF' },
];

const GOAL_OPTIONS = [
  { id: 'casual', label: 'Something casual', color: '#FF6BA8' },
  { id: 'short-term', label: 'Short-term fun', color: '#FF9F1C' },
  { id: 'long-term', label: 'Long-term relationship', color: '#4EFFC4' },
  { id: 'not-sure', label: 'Not sure yet', color: '#B565FF' },
  { id: 'open', label: 'Open to see what happens', color: '#FFE66D' },
];

const ALL_GAME_TYPES = [
  'trivia', 'puzzles', 'drawing', 'word', 'board', 'video',
  'card', 'competitive', 'coop', 'party', 'strategy', 'rpg', 'active', 'mobile',
];

const PROMPT_POOL: { id: number; category: 'games' | 'fun' | 'personality' | 'playful'; icon: string; question: string }[] = [
  { id: 1, category: 'games', icon: '🎮', question: "I'm weirdly competitive about..." },
  { id: 2, category: 'games', icon: '🎮', question: "The game I'll always beat you at is..." },
  { id: 3, category: 'games', icon: '🎮', question: "My most embarrassing game rage quit moment..." },
  { id: 4, category: 'games', icon: '🎮', question: "My secret gaming talent is..." },
  { id: 5, category: 'games', icon: '🎮', question: "The last game that made me laugh was..." },
  { id: 6, category: 'games', icon: '🎮', question: "I once stayed up until 3am playing..." },
  { id: 7, category: 'games', icon: '🎮', question: "My childhood game obsession was..." },
  { id: 8, category: 'games', icon: '🎮', question: "The one game I refuse to play is..." },
  { id: 9, category: 'games', icon: '🎮', question: "My go-to move in any game is..." },
  { id: 10, category: 'games', icon: '🎮', question: "I'd describe my gaming style as..." },
  { id: 11, category: 'games', icon: '🎮', question: "The game that best represents me is..." },
  { id: 12, category: 'games', icon: '🎮', question: "If I could only play one game forever..." },
  { id: 13, category: 'games', icon: '🎮', question: "The game I'm terrible at but love anyway..." },
  { id: 14, category: 'games', icon: '🎮', question: "My board game night essential is..." },
  { id: 15, category: 'games', icon: '🎮', question: "I'd challenge you to..." },
  { id: 21, category: 'fun', icon: '🎲', question: "My most useless skill is..." },
  { id: 22, category: 'fun', icon: '🎲', question: "I'm the type of person who..." },
  { id: 23, category: 'fun', icon: '🎲', question: "My hot take that gets people riled up..." },
  { id: 24, category: 'fun', icon: '🎲', question: "Something I'll never shut up about..." },
  { id: 25, category: 'fun', icon: '🎲', question: "The hill I'll die on is..." },
  { id: 26, category: 'fun', icon: '🎲', question: "My guilty pleasure is..." },
  { id: 27, category: 'fun', icon: '🎲', question: "I'm secretly a nerd about..." },
  { id: 28, category: 'fun', icon: '🎲', question: "The last thing that made me LOL..." },
  { id: 29, category: 'fun', icon: '🎲', question: "My unpopular opinion is..." },
  { id: 30, category: 'fun', icon: '🎲', question: "I have an irrational fear of..." },
  { id: 36, category: 'personality', icon: '💭', question: "On a Sunday you'll find me..." },
  { id: 37, category: 'personality', icon: '💭', question: "My perfect day includes..." },
  { id: 38, category: 'personality', icon: '💭', question: "I geek out over..." },
  { id: 39, category: 'personality', icon: '💭', question: "Don't invite me to this because..." },
  { id: 40, category: 'personality', icon: '💭', question: "My idea of a good time is..." },
  { id: 41, category: 'personality', icon: '💭', question: "I'm looking for someone who can..." },
  { id: 42, category: 'personality', icon: '💭', question: "The way to my heart is..." },
  { id: 43, category: 'personality', icon: '💭', question: "Green flags I look for..." },
  { id: 44, category: 'personality', icon: '💭', question: "My love language is..." },
  { id: 45, category: 'personality', icon: '💭', question: "I value people who..." },
  { id: 51, category: 'playful', icon: '🔥', question: "Bet you can't beat me at..." },
  { id: 52, category: 'playful', icon: '🔥', question: "Think you can handle..." },
  { id: 53, category: 'playful', icon: '🔥', question: "I dare you to..." },
  { id: 54, category: 'playful', icon: '🔥', question: "Try and guess my..." },
  { id: 55, category: 'playful', icon: '🔥', question: "If you can make me laugh with..." },
];

const CATEGORY_COLORS: Record<string, string> = {
  games: '#00F5FF', fun: '#FFE66D', personality: '#B565FF', playful: '#FF6BA8',
};


// ─── Prompt card ──────────────────────────────────────────────────────────────

function PromptCard({ prompt }: { prompt: UserPrompt }) {
  const color = CATEGORY_COLORS[prompt.category] ?? '#4EFFC4';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4 relative overflow-hidden"
      style={{
        background: '#0A1628',
        border: `2px solid ${color}`,
        boxShadow: `0 0 14px ${color}25, 3px 3px 0 rgba(0,0,0,0.4)`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{prompt.icon}</span>
        <p className="font-body text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {prompt.question}
        </p>
      </div>
      <p className="font-display text-base leading-snug" style={{ color: '#FFFFFF' }}>
        {prompt.answer}
      </p>
    </motion.div>
  );
}

// ─── Placeholder text for empty fields ────────────────────────────────────────

const PLACEHOLDER = {
  name: 'Add your name',
  location: 'Add your location',
  bio: 'Add your bio',
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

function DeleteModal({ visible, onClose, onDelete }: { visible: boolean; onClose: () => void; onDelete: () => void }) {
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
                onClick={onDelete}
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
  const { user } = useAuthStore();

  // DB state
  const [dbProfile, setDbProfile] = useState<UserProfile | null>(null);
  const [dbPhotos, setDbPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    getProfile(user.id).then(({ data }) => { if (data) setDbProfile(data); });
    getPhotos(user.id).then(setDbPhotos);
  }, [user?.id]);

  // Profile completeness
  const completeness = dbProfile
    ? checkProfileCompleteness({
        ...dbProfile,
        avatar_url: dbPhotos.length > 0 ? dbPhotos[0] : null,
        photos: dbPhotos,
      })
    : null;

  // Photo upload handler
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB');
      return;
    }

    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const newPhotos = [...dbPhotos, base64];
        await savePhotos(user.id, newPhotos);
        const refreshed = await getPhotos(user.id);
        setDbPhotos(refreshed);
        showToast('Photo uploaded!');
      };
      reader.readAsDataURL(file);
    } catch {
      showToast('Failed to upload photo');
    } finally {
      setUploading(false);
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Merge DB → store → null (no mock fallbacks)
  const name        = dbProfile?.name        || store.name        || '';
  const age         = dbProfile?.age         ?? store.age         ?? null;
  const location    = dbProfile?.location    || store.location    || '';
  const character   = dbProfile?.character   || store.character   || null;
  const element     = dbProfile?.element     || store.element     || null;
  const affiliation = dbProfile?.affiliation || store.affiliation || null;
  const gameTypes   = (dbProfile?.game_types?.length     ? dbProfile.game_types     : null) ?? (store.gameTypes.length     ? store.gameTypes     : []);
  const favoriteGames = (dbProfile?.favorite_games?.length ? dbProfile.favorite_games : null) ?? (store.favoriteGames.length ? store.favoriteGames : []);
  const lookingFor  = (dbProfile?.looking_for?.length    ? dbProfile.looking_for    : null) ?? (store.lookingFor.length    ? store.lookingFor    : []);
  const kids        = dbProfile?.kids        || store.kids        || null;
  const drinking    = dbProfile?.drinking    || store.drinking    || null;
  const smoking     = dbProfile?.smoking     || store.smoking     || null;
  const cannabis    = dbProfile?.cannabis    || store.cannabis    || null;
  const pets        = dbProfile?.pets        || store.pets        || null;
  const exercise    = dbProfile?.exercise    || store.exercise    || null;
  const bio         = dbProfile?.bio         || store.bio         || '';
  const prompts     = store.userPrompts.length > 0 ? store.userPrompts : [];

  const intent    = (dbProfile?.intent as 'romance' | 'play' | 'both') ?? store.intent ?? 'romance';

  const lifestyle = { kids, drinking, smoking, cannabis, pets, exercise };

  // Toast state
  const [toast, setToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [showIntentModal, setShowIntentModal] = useState(false);

  // Edit modal state
  const [editModal, setEditModal] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editArray, setEditArray] = useState<string[]>([]);
  const [editFavGames, setEditFavGames] = useState<string[]>([]);
  const [newFavGame, setNewFavGame] = useState('');
  const [saving, setSaving] = useState(false);
  // Prompts editor state
  const [promptStep, setPromptStep] = useState<'list' | 'pick' | 'answer'>('list');
  const [pickedPrompt, setPickedPrompt] = useState<typeof PROMPT_POOL[number] | null>(null);
  const [promptAnswer, setPromptAnswer] = useState('');

  const showToast = (msg = 'Saved!') => {
    setToastMsg(msg);
    setToast(true);
    setTimeout(() => setToast(false), 2200);
  };

  // Save a single field to DB + update local state
  const saveField = async (field: string, value: unknown): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);
    const { error } = await updateProfileField(user.id, field, value);
    setSaving(false);
    if (error) {
      showToast('Failed to save — try again');
      return false;
    }
    setDbProfile((prev) => prev ? { ...prev, [field]: value } as UserProfile : prev);
    return true;
  };

  // Open helpers
  const openTextEdit = (modal: string, currentValue: string) => {
    setEditText(currentValue);
    setEditModal(modal);
  };
  const openArrayEdit = (modal: string, currentValue: string[]) => {
    setEditArray([...currentValue]);
    setEditModal(modal);
  };

  // Age calculation from birthday
  const calcAge = (birthday: string): number => {
    const birth = new Date(birthday);
    const today = new Date();
    let a = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
    return a;
  };

  // Photos: real DB photos, fall back to session photos
  const sessionPhotos = store.photos;
  const displayPhotos = dbPhotos.length > 0 ? dbPhotos : sessionPhotos;

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
      <DeleteModal
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDelete={async () => {
          if (user && supabase) {
            // Delete photos from storage
            try {
              const { data: files } = await supabase.storage.from('photos').list(user.id);
              if (files?.length) {
                await supabase.storage.from('photos').remove(files.map((f) => `${user.id}/${f.name}`));
              }
            } catch { /* best effort */ }
            // Delete photo records, profile, swipes, matches
            await supabase.from('photos').delete().eq('user_id', user.id);
            await supabase.from('swipes').delete().eq('user_id', user.id);
            await supabase.from('profiles').delete().eq('id', user.id);
          }
          await supabase?.auth.signOut();
          store.reset();
          navigate('/');
        }}
      />

      {/* Intent edit modal */}
      <AnimatePresence>
        {showIntentModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.85)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowIntentModal(false)}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl p-5"
              style={{ background: 'linear-gradient(175deg, #1C1C3E 0%, #12122A 100%)', border: '2px solid rgba(255,255,255,0.1)' }}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display text-xl mb-4" style={{ color: '#FFE66D' }}>I'm Here To…</h2>
              <div className="flex flex-col gap-2.5">
                {([
                  { value: 'play' as const, emoji: '🎮', label: 'Just Play', desc: 'Find gaming partners — no strings', color: '#00F5FF' },
                  { value: 'romance' as const, emoji: '💜', label: 'Find Romance', desc: 'Looking for a real connection', color: '#FF6BA8' },
                  { value: 'both' as const, emoji: '✨', label: 'Both', desc: 'Open to games and romance', color: '#B565FF' },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left w-full transition-all"
                    style={{
                      background: intent === opt.value ? `${opt.color}15` : 'rgba(255,255,255,0.03)',
                      border: `2px solid ${intent === opt.value ? `${opt.color}60` : 'rgba(255,255,255,0.08)'}`,
                    }}
                    onClick={async () => {
                      if (user && opt.value !== intent) {
                        const { error } = await updateProfileField(user.id, 'intent', opt.value);
                        if (!error) {
                          setDbProfile((prev) => prev ? { ...prev, intent: opt.value } : prev);
                          showToast('Intent updated!');
                        } else {
                          showToast('Failed to update — try again');
                        }
                      }
                      setShowIntentModal(false);
                    }}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <div>
                      <p className="font-body text-sm font-bold" style={{ color: opt.color }}>{opt.label}</p>
                      <p className="font-body text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{opt.desc}</p>
                    </div>
                    {intent === opt.value && (
                      <span className="ml-auto text-base" style={{ color: opt.color }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowIntentModal(false)}
                className="w-full mt-4 py-2 font-body text-sm font-bold rounded-lg"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Text edit modal (name / bio / location) ────────────────────── */}
      <AnimatePresence>
        {(editModal === 'name' || editModal === 'bio' || editModal === 'location') && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.85)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditModal(null)}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl p-5"
              style={{ background: 'linear-gradient(175deg, #1C1C3E 0%, #12122A 100%)', border: '2px solid rgba(255,255,255,0.1)' }}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display text-xl mb-4" style={{ color: '#FFE66D' }}>
                {editModal === 'name' ? 'Edit Name' : editModal === 'bio' ? 'Edit Bio' : 'Edit Location'}
              </h2>
              {editModal === 'bio' ? (
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="w-full rounded-xl px-4 py-3 font-body text-sm resize-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#fff', outline: 'none' }}
                  placeholder="Tell people about yourself..."
                  autoFocus
                />
              ) : (
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  maxLength={editModal === 'name' ? 50 : 100}
                  className="w-full rounded-xl px-4 py-3 font-body text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#fff', outline: 'none' }}
                  placeholder={editModal === 'name' ? 'Your name' : 'City, Country'}
                  autoFocus
                />
              )}
              {editModal === 'bio' && (
                <p className="font-body text-xs mt-2" style={{ color: editText.length < 20 ? '#FF9F1C' : 'rgba(255,255,255,0.3)' }}>
                  {editText.length}/500 {editText.length < 20 ? '(min 20 characters)' : ''}
                </p>
              )}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setEditModal(null)}
                  className="flex-1 py-3 rounded-xl font-body text-sm font-bold"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                >
                  Cancel
                </button>
                <button
                  disabled={saving || (editModal === 'bio' && editText.length > 0 && editText.length < 20) || !editText.trim()}
                  onClick={async () => {
                    const field = editModal!;
                    const ok = await saveField(field, editText.trim());
                    if (ok) {
                      showToast(`${field.charAt(0).toUpperCase() + field.slice(1)} updated!`);
                      setEditModal(null);
                    }
                  }}
                  className="flex-1 py-3 rounded-xl font-body text-sm font-bold"
                  style={{
                    background: 'rgba(78,255,196,0.15)',
                    border: '1.5px solid rgba(78,255,196,0.3)',
                    color: '#4EFFC4',
                    opacity: (saving || (editModal === 'bio' && editText.length > 0 && editText.length < 20) || !editText.trim()) ? 0.4 : 1,
                  }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Lifestyle edit modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {editModal === 'lifestyle' && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditModal(null)}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl p-5 max-h-[80vh] overflow-y-auto"
              style={{ background: 'linear-gradient(175deg, #1C1C3E 0%, #12122A 100%)', border: '2px solid rgba(255,255,255,0.1)' }}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display text-xl mb-4" style={{ color: '#FFE66D' }}>Edit Lifestyle</h2>
              <div className="flex flex-col gap-4">
                {(Object.entries(LIFESTYLE_OPTIONS) as [string, string[]][]).map(([field, options]) => {
                  const currentVal = lifestyle[field as keyof typeof lifestyle];
                  return (
                    <div key={field}>
                      <div className="flex items-center gap-2 mb-2">
                        <img src={lifestyleIcons[field]} alt="" className="w-4 h-4 object-contain" />
                        <span className="font-body text-xs font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {lifestyleLabels[field]}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {options.map((opt) => (
                          <button
                            key={opt}
                            className="px-3 py-1.5 rounded-lg font-body text-xs transition-all"
                            style={{
                              background: currentVal === opt ? 'rgba(78,255,196,0.15)' : 'rgba(255,255,255,0.04)',
                              border: `1.5px solid ${currentVal === opt ? 'rgba(78,255,196,0.4)' : 'rgba(255,255,255,0.08)'}`,
                              color: currentVal === opt ? '#4EFFC4' : 'rgba(255,255,255,0.5)',
                            }}
                            onClick={async () => {
                              const ok = await saveField(field, opt);
                              if (ok) showToast(`${lifestyleLabels[field]} updated!`);
                            }}
                          >
                            {opt}
                          </button>
                        ))}
                        <button
                          className="px-3 py-1.5 rounded-lg font-body text-xs transition-all"
                          style={{
                            background: currentVal === null ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                            border: `1.5px solid ${currentVal === null ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
                            color: currentVal === null ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
                          }}
                          onClick={async () => {
                            const ok = await saveField(field, null);
                            if (ok) showToast(`${lifestyleLabels[field]} cleared`);
                          }}
                        >
                          Prefer not to say
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setEditModal(null)}
                className="w-full mt-5 py-2.5 font-body text-sm font-bold rounded-xl"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Gender / Interested In edit modal ─────────────────────────── */}
      <AnimatePresence>
        {(editModal === 'gender' || editModal === 'interested_in') && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.85)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditModal(null)}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl p-5"
              style={{ background: 'linear-gradient(175deg, #1C1C3E 0%, #12122A 100%)', border: '2px solid rgba(255,255,255,0.1)' }}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display text-xl mb-4" style={{ color: '#FFE66D' }}>
                {editModal === 'gender' ? 'I am a…' : 'Interested in…'}
              </h2>
              <div className="flex flex-col gap-2.5">
                {(editModal === 'gender' ? GENDER_OPTIONS : INTERESTED_IN_OPTIONS).map((opt) => {
                  const current = editModal === 'gender'
                    ? (dbProfile?.gender || store.gender || null)
                    : (dbProfile?.interested_in || store.interestedIn || null);
                  const isSelected = current === opt.id;
                  return (
                    <button
                      key={opt.id}
                      className="flex items-center justify-between px-4 py-3.5 rounded-xl text-left w-full transition-all"
                      style={{
                        background: isSelected ? `${opt.color}15` : 'rgba(255,255,255,0.03)',
                        border: `2px solid ${isSelected ? `${opt.color}60` : 'rgba(255,255,255,0.08)'}`,
                      }}
                      onClick={async () => {
                        const ok = await saveField(editModal!, opt.id);
                        if (ok) {
                          showToast(`${editModal === 'gender' ? 'Gender' : 'Interested in'} updated!`);
                          setEditModal(null);
                        }
                      }}
                    >
                      <span className="font-body text-sm font-bold" style={{ color: isSelected ? opt.color : 'rgba(255,255,255,0.7)' }}>
                        {opt.label}
                      </span>
                      {isSelected && <span style={{ color: opt.color }}>✓</span>}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setEditModal(null)}
                className="w-full mt-4 py-2 font-body text-sm font-bold rounded-lg"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Birthday edit modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {editModal === 'birthday' && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.85)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditModal(null)}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl p-5"
              style={{ background: 'linear-gradient(175deg, #1C1C3E 0%, #12122A 100%)', border: '2px solid rgba(255,255,255,0.1)' }}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display text-xl mb-4" style={{ color: '#FFE66D' }}>Edit Birthday</h2>
              <input
                type="date"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full rounded-xl px-4 py-3 font-body text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#fff', outline: 'none', colorScheme: 'dark' }}
              />
              {editText && (
                <p className="font-body text-xs mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Age: {calcAge(editText)}
                </p>
              )}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setEditModal(null)}
                  className="flex-1 py-3 rounded-xl font-body text-sm font-bold"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                >
                  Cancel
                </button>
                <button
                  disabled={saving || !editText}
                  onClick={async () => {
                    const newAge = calcAge(editText);
                    if (newAge < 18) { showToast('Must be 18 or older'); return; }
                    const ok1 = await saveField('birthday', editText);
                    if (ok1) {
                      await saveField('age', newAge);
                      showToast('Birthday updated!');
                      setEditModal(null);
                    }
                  }}
                  className="flex-1 py-3 rounded-xl font-body text-sm font-bold"
                  style={{
                    background: 'rgba(78,255,196,0.15)',
                    border: '1.5px solid rgba(78,255,196,0.3)',
                    color: '#4EFFC4',
                    opacity: (saving || !editText) ? 0.4 : 1,
                  }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Avatar edit modal (character / element / affiliation) ──────── */}
      <AnimatePresence>
        {(editModal === 'character' || editModal === 'element' || editModal === 'affiliation') && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditModal(null)}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl p-5 max-h-[80vh] overflow-y-auto"
              style={{ background: 'linear-gradient(175deg, #1C1C3E 0%, #12122A 100%)', border: '2px solid rgba(255,255,255,0.1)' }}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display text-xl mb-4" style={{ color: '#FFE66D' }}>
                {editModal === 'character' ? 'Choose Character' : editModal === 'element' ? 'Choose Element' : 'Choose World'}
              </h2>
              <div className={`grid gap-2 ${editModal === 'character' ? 'grid-cols-3' : editModal === 'element' ? 'grid-cols-3' : 'grid-cols-3'}`}>
                {Object.entries(
                  editModal === 'character' ? characterImages : editModal === 'element' ? elementImages : affiliationImages
                ).map(([id, img]) => {
                  const current = editModal === 'character' ? character : editModal === 'element' ? element : affiliation;
                  const isSelected = current === id;
                  return (
                    <button
                      key={id}
                      className="flex flex-col items-center gap-1 py-3 rounded-xl transition-all"
                      style={{
                        background: isSelected ? 'rgba(78,255,196,0.12)' : 'rgba(255,255,255,0.04)',
                        border: `2px solid ${isSelected ? 'rgba(78,255,196,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      }}
                      onClick={async () => {
                        const ok = await saveField(editModal!, id);
                        if (ok) {
                          showToast(`${cap(editModal!)} updated!`);
                          setEditModal(null);
                        }
                      }}
                    >
                      <img src={img} alt={id} className="w-10 h-10 object-contain" draggable={false} />
                      <span className="font-body text-[10px] font-bold" style={{ color: isSelected ? '#4EFFC4' : 'rgba(255,255,255,0.6)' }}>
                        {cap(id)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setEditModal(null)}
                className="w-full mt-4 py-2.5 font-body text-sm font-bold rounded-xl"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Games edit modal (gameTypes + favoriteGames) ──────────────── */}
      <AnimatePresence>
        {editModal === 'games' && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditModal(null)}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl p-5 max-h-[80vh] overflow-y-auto"
              style={{ background: 'linear-gradient(175deg, #1C1C3E 0%, #12122A 100%)', border: '2px solid rgba(255,255,255,0.1)' }}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display text-xl mb-3" style={{ color: '#FFE66D' }}>Game Types</h2>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {ALL_GAME_TYPES.map((g) => {
                  const selected = editArray.includes(g);
                  return (
                    <button
                      key={g}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-body text-xs transition-all"
                      style={{
                        background: selected ? 'rgba(78,255,196,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1.5px solid ${selected ? 'rgba(78,255,196,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        color: selected ? '#4EFFC4' : 'rgba(255,255,255,0.5)',
                      }}
                      onClick={() => {
                        setEditArray((prev) =>
                          prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
                        );
                      }}
                    >
                      {gameTypeIcons[g] && <img src={gameTypeIcons[g]} alt="" className="w-3.5 h-3.5 object-contain" />}
                      {gameTypeLabels[g] || g}
                    </button>
                  );
                })}
              </div>

              <h2 className="font-display text-lg mb-2" style={{ color: '#FFE66D' }}>Favourite Games</h2>
              <div className="flex flex-col gap-1.5 mb-3">
                {editFavGames.map((g, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span className="font-body text-sm flex-1" style={{ color: 'rgba(255,255,255,0.7)' }}>{g}</span>
                    <button onClick={() => setEditFavGames((prev) => prev.filter((_, j) => j !== i))}
                      style={{ color: 'rgba(255,107,168,0.7)' }} className="text-sm font-bold px-1">✕</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newFavGame}
                  onChange={(e) => setNewFavGame(e.target.value)}
                  placeholder="Add a game…"
                  className="flex-1 rounded-lg px-3 py-2 font-body text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newFavGame.trim()) {
                      setEditFavGames((prev) => [...prev, newFavGame.trim()]);
                      setNewFavGame('');
                    }
                  }}
                />
                <button
                  disabled={!newFavGame.trim()}
                  onClick={() => { setEditFavGames((prev) => [...prev, newFavGame.trim()]); setNewFavGame(''); }}
                  className="px-3 py-2 rounded-lg font-body text-xs font-bold"
                  style={{ background: 'rgba(78,255,196,0.1)', color: '#4EFFC4', border: '1px solid rgba(78,255,196,0.25)', opacity: newFavGame.trim() ? 1 : 0.4 }}
                >
                  Add
                </button>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setEditModal(null)}
                  className="flex-1 py-3 rounded-xl font-body text-sm font-bold"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                  Cancel
                </button>
                <button
                  disabled={saving}
                  onClick={async () => {
                    const ok1 = await saveField('game_types', editArray);
                    const ok2 = await saveField('favorite_games', editFavGames);
                    if (ok1 && ok2) {
                      showToast('Games updated!');
                      setEditModal(null);
                    }
                  }}
                  className="flex-1 py-3 rounded-xl font-body text-sm font-bold"
                  style={{ background: 'rgba(78,255,196,0.15)', border: '1.5px solid rgba(78,255,196,0.3)', color: '#4EFFC4', opacity: saving ? 0.4 : 1 }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Looking For edit modal (multi-select) ─────────────────────── */}
      <AnimatePresence>
        {editModal === 'looking_for' && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.85)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditModal(null)}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl p-5"
              style={{ background: 'linear-gradient(175deg, #1C1C3E 0%, #12122A 100%)', border: '2px solid rgba(255,255,255,0.1)' }}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display text-xl mb-4" style={{ color: '#FFE66D' }}>Looking For</h2>
              <div className="flex flex-col gap-2.5">
                {GOAL_OPTIONS.map((opt) => {
                  const selected = editArray.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      className="flex items-center justify-between px-4 py-3 rounded-xl text-left w-full transition-all"
                      style={{
                        background: selected ? `${opt.color}15` : 'rgba(255,255,255,0.03)',
                        border: `2px solid ${selected ? `${opt.color}60` : 'rgba(255,255,255,0.08)'}`,
                      }}
                      onClick={() => {
                        setEditArray((prev) =>
                          prev.includes(opt.id) ? prev.filter((x) => x !== opt.id) : [...prev, opt.id]
                        );
                      }}
                    >
                      <span className="font-body text-sm font-bold" style={{ color: selected ? opt.color : 'rgba(255,255,255,0.6)' }}>
                        {opt.label}
                      </span>
                      {selected && <span style={{ color: opt.color }}>✓</span>}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setEditModal(null)}
                  className="flex-1 py-3 rounded-xl font-body text-sm font-bold"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                  Cancel
                </button>
                <button
                  disabled={saving || editArray.length === 0}
                  onClick={async () => {
                    const ok = await saveField('looking_for', editArray);
                    if (ok) { showToast('Updated!'); setEditModal(null); }
                  }}
                  className="flex-1 py-3 rounded-xl font-body text-sm font-bold"
                  style={{ background: 'rgba(78,255,196,0.15)', border: '1.5px solid rgba(78,255,196,0.3)', color: '#4EFFC4', opacity: (saving || editArray.length === 0) ? 0.4 : 1 }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Prompts edit modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {editModal === 'prompts' && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setEditModal(null); setPromptStep('list'); }}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl p-5 max-h-[80vh] overflow-y-auto"
              style={{ background: 'linear-gradient(175deg, #1C1C3E 0%, #12122A 100%)', border: '2px solid rgba(255,255,255,0.1)' }}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {promptStep === 'list' && (
                <>
                  <h2 className="font-display text-xl mb-4" style={{ color: '#FFE66D' }}>Your Prompts</h2>
                  {prompts.length > 0 ? (
                    <div className="flex flex-col gap-2.5 mb-4">
                      {prompts.map((p) => (
                        <div key={p.id} className="rounded-xl p-3 relative"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <button
                            onClick={() => {
                              const updated = prompts.filter((x) => x.id !== p.id);
                              store.updatePrompts(updated);
                              showToast('Prompt removed');
                            }}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(255,107,168,0.15)', color: '#FF6BA8' }}
                          >
                            <span className="text-xs font-bold">✕</span>
                          </button>
                          <p className="font-body text-[11px] mb-1 pr-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            {p.icon} {p.question}
                          </p>
                          <p className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>{p.answer}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-body text-sm mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>No prompts yet</p>
                  )}
                  {prompts.length < 5 && (
                    <button
                      onClick={() => setPromptStep('pick')}
                      className="w-full py-2.5 rounded-xl font-body text-sm font-bold mb-3"
                      style={{ background: 'rgba(78,255,196,0.1)', border: '1.5px solid rgba(78,255,196,0.25)', color: '#4EFFC4' }}
                    >
                      + Add Prompt
                    </button>
                  )}
                  <button onClick={() => { setEditModal(null); setPromptStep('list'); }}
                    className="w-full py-2 font-body text-sm font-bold rounded-lg"
                    style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Done
                  </button>
                </>
              )}
              {promptStep === 'pick' && (
                <>
                  <h2 className="font-display text-xl mb-3" style={{ color: '#FFE66D' }}>Pick a Prompt</h2>
                  <div className="flex flex-col gap-1.5 mb-3">
                    {PROMPT_POOL
                      .filter((p) => !prompts.some((e) => e.id === p.id))
                      .map((p) => {
                        const color = CATEGORY_COLORS[p.category] ?? '#4EFFC4';
                        return (
                          <button
                            key={p.id}
                            className="text-left px-3 py-2.5 rounded-lg transition-all"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                            onClick={() => { setPickedPrompt(p); setPromptAnswer(''); setPromptStep('answer'); }}
                          >
                            <span className="font-body text-xs" style={{ color }}>{p.icon} {p.question}</span>
                          </button>
                        );
                      })}
                  </div>
                  <button onClick={() => setPromptStep('list')}
                    className="w-full py-2 font-body text-sm font-bold rounded-lg"
                    style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Back
                  </button>
                </>
              )}
              {promptStep === 'answer' && pickedPrompt && (
                <>
                  <h2 className="font-display text-lg mb-2" style={{ color: '#FFE66D' }}>
                    {pickedPrompt.icon} {pickedPrompt.question}
                  </h2>
                  <textarea
                    value={promptAnswer}
                    onChange={(e) => setPromptAnswer(e.target.value)}
                    rows={3}
                    maxLength={200}
                    className="w-full rounded-xl px-4 py-3 font-body text-sm resize-none mb-1"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#fff', outline: 'none' }}
                    placeholder="Your answer…"
                    autoFocus
                  />
                  <p className="font-body text-xs mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>{promptAnswer.length}/200</p>
                  <div className="flex gap-3">
                    <button onClick={() => setPromptStep('pick')}
                      className="flex-1 py-3 rounded-xl font-body text-sm font-bold"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                      Back
                    </button>
                    <button
                      disabled={!promptAnswer.trim()}
                      onClick={() => {
                        const newPrompt: UserPrompt = {
                          id: pickedPrompt.id,
                          category: pickedPrompt.category,
                          icon: pickedPrompt.icon,
                          question: pickedPrompt.question,
                          answer: promptAnswer.trim(),
                        };
                        store.updatePrompts([...prompts, newPrompt]);
                        showToast('Prompt added!');
                        setPromptStep('list');
                      }}
                      className="flex-1 py-3 rounded-xl font-body text-sm font-bold"
                      style={{ background: 'rgba(78,255,196,0.15)', border: '1.5px solid rgba(78,255,196,0.3)', color: '#4EFFC4', opacity: promptAnswer.trim() ? 1 : 0.4 }}>
                      Add
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              {character && characterImages[character] ? (
                <img
                  src={characterImages[character]}
                  alt={character}
                  className="w-20 h-20 object-contain"
                  draggable={false}
                />
              ) : (
                <span className="font-body text-3xl" style={{ color: 'rgba(255,255,255,0.2)' }}>?</span>
              )}
            </div>

            {/* Element badge */}
            {element && elementImages[element] && (
              <div
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: '#0A1628', border: '2px solid rgba(255,255,255,0.15)' }}
              >
                <img src={elementImages[element]} alt={element} className="w-6 h-6 object-contain" draggable={false} />
              </div>
            )}

            {/* Edit avatar button */}
            <button
              onClick={() => setEditModal('character')}
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
            <button onClick={() => openTextEdit('name', name)} className="font-display text-2xl" style={{ color: name ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>
              {name || PLACEHOLDER.name}{age != null ? `, ${age}` : ''}
            </button>
            <button onClick={() => openTextEdit('location', location)} className="font-body text-sm mt-0.5 flex items-center justify-center gap-1" style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1C4.067 1 2.5 2.567 2.5 4.5C2.5 7.5 6 11 6 11C6 11 9.5 7.5 9.5 4.5C9.5 2.567 7.933 1 6 1Z" stroke="currentColor" strokeWidth="1.3"/>
                <circle cx="6" cy="4.5" r="1.2" fill="currentColor"/>
              </svg>
              {location || PLACEHOLDER.location}
            </button>
            {/* Avatar tag */}
            {character && element && affiliation ? (
              <div className="flex items-center justify-center gap-1.5 mt-2">
                {affiliationImages[affiliation] && (
                  <img src={affiliationImages[affiliation]} alt="" className="w-4 h-4 object-contain" draggable={false} />
                )}
                <span className="font-body text-xs" style={{ color: 'rgba(78,255,196,0.7)' }}>
                  {cap(element)} {cap(affiliation)} {cap(character)}
                </span>
              </div>
            ) : (
              <p className="font-body text-xs mt-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
                No avatar selected
              </p>
            )}
          </div>
        </motion.div>

        {/* ── Profile completeness ──────────────────────────────────────── */}
        {completeness && !completeness.isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
          >
            <SectionCard>
              <div className="flex items-center justify-between mb-2">
                <span className="font-display text-sm" style={{ color: '#FFE66D' }}>
                  Complete Your Profile
                </span>
                <span className="font-body text-xs font-bold" style={{ color: '#4EFFC4' }}>
                  {completeness.percentage}%
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2 rounded-full mb-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #4EFFC4, #B565FF)',
                    boxShadow: '0 0 8px rgba(78,255,196,0.4)',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${completeness.percentage}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <p className="font-body text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Missing:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {completeness.missing.map((field) => (
                  <span
                    key={field}
                    className="font-body text-xs px-2 py-1 rounded-lg"
                    style={{ background: 'rgba(255,159,28,0.1)', color: '#FF9F1C', border: '1px solid rgba(255,159,28,0.25)' }}
                  >
                    {field}
                  </span>
                ))}
              </div>
            </SectionCard>
          </motion.div>
        )}

        {/* ── Basics (gender, interested in, birthday) ──────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
        >
          <SectionCard>
            <SectionHeading label="Basics" />
            <div className={`grid gap-2 ${intent === 'play' ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {[
                {
                  label: 'Gender',
                  value: dbProfile?.gender || store.gender || null,
                  display: dbProfile?.gender ? cap(dbProfile.gender) : store.gender ? cap(store.gender) : null,
                  onEdit: () => setEditModal('gender'),
                },
                ...(intent !== 'play' ? [{
                  label: 'Interested in',
                  value: dbProfile?.interested_in || store.interestedIn || null,
                  display: dbProfile?.interested_in ? cap(dbProfile.interested_in) : store.interestedIn ? cap(store.interestedIn) : null,
                  onEdit: () => setEditModal('interested_in'),
                }] : []),
                {
                  label: 'Birthday',
                  value: dbProfile?.birthday || store.birthday || null,
                  display: (dbProfile?.birthday || store.birthday)
                    ? new Date(dbProfile?.birthday || store.birthday || '').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : null,
                  onEdit: () => openTextEdit('birthday', dbProfile?.birthday || store.birthday || ''),
                },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.onEdit}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl text-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <p className="font-body text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{item.label}</p>
                  <p className="font-body text-xs font-bold" style={{ color: item.display ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)' }}>
                    {item.display ?? 'Not set'}
                  </p>
                </button>
              ))}
            </div>
          </SectionCard>
        </motion.div>

        {/* ── Photo carousel ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <SectionCard>
            <SectionHeading label="Photos" />
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {displayPhotos.length > 0
                ? displayPhotos.map((src, i) => (
                    <div
                      key={i}
                      className="flex-shrink-0 w-24 h-28 rounded-xl overflow-hidden relative group"
                      style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" draggable={false} />
                      {/* Delete button */}
                      <button
                        onClick={async () => {
                          if (!user) return;
                          const updated = displayPhotos.filter((_, j) => j !== i);
                          await savePhotos(user.id, updated);
                          const refreshed = await getPhotos(user.id);
                          setDbPhotos(refreshed);
                          showToast('Photo removed');
                        }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.7)', color: '#FF6BA8', fontSize: '10px', fontWeight: 'bold' }}
                      >
                        ✕
                      </button>
                      {/* Reorder arrows */}
                      <div className="absolute bottom-1 left-1 right-1 flex justify-between">
                        {i > 0 && (
                          <button
                            onClick={async () => {
                              if (!user) return;
                              const arr = [...displayPhotos];
                              [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                              await savePhotos(user.id, arr);
                              const refreshed = await getPhotos(user.id);
                              setDbPhotos(refreshed);
                            }}
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '10px' }}
                          >
                            ◀
                          </button>
                        )}
                        <div />
                        {i < displayPhotos.length - 1 && (
                          <button
                            onClick={async () => {
                              if (!user) return;
                              const arr = [...displayPhotos];
                              [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                              await savePhotos(user.id, arr);
                              const refreshed = await getPhotos(user.id);
                              setDbPhotos(refreshed);
                            }}
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '10px' }}
                          >
                            ▶
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                : (
                    <div
                      className="flex-shrink-0 w-24 h-28 rounded-xl flex items-center justify-center"
                      style={{ border: '1.5px dashed rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.02)' }}
                    >
                      <span className="font-body text-xs text-center px-1" style={{ color: 'rgba(255,255,255,0.2)' }}>No photos yet</span>
                    </div>
                  )
              }
              {/* Add photo slot */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={uploading}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-shrink-0 w-24 h-28 rounded-xl flex flex-col items-center justify-center gap-1"
                style={{ border: '2px dashed rgba(255,255,255,0.15)', background: 'transparent', opacity: uploading ? 0.5 : 1 }}
              >
                {uploading ? (
                  <motion.div
                    className="w-5 h-5 rounded-full border-2 border-t-transparent"
                    style={{ borderColor: 'rgba(78,255,196,0.5)', borderTopColor: 'transparent' }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 4v12M4 10h12" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Add</span>
                  </>
                )}
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
            <SectionHeading label="About" onEdit={() => openTextEdit('bio', bio)} />
            <p className="font-body text-sm leading-relaxed" style={{ color: bio ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)' }}>
              {bio || PLACEHOLDER.bio}
            </p>
          </SectionCard>
        </motion.div>

        {/* ── Prompts ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
        >
          <SectionCard>
            <SectionHeading label="Get To Know Me" onEdit={() => { setPromptStep('list'); setEditModal('prompts'); }} />
            {prompts.length > 0 ? (
              <div className="flex flex-col gap-3">
                {prompts.map((p) => (
                  <PromptCard key={p.id} prompt={p} />
                ))}
              </div>
            ) : (
              <p className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
                No prompts added yet
              </p>
            )}
          </SectionCard>
        </motion.div>

        {/* ── Avatar ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SectionCard>
            <SectionHeading label="Avatar" onEdit={() => setEditModal('character')} />
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Character', img: character ? characterImages[character] : null, name: character ? cap(character) : null, modal: 'character' as const },
                { label: 'Element',   img: element ? elementImages[element] : null,     name: element ? cap(element) : null, modal: 'element' as const },
                { label: 'World',     img: affiliation ? affiliationImages[affiliation] : null, name: affiliation ? cap(affiliation) : null, modal: 'affiliation' as const },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => setEditModal(item.modal)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {item.img ? (
                    <img src={item.img} alt={item.name ?? ''} className="w-10 h-10 object-contain" draggable={false} />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.15)' }}>?</span>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="font-body text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{item.label}</p>
                    <p className="font-body text-xs font-bold" style={{ color: item.name ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)' }}>
                      {item.name ?? 'Not set'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setEditModal('character')}
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
            <SectionHeading label="Loves to Play" onEdit={() => { setEditArray([...gameTypes]); setEditFavGames([...favoriteGames]); setNewFavGame(''); setEditModal('games'); }} />
            {/* Game type chips */}
            {gameTypes.length > 0 ? (
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
            ) : (
              <p className="font-body text-sm mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
                No game types selected
              </p>
            )}
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

        {/* ── Relationship goal (hidden for play-only) ────────────────── */}
        {intent !== 'play' && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
        >
          <SectionCard>
            <SectionHeading label="Looking For" onEdit={() => { openArrayEdit('looking_for', lookingFor); }} />
            {lookingFor.length > 0 ? (
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
            ) : (
              <p className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Not set
              </p>
            )}
          </SectionCard>
        </motion.div>
        )}

        {/* ── Intent (Just Play / Romance / Both) ────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
        >
          <SectionCard>
            <SectionHeading label="I'm Here To" onEdit={() => setShowIntentModal(true)} />
            <div
              className="flex items-center gap-3 px-3 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <span className="text-xl">
                {intent === 'play' ? '🎮' : intent === 'romance' ? '💜' : '✨'}
              </span>
              <div>
                <p className="font-body text-sm font-bold" style={{
                  color: intent === 'play' ? '#00F5FF' : intent === 'romance' ? '#FF6BA8' : '#B565FF',
                }}>
                  {intent === 'play' ? 'Just Play' : intent === 'romance' ? 'Find Romance' : 'Both — Play & Romance'}
                </p>
                <p className="font-body text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {intent === 'play'
                    ? 'Looking for gaming partners — no pressure'
                    : intent === 'romance'
                    ? 'Looking for a real connection'
                    : 'Open to games and romance'}
                </p>
              </div>
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
            <SectionHeading label="Lifestyle" onEdit={() => setEditModal('lifestyle')} />
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(lifestyle) as [keyof typeof lifestyle, string | null][]).map(([key, val]) => (
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
                    <p className="font-body text-xs font-bold truncate" style={{ color: val ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.2)' }}>
                      {val ?? 'Not set'}
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
                onClick={async () => { await supabase?.auth.signOut(); useOnboardingStore.getState().reset(); navigate('/login'); }}
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
