import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserPrompt } from '../../store/onboardingStore';
import { promptCategoryIconSrc } from '../../constants/promptCategoryIcons';
import { INTENT_UI, type IntentValue } from '../../lib/database';

export interface ProfileDetailData {
  id: string;
  name: string;
  age: number;
  location?: string;
  distance?: string;
  character: string;
  element: string;
  affiliation: string;
  bio: string;
  games: string[];
  favoriteGames: string[];
  /** Mirrors `profiles.looking_for`; sole source for relationship goal chips. */
  relationshipGoals: string[];
  intent?: IntentValue;
  gender?: string | null;
  interestedIn?: string | null;
  birthday?: string | null;
  kids: string;
  drinking: string;
  smoking: string;
  cannabis: string;
  pets: string;
  exercise: string;
  prompts?: UserPrompt[];
}

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

const elementLabels: Record<string, string> = {
  fire: 'Fire', water: 'Water', earth: 'Earth', air: 'Air', electric: 'Electric',
};

const affiliationLabels: Record<string, string> = {
  city: 'City', country: 'Country', nature: 'Nature', fitness: 'Fitness',
  academia: 'Academia', music: 'Music', art: 'Art', tech: 'Tech', cosmic: 'Cosmic', travel: 'Travel',
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
  casual: 'Something casual',
  'short-term': 'Short-term fun',
  'long-term': 'Long-term relationship',
  'not-sure': 'Not sure yet',
  open: 'Open to see what happens',
};

const goalColors: Record<string, string> = {
  casual: '#FF6BA8',
  'short-term': '#FF9F1C',
  'long-term': '#4EFFC4',
  'not-sure': '#B565FF',
  open: '#FFE66D',
};

const intentDescriptions: Record<'play' | 'romance' | 'both', string> = {
  play: 'Looking for gaming partners - no pressure',
  romance: 'Looking for a real connection',
  both: 'Open to games and romance',
};

const intentColors: Record<'play' | 'romance' | 'both', string> = {
  play: '#00F5FF',
  romance: '#FF6BA8',
  both: '#B565FF',
};

const PROMPT_CATEGORY_COLORS: Record<string, string> = {
  games: '#00F5FF', fun: '#FFE66D', personality: '#B565FF', playful: '#FF6BA8',
};

/** Luminous section title colors (glow via text-shadow). */
const SECTION_TITLE_STYLES = {
  avatar: '#FF6BA8',
  basics: '#FFE66D',
  about: '#4EFFC4',
  getToKnow: '#B565FF',
  lovesToPlay: '#00F5FF',
  lookingFor: '#FF9F1C',
  lifestyle: '#C8FF4A',
} as const;

type SectionTitleKey = keyof typeof SECTION_TITLE_STYLES;

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

