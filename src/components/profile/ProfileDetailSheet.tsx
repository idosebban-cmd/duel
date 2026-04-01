import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserPrompt } from '../../store/onboardingStore';
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
  intent?: IntentValue;
  lookingFor: string;
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
  word: '/game-icons/Word%20games.png',
  board: '/game-icons/Boardgames.png',
  video: '/game-icons/Video%20games.png',
  party: '/game-icons/Party%20games.png',
  strategy: '/game-icons/Strategy.png',
  drawing: '/game-icons/Drawing%20%26%20Creative.png',
  puzzles: '/game-icons/Puzzles.png',
  card: '/game-icons/Card%20games.png',
};

const gameTypeLabels: Record<string, string> = {
  trivia: 'Trivia', word: 'Word', board: 'Board', video: 'Video',
  party: 'Party', strategy: 'Strategy', drawing: 'Drawing',
  puzzles: 'Puzzles', card: 'Card',
};

const lookingForColors: Record<string, string> = {
  casual: '#FF3D71', 'short-term': '#FF9F1C',
  'long-term': '#4EFFC4', 'not-sure': '#B565FF', open: '#FFE66D',
};

const lookingForLabels: Record<string, string> = {
  casual: 'Something casual', 'short-term': 'Short-term fun',
  'long-term': 'Long-term', 'not-sure': 'Not sure yet', open: 'Open to anything',
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

function Divider() {
  return <div className="my-5" style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />;
}

function StatRow({ iconKey, label, value }: { iconKey: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <img src={lifestyleIcons[iconKey]} alt="" className="w-5 h-5 object-contain" draggable={false} />
      </div>
      <span className="font-body text-ui-body flex-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
      <span className="font-body text-ui-body font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>{value}</span>
    </div>
  );
}

export function ProfileDetailSheet({
  profile,
  photoUrls,
  onClose,
  onAction,
  actionVariant = 'discover',
  onOpenSafetyMenu,
}: {
  profile: ProfileDetailData;
  photoUrls?: string[];
  onClose: () => void;
  onAction?: (dir: 'left' | 'right') => void;
  actionVariant?: 'discover' | 'challenge';
  /** When set, shows a … control in the header (block/report). */
  onOpenSafetyMenu?: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const lfColor = lookingForColors[profile.lookingFor] ?? '#4EFFC4';

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

  return (
    <motion.div className="fixed inset-0 z-30 flex flex-col"
      style={{ background: '#12122A' }} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
      <div className="flex-none flex items-center gap-2 px-4 pt-safe pt-3 pb-3 z-10"
        style={{ background: 'rgba(18,18,42,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <motion.button onClick={onClose} className="flex items-center gap-1.5 font-body font-bold text-ui-body flex-shrink-0"
          style={{ color: 'rgba(255,255,255,0.55)' }} whileTap={{ scale: 0.92 }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 5L7.5 10L12.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </motion.button>
        <div className="flex-1 flex justify-center min-w-0">
          {!!profile.distance && (
            <span className="font-body text-ui-label font-bold truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{profile.distance}</span>
          )}
        </div>
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

      <div className="flex-1 overflow-y-auto pb-24" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <div className="relative w-full select-none" style={{ height: 260, background: '#0A0A1E' }}>
          <AnimatePresence mode="wait">
            <motion.div key={slides[idx].key} className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <img src={slides[idx].img} alt="" className={`h-full w-full ${hasUploadedPhotos ? 'object-cover' : 'object-contain'}`}
                draggable={false}
                style={hasUploadedPhotos ? { filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.45))' } : { padding: 24, filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.8))' }} />
            </motion.div>
          </AnimatePresence>
          <button className="absolute left-0 top-0 w-1/2 h-full z-10" onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)} aria-label="Previous photo" />
          <button className="absolute right-0 top-0 w-1/2 h-full z-10" onClick={() => setIdx((i) => (i + 1) % slides.length)} aria-label="Next photo" />
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
          {!!profile.location && <div className="flex items-center gap-1.5 mb-3 font-body text-ui-body" style={{ color: 'rgba(255,255,255,0.45)' }}>{profile.location}</div>}
          <div className="flex flex-wrap gap-2 mb-1">
            {profile.intent && (
              <span className="font-body text-ui-label font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <img src={INTENT_UI[profile.intent].icon} alt="" className="w-4 h-4 object-contain" draggable={false} />
                {INTENT_UI[profile.intent].label}
              </span>
            )}
            <span className="font-body text-ui-label font-bold px-3 py-1.5 rounded-full"
              style={{ background: `${lfColor}1E`, color: lfColor, border: `1.5px solid ${lfColor}4A` }}>
              {lookingForLabels[profile.lookingFor] ?? profile.lookingFor}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {[
              { img: characterImages[profile.character] ?? '/characters/Ghost.png', label: cap(profile.character) },
              { img: elementImages[profile.element] ?? '/elements/Fire.png', label: elementLabels[profile.element] ?? cap(profile.element) },
              { img: affiliationImages[profile.affiliation] ?? '/affiliation/City.png', label: affiliationLabels[profile.affiliation] ?? cap(profile.affiliation) },
            ].map(({ img, label }) => (
              <div key={label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <img src={img} alt="" className="w-5 h-5 object-contain" draggable={false} />
                <span className="font-body text-ui-label font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 pt-5"><Divider /><h2 className="font-display text-lg mb-3" style={{ color: '#4EFFC4' }}>ABOUT</h2>
          <p className="font-body text-ui-body leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>{profile.bio}</p></div>

        {!!profile.prompts?.length && (
          <div className="px-5 pt-5"><Divider /><h2 className="font-display text-lg mb-4" style={{ color: '#00F5FF' }}>GET TO KNOW ME</h2>
            <div className="flex flex-col gap-3">{profile.prompts.map((p) => (
              <div key={p.id} className="rounded-xl p-4" style={{ background: '#0A0A1E', border: '2px solid rgba(78,255,196,0.3)' }}>
                <div className="flex items-center gap-2 mb-2"><span className="text-lg">{p.icon}</span><p className="font-body text-ui-caption leading-snug" style={{ color: 'rgba(255,255,255,0.7)' }}>{p.question}</p></div>
                <p className="font-display text-base leading-snug" style={{ color: '#FFFFFF' }}>{p.answer}</p>
              </div>
            ))}</div>
          </div>
        )}

        <div className="px-5 pt-5"><Divider /><h2 className="font-display text-lg mb-1" style={{ color: '#B565FF' }}>THE BASICS</h2>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <StatRow iconKey="kids" label="Kids" value={profile.kids} />
            <StatRow iconKey="drinking" label="Drinking" value={profile.drinking} />
            <StatRow iconKey="smoking" label="Smoking" value={profile.smoking} />
            <StatRow iconKey="cannabis" label="Cannabis" value={profile.cannabis} />
            <StatRow iconKey="pets" label="Pets" value={profile.pets} />
            <StatRow iconKey="exercise" label="Exercise" value={profile.exercise} />
          </div>
        </div>

        <div className="px-5 pt-5 pb-8"><Divider /><h2 className="font-display text-lg mb-4" style={{ color: '#FF6BA8' }}>LOVES TO PLAY</h2>
          {profile.games.filter((g) => gameTypeIcons[g]).length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {profile.games.filter((g) => gameTypeIcons[g]).map((game) => (
                <div key={game} className="flex flex-col items-center gap-1.5 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <img src={gameTypeIcons[game]} alt={game} className="w-8 h-8 object-contain" draggable={false} />
                  <span className="font-body text-ui-label font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>{gameTypeLabels[game] ?? game}</span>
                </div>
              ))}
            </div>
          )}
          {profile.favoriteGames.length > 0 && (
            <div>
              <p className="font-body text-ui-caption mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>Favourite games</p>
              <div className="flex flex-wrap gap-2">
                {profile.favoriteGames.map((g) => (
                  <span key={g} className="font-body text-ui-caption px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(255,230,109,0.08)', color: '#FFE66D', border: '1px solid rgba(255,230,109,0.25)' }}>{g}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {onAction && actionVariant === 'discover' && (
        <div className="fixed bottom-0 left-0 right-0 flex gap-3 px-5 py-4 z-10"
          style={{ background: 'rgba(12,12,28,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <motion.button onClick={() => onAction('left')} className="flex-1 py-4 rounded-2xl font-display text-lg"
            style={{ background: 'rgba(255,61,113,0.12)', border: '2px solid rgba(255,61,113,0.4)', color: '#FF3D71' }} whileTap={{ scale: 0.95 }}>
            Pass
          </motion.button>
          <motion.button onClick={() => onAction('right')} className="flex-1 py-4 rounded-2xl font-display text-lg"
            style={{ background: 'rgba(78,255,196,0.12)', border: '2px solid rgba(78,255,196,0.4)', color: '#4EFFC4' }} whileTap={{ scale: 0.95 }}>
            Like
          </motion.button>
        </div>
      )}
      {onAction && actionVariant === 'challenge' && (
        <div className="fixed bottom-0 left-0 right-0 px-5 py-4 z-10"
          style={{ background: 'rgba(12,12,28,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <motion.button
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