function SectionHeading({ label, section }: { label: string; section: SectionTitleKey }) {
  const color = SECTION_TITLE_STYLES[section];
  return (
    <div className="flex items-center justify-between mb-3">
      <span
        className="font-display text-base uppercase"
        style={{
          color,
          letterSpacing: '0.06em',
          textShadow: `0 0 14px ${color}99, 0 0 28px ${color}44, 2px 2px 0 rgba(0,0,0,0.35)`,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function PromptReadCard({ prompt }: { prompt: UserPrompt }) {
  const color = PROMPT_CATEGORY_COLORS[prompt.category] ?? '#4EFFC4';
  return (
    <div
      className="rounded-xl p-4 relative overflow-hidden"
      style={{
        background: '#0A1628',
        border: `2px solid ${color}`,
        boxShadow: `0 0 14px ${color}25, 3px 3px 0 rgba(0,0,0,0.4)`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <img src={promptCategoryIconSrc(prompt.category)} alt="" className="w-5 h-5 object-contain flex-shrink-0" draggable={false} />
        <p className="font-body text-ui-caption leading-snug" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {prompt.question}
        </p>
      </div>
      <p className="font-display text-base leading-snug" style={{ color: '#FFFFFF' }}>
        {prompt.answer}
      </p>
    </div>
  );
}

function safeIntent(i: IntentValue | undefined): IntentValue {
  if (i === 'play' || i === 'romance' || i === 'both') return i;
  return 'romance';
}

export function ProfileDetailSheet({
  profile,
  photoUrls,
  onClose,
  onAction,
  actionVariant = 'discover',
  onOpenSafetyMenu,
  /** Onboarding preview: host screen supplies Back; hide duplicate sheet header. */
  hideHeaderNavigation = false,
}: {
  profile: ProfileDetailData;
  photoUrls?: string[];
  onClose: () => void;
  onAction?: (dir: 'left' | 'right') => void;
  actionVariant?: 'discover' | 'challenge';
  /** When set, shows a … control in the header (block/report). */
  onOpenSafetyMenu?: () => void;
  hideHeaderNavigation?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const relationshipGoals = profile.relationshipGoals ?? [];
  const intent = safeIntent(profile.intent);

  const slides = useMemo(() => {
    if (photoUrls && photoUrls.length > 0) {
      return photoUrls.map((img, i) => ({ img, key: `photo-${i}` }));
    }
    return [
      { img: characterImages[profile.character] ?? '/characters/Ghost.png', key: 'character' },
      { img: affiliationImages[profile.affiliation] ?? '/affiliation/City.png', key: 'affiliation' },
      { img: elementImages[profile.element] ?? '/elements/Fire.png', key: 'element' },
    ];
  }, [photoUrls, profile.affiliation, profile.character, profile.element]);

  const hasUploadedPhotos = !!photoUrls && photoUrls.length > 0;
  useEffect(() => { setIdx(0); }, [profile.id, slides.length]);

  const locationDistanceLine = [profile.location, profile.distance].filter((x) => x && String(x).trim()).join(' ');

  const lifestyle = {
    kids: profile.kids,
    drinking: profile.drinking,
    smoking: profile.smoking,
    cannabis: profile.cannabis,
    pets: profile.pets,
    exercise: profile.exercise,
  } as const;

  const birthdayDisplay = profile.birthday
    ? new Date(profile.birthday).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const basicsGridClass = intent === 'play' ? 'grid gap-2 grid-cols-2' : 'grid gap-2 grid-cols-3';

  return (
    <motion.div className="fixed inset-0 z-30 flex flex-col"
      style={{ background: '#12122A' }} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
      {!hideHeaderNavigation && (
        <div className="flex-none flex items-center gap-2 px-4 pt-safe pt-3 pb-3 z-10"
          style={{ background: 'rgba(18,18,42,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <motion.button onClick={onClose} className="flex items-center gap-1.5 font-body font-bold text-ui-body flex-shrink-0"
            style={{ color: 'rgba(255,255,255,0.55)' }} whileTap={{ scale: 0.92 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 5L7.5 10L12.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </motion.button>
          <div className="flex-1 min-w-0" aria-hidden />
          {onOpenSafetyMenu ? (
            <motion.button
              type="button"
              onClick={onOpenSafetyMenu}
              className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.9 }}
              aria-label="More options"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <circle cx="9" cy="3.5" r="1.5" fill="rgba(255,255,255,0.65)" />
                <circle cx="9" cy="9" r="1.5" fill="rgba(255,255,255,0.65)" />
                <circle cx="9" cy="14.5" r="1.5" fill="rgba(255,255,255,0.65)" />
              </svg>
            </motion.button>
          ) : (
            <div className="w-10 flex-shrink-0" aria-hidden />
          )}
        </div>
      )}

      <div
        className={`flex-1 overflow-y-auto pb-24 ${hideHeaderNavigation ? 'pt-[calc(env(safe-area-inset-top,0px)+5.25rem)]' : ''}`}
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        <div className="relative w-full aspect-[300/350] select-none bg-[#0A0A1E]">
          <AnimatePresence mode="wait">
            <motion.div key={slides[idx].key} className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <img src={slides[idx].img} alt="" className={`h-full w-full ${hasUploadedPhotos ? 'object-cover' : 'object-contain'}`}
                draggable={false}
                style={hasUploadedPhotos ? { filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.45))' } : { padding: 24, filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.8))' }} />
            </motion.div>
          </AnimatePresence>
          <button type="button" className="absolute left-0 top-0 w-1/2 h-full z-10" onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)} aria-label="Previous photo" />
          <button type="button" className="absolute right-0 top-0 w-1/2 h-full z-10" onClick={() => setIdx((i) => (i + 1) % slides.length)} aria-label="Next photo" />
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 z-10 pointer-events-none">
            {slides.map((s, i) => (
              <motion.div key={s.key} className="rounded-full"
                animate={{ width: i === idx ? 20 : 6, background: i === idx ? '#4EFFC4' : 'rgba(255,255,255,0.3)' }}
                style={{ height: 5 }} transition={{ duration: 0.2 }} />
            ))}
          </div>
        </div>

        <div className="px-5 pt-5 pb-1">
          <div className="flex items-baseline gap-2 mb-1">
            <h1 className="font-display text-4xl leading-none" style={{ color: '#FFE66D', textShadow: '0 0 16px rgba(255,230,109,0.55), 4px 4px 0 rgba(0,0,0,0.4)' }}>{profile.name}</h1>
            <span className="font-body font-bold text-2xl" style={{ color: 'rgba(255,255,255,0.6)' }}>{profile.age}</span>
          </div>
          {!!locationDistanceLine && (
            <p className="font-body text-ui-label font-bold uppercase tracking-wide mb-3" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {locationDistanceLine}
            </p>
          )}
        </div>

        <div className="px-5 space-y-4 pb-8">
          <SectionCard>
            <SectionHeading label="Avatar" section="avatar" />
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Character', img: characterImages[profile.character] ?? null, name: cap(profile.character) },
                { label: 'Element', img: elementImages[profile.element] ?? null, name: elementLabels[profile.element] ?? cap(profile.element) },
                { label: 'World', img: affiliationImages[profile.affiliation] ?? null, name: affiliationLabels[profile.affiliation] ?? cap(profile.affiliation) },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center justify-center rounded-xl px-2 py-3 min-h-[44px]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {item.img ? (
                    <img src={item.img} alt="" className="w-16 h-16 object-contain flex-shrink-0" draggable={false} />
                  ) : (
                    <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.15)' }}>?</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard>
            <SectionHeading label="Basics" section="basics" />
            <div className={basicsGridClass}>
              <div
                className="flex flex-col items-center gap-1 py-3 rounded-xl text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p className="font-body text-ui-caption" style={{ color: 'rgba(255,255,255,0.7)' }}>Gender</p>
                <p className="font-body text-ui-label font-bold" style={{ color: profile.gender ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.7)' }}>
                  {profile.gender ? cap(profile.gender) : 'Not set'}
                </p>
              </div>
              {intent !== 'play' && (
                <div
                  className="flex flex-col items-center gap-1 py-3 rounded-xl text-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <p className="font-body text-ui-caption" style={{ color: 'rgba(255,255,255,0.7)' }}>Interested in</p>
                  <p className="font-body text-ui-label font-bold" style={{ color: profile.interestedIn ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.7)' }}>
                    {profile.interestedIn ? cap(profile.interestedIn) : 'Not set'}
                  </p>
                </div>
              )}
              <div
                className="flex flex-col items-center gap-1 py-3 rounded-xl text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p className="font-body text-ui-caption" style={{ color: 'rgba(255,255,255,0.7)' }}>Birthday</p>
                <p className="font-body text-ui-label font-bold" style={{ color: birthdayDisplay ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.7)' }}>
                  {birthdayDisplay ?? 'Not set'}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard>
            <SectionHeading label="About" section="about" />
            <p className="font-body text-ui-body leading-relaxed" style={{ color: profile.bio?.trim() ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)' }}>
              {profile.bio?.trim() ? profile.bio : 'No bio yet'}
            </p>
          </SectionCard>

          {!!profile.prompts?.length && (
            <SectionCard>
              <SectionHeading label="Get To Know Me" section="getToKnow" />
              <div className="flex flex-col gap-3">
                {profile.prompts.map((p) => (
                  <PromptReadCard key={p.id} prompt={p} />
                ))}
              </div>
            </SectionCard>
          )}

          <SectionCard>
            <SectionHeading label="Loves to Play" section="lovesToPlay" />
            {profile.games.filter((g) => gameTypeIcons[g]).length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {profile.games.filter((g) => gameTypeIcons[g]).map((g) => (
                  <div
                    key={g}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <img src={gameTypeIcons[g]} alt="" className="w-6 h-6 object-contain" draggable={false} />
                    <span className="font-body text-ui-caption" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {gameTypeLabels[g] || g}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-body text-ui-body mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
                No game types selected
              </p>
            )}
            {profile.favoriteGames.length > 0 && (
              <>
                <p className="font-body text-ui-label font-bold mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  FAVOURITE GAMES
                </p>
                <div className="flex flex-col gap-1.5">
                  {profile.favoriteGames.map((g) => (
                    <div
                      key={g}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <img src="/game-icons/Video%20games.png" alt="" className="w-5 h-5 object-contain flex-shrink-0" draggable={false} />
                      <span className="font-body text-ui-body" style={{ color: 'rgba(255,255,255,0.7)' }}>{g}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </SectionCard>

          <SectionCard>
            <SectionHeading label="What Are You Looking For?" section="lookingFor" />
            <div
              className="flex items-center gap-3 px-3 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <img src={INTENT_UI[intent].icon} alt="" className="w-6 h-6 object-contain flex-shrink-0" draggable={false} />
              <div>
                <p className="font-body text-ui-body font-bold" style={{ color: intentColors[intent] }}>
                  {INTENT_UI[intent].label}
                </p>
                <p className="font-body text-ui-caption" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {intentDescriptions[intent]}
                </p>
              </div>
            </div>
            {intent !== 'play' && (
              <div className="mt-3">
                {relationshipGoals.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {relationshipGoals.map((id) => {
                      const color = goalColors[id] || '#4EFFC4';
                      return (
                        <div
                          key={id}
                          className="px-3 py-2 rounded-lg font-body text-ui-body font-bold"
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
                  <p className="font-body text-ui-body" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    No relationship goals selected yet
                  </p>
                )}
              </div>
            )}
          </SectionCard>

          <SectionCard>
            <SectionHeading label="Lifestyle" section="lifestyle" />
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.entries(lifestyle) as [keyof typeof lifestyle, string][]).map(([key, val]) => (
                <div
                  key={key}
                  className="rounded-lg p-2 flex flex-col items-start gap-1 min-h-[82px]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <img src={lifestyleIcons[key]} alt="" width={32} height={32} className="object-contain" draggable={false} />
                  <p className="font-body text-ui-body leading-none" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {lifestyleLabels[key]}
                  </p>
                  <p className="font-body text-ui-label font-bold leading-tight line-clamp-2" style={{ color: val ? '#FFFFFF' : 'rgba(255,255,255,0.7)' }}>
                    {val || 'Not set'}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {onAction && actionVariant === 'discover' && (
        <div className="fixed bottom-0 left-0 right-0 flex gap-3 px-5 py-4 z-10"
          style={{ background: 'rgba(12,12,28,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <motion.button type="button" onClick={() => onAction('left')} className="flex-1 py-4 rounded-2xl font-display text-lg"
            style={{ background: 'rgba(255,61,113,0.12)', border: '2px solid rgba(255,61,113,0.4)', color: '#FF3D71' }} whileTap={{ scale: 0.95 }}>
            Pass
          </motion.button>
          <motion.button type="button" onClick={() => onAction('right')} className="flex-1 py-4 rounded-2xl font-display text-lg"
            style={{ background: 'rgba(78,255,196,0.12)', border: '2px solid rgba(78,255,196,0.4)', color: '#4EFFC4' }} whileTap={{ scale: 0.95 }}>
            Like
          </motion.button>
        </div>
      )}
      {onAction && actionVariant === 'challenge' && (
        <div className="fixed bottom-0 left-0 right-0 px-5 py-4 z-10"
          style={{ background: 'rgba(12,12,28,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <motion.button
            type="button"
            onClick={() => onAction('right')}
            className="w-full py-4 rounded-2xl font-display font-extrabold text-base relative overflow-hidden"
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
      )}
    </motion.div>
  );
}
