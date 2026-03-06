import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '../store/onboardingStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: number;
  name: string;
  age: number;
  location: string;
  distance: string;
  character: string;
  element: string;
  affiliation: string;
  bio: string;
  games: string[];
  lookingFor: string;
  willMatch: boolean;
}

// ─── Image maps ───────────────────────────────────────────────────────────────

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

const lookingForColors: Record<string, string> = {
  casual: '#FF3D71', 'short-term': '#FF9F1C',
  'long-term': '#4EFFC4', 'not-sure': '#B565FF', open: '#FFE66D',
};

const lookingForLabels: Record<string, string> = {
  casual: 'Something casual', 'short-term': 'Short-term fun',
  'long-term': 'Long-term', 'not-sure': 'Not sure yet', open: 'Open to anything',
};

// ─── Profile data (30 fake UK profiles, ~20% willMatch) ──────────────────────

const PROFILES: Profile[] = [
  { id: 1,  name: 'Zara',    age: 26, location: 'Shoreditch',       distance: '0.8 mi', character: 'fox',     element: 'fire',    affiliation: 'art',      bio: "Muralist by day, trivia queen by night. Will destroy you at board games then buy you a pint.",              games: ['trivia', 'drawing', 'party'],    lookingFor: 'casual',     willMatch: true  },
  { id: 2,  name: 'Marcus',  age: 29, location: 'Hackney',          distance: '1.2 mi', character: 'wolf',    element: 'electric', affiliation: 'music',   bio: "DJ & producer. My love language is sending playlists and losing to you at Scrabble.",                     games: ['word', 'party', 'trivia'],       lookingFor: 'open',       willMatch: false },
  { id: 3,  name: 'Priya',   age: 24, location: 'Dalston',          distance: '1.5 mi', character: 'unicorn', element: 'water',   affiliation: 'academia', bio: "PhD in cognitive science. I study why people make bad decisions — including mine joining a dating app.",  games: ['strategy', 'trivia', 'puzzles'], lookingFor: 'long-term',  willMatch: false },
  { id: 4,  name: 'Jake',    age: 27, location: 'Peckham',          distance: '2.1 mi', character: 'bear',    element: 'earth',   affiliation: 'fitness',  bio: "Personal trainer with a soft spot for terrible puns and competitive Tetris.",                             games: ['video', 'party', 'strategy'],    lookingFor: 'short-term', willMatch: false },
  { id: 5,  name: 'Isla',    age: 25, location: 'Brixton',          distance: '2.4 mi', character: 'pixie',   element: 'air',     affiliation: 'nature',   bio: "Plant mum and weekend wild swimmer. I play Wordle every morning and take it very seriously.",              games: ['word', 'puzzles', 'board'],      lookingFor: 'open',       willMatch: false },
  { id: 6,  name: 'Theo',    age: 28, location: 'Bermondsey',       distance: '2.9 mi', character: 'robot',   element: 'electric', affiliation: 'tech',    bio: "Software engineer by day, chef by evening. I feel bad when I win. I always win.",                         games: ['word', 'strategy', 'trivia'],    lookingFor: 'long-term',  willMatch: true  },
  { id: 7,  name: 'Sofia',   age: 23, location: 'Bethnal Green',    distance: '1.1 mi', character: 'mermaid', element: 'water',   affiliation: 'music',    bio: "Classically trained violinist who secretly loves rhythm games. My cat is named Beethoven.",                games: ['party', 'trivia', 'drawing'],    lookingFor: 'casual',     willMatch: false },
  { id: 8,  name: 'Luca',    age: 31, location: 'Islington',        distance: '3.3 mi', character: 'lion',    element: 'fire',    affiliation: 'travel',   bio: "Architect + amateur chef. Cooking is my love language but I'll destroy you at chess first.",                games: ['strategy', 'board', 'trivia'],   lookingFor: 'long-term',  willMatch: false },
  { id: 9,  name: 'Amara',   age: 26, location: 'Lewisham',         distance: '4.2 mi', character: 'phoenix', element: 'fire',    affiliation: 'art',      bio: "Fashion designer and Scrabble obsessive. I make all my own clothes and all my own moves.",                 games: ['word', 'drawing', 'party'],      lookingFor: 'open',       willMatch: false },
  { id: 10, name: 'Finn',    age: 27, location: 'Clapham',          distance: '3.8 mi', character: 'owl',     element: 'air',     affiliation: 'academia', bio: "History teacher who knows useless facts about everything. I will name-drop pub quiz wins.",               games: ['trivia', 'strategy', 'board'],   lookingFor: 'short-term', willMatch: false },
  { id: 11, name: 'Mei',     age: 24, location: 'Soho',             distance: '2.0 mi', character: 'cat',     element: 'water',   affiliation: 'art',      bio: "Tattoo artist and Mahjong champion. I drink too much matcha and win too many games.",                    games: ['board', 'drawing', 'party'],     lookingFor: 'casual',     willMatch: true  },
  { id: 12, name: 'Ravi',    age: 29, location: 'Walthamstow',      distance: '5.1 mi', character: 'dragon',  element: 'fire',    affiliation: 'tech',     bio: "Startup founder who stress-bakes sourdough. Competitive at games, terrible at chess.",                    games: ['strategy', 'video', 'trivia'],   lookingFor: 'open',       willMatch: false },
  { id: 13, name: 'Nadia',   age: 25, location: 'Hackney Wick',     distance: '1.9 mi', character: 'witch',   element: 'earth',   affiliation: 'nature',   bio: "Herbalist, forager, and extremely petty about Wordle. I will brag about my streak.",                      games: ['word', 'puzzles', 'trivia'],     lookingFor: 'long-term',  willMatch: false },
  { id: 14, name: 'Oscar',   age: 30, location: 'Fulham',           distance: '5.6 mi', character: 'knight',  element: 'earth',   affiliation: 'fitness',  bio: "Rugby coach and podcast host. I talk too much about tactics on the pitch and in Settlers of Catan.",      games: ['strategy', 'board', 'party'],    lookingFor: 'casual',     willMatch: false },
  { id: 15, name: 'Yuki',    age: 23, location: 'Shoreditch',       distance: '0.6 mi', character: 'ninja',   element: 'air',     affiliation: 'cosmic',   bio: "UX designer and astrology sceptic who reads their chart daily. Very fast at reaction games.",             games: ['video', 'party', 'puzzles'],     lookingFor: 'not-sure',   willMatch: false },
  { id: 16, name: 'Ellie',   age: 27, location: 'Greenwich',        distance: '4.7 mi', character: 'ghost',   element: 'air',     affiliation: 'academia', bio: "Marine biologist who loves escape rooms. I find every clue and celebrate loudly.",                       games: ['puzzles', 'trivia', 'board'],    lookingFor: 'long-term',  willMatch: false },
  { id: 17, name: 'Dean',    age: 32, location: 'Camberwell',       distance: '3.5 mi', character: 'viking',  element: 'earth',   affiliation: 'travel',   bio: "Travel writer. 60+ countries. Looking for someone to lose to me at cards in an airport.",                 games: ['card', 'trivia', 'word'],        lookingFor: 'open',       willMatch: false },
  { id: 18, name: 'Aisha',   age: 26, location: 'Tottenham',        distance: '6.3 mi', character: 'unicorn', element: 'water',   affiliation: 'music',    bio: "Songwriter and escape room enthusiast. My highs are when I finish a puzzle. My lows: when you beat me.",  games: ['puzzles', 'word', 'party'],      lookingFor: 'casual',     willMatch: false },
  { id: 19, name: 'Callum',  age: 28, location: 'Stoke Newington',  distance: '2.8 mi', character: 'fox',     element: 'electric', affiliation: 'city',    bio: "Graphic novelist and obscure board game collector. 97 games. I make you play the worst one first.",       games: ['board', 'strategy', 'drawing'],  lookingFor: 'long-term',  willMatch: true  },
  { id: 20, name: 'Nour',    age: 24, location: 'Elephant & Castle', distance: '3.0 mi', character: 'mermaid', element: 'water',  affiliation: 'art',      bio: "Ceramicist and compulsive redecorator. I play games the same way I make pottery — very intensely.",       games: ['drawing', 'puzzles', 'word'],    lookingFor: 'not-sure',   willMatch: false },
  { id: 21, name: 'Elliot',  age: 29, location: 'Whitechapel',      distance: '0.9 mi', character: 'robot',   element: 'electric', affiliation: 'tech',    bio: "Data scientist who makes memes. Strong opinions about board game mechanics, mild opinions about everything else.", games: ['strategy', 'trivia', 'video'], lookingFor: 'open',       willMatch: false },
  { id: 22, name: 'Temi',    age: 25, location: 'Stockwell',        distance: '4.0 mi', character: 'lion',    element: 'fire',    affiliation: 'fitness',  bio: "Dancer and personal trainer. Competitive games. Zero chill when winning.",                                 games: ['party', 'video', 'trivia'],      lookingFor: 'casual',     willMatch: false },
  { id: 23, name: 'Sasha',   age: 27, location: 'Clapton',          distance: '2.3 mi', character: 'owl',     element: 'earth',   affiliation: 'nature',   bio: "Wildlife photographer and Wordle champion. My photos are in two galleries and one GP waiting room.",      games: ['word', 'puzzles', 'trivia'],     lookingFor: 'long-term',  willMatch: false },
  { id: 24, name: 'Alex',    age: 26, location: 'Bermondsey',       distance: '2.7 mi', character: 'phoenix', element: 'fire',    affiliation: 'city',     bio: "Barista + trained sommelier. My tongue identifies 40+ flavours but I still cheat at trivia nights.",      games: ['trivia', 'board', 'word'],       lookingFor: 'open',       willMatch: false },
  { id: 25, name: 'Jade',    age: 23, location: 'Hoxton',           distance: '0.5 mi', character: 'pixie',   element: 'air',     affiliation: 'art',      bio: "Illustrator who draws fan art of her friends. Will draw you as an anime character after our first game.",  games: ['drawing', 'party', 'word'],      lookingFor: 'casual',     willMatch: true  },
  { id: 26, name: 'Harry',   age: 30, location: 'Clapham',          distance: '4.4 mi', character: 'bear',    element: 'earth',   affiliation: 'country',  bio: "Landscape architect who moonlights as a competitive chess player. Parks and pawns are my personality.",    games: ['strategy', 'board', 'trivia'],   lookingFor: 'long-term',  willMatch: false },
  { id: 27, name: 'Kezia',   age: 25, location: 'Forest Gate',      distance: '5.8 mi', character: 'witch',   element: 'water',   affiliation: 'cosmic',   bio: "Astrologer and card game shark. I'll read your chart then hustle you at Poker. In that order.",            games: ['card', 'party', 'trivia'],       lookingFor: 'not-sure',   willMatch: false },
  { id: 28, name: 'Samir',   age: 28, location: 'Kilburn',          distance: '5.2 mi', character: 'dragon',  element: 'fire',    affiliation: 'travel',   bio: "Filmmaker and terrible loser (working on it). Best dates involve dark rooms and good stories.",             games: ['trivia', 'word', 'party'],       lookingFor: 'open',       willMatch: false },
  { id: 29, name: 'Rosa',    age: 24, location: 'Brixton',          distance: '2.6 mi', character: 'cat',     element: 'electric', affiliation: 'music',   bio: "Music journalist and rhythm game addict. I review concerts for a living and lose at Guitar Hero for fun.", games: ['party', 'video', 'word'],        lookingFor: 'casual',     willMatch: false },
  { id: 30, name: 'Ben',     age: 31, location: 'Aldgate',          distance: '1.3 mi', character: 'knight',  element: 'earth',   affiliation: 'academia', bio: "Medieval historian and escape room designer. I literally build the puzzles you play. Good luck.",          games: ['puzzles', 'strategy', 'board'],  lookingFor: 'long-term',  willMatch: true  },
];

// ─── Profile card content ─────────────────────────────────────────────────────

function ProfileCard({ profile }: { profile: Profile }) {
  const lfColor = lookingForColors[profile.lookingFor] ?? '#4EFFC4';
  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(175deg, #1C1C3E 0%, #12122A 100%)',
        border: '2px solid rgba(255,255,255,0.1)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
      }}
    >
      {/* Avatar area */}
      <div className="relative flex-shrink-0" style={{ height: '54%', background: '#0E0E22' }}>
        <img
          src={characterImages[profile.character] ?? '/characters/Ghost.png'}
          alt={profile.character}
          className="w-full h-full object-contain"
          draggable={false}
          style={{ padding: '10px', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.7))' }}
        />
        {/* Distance */}
        <div
          className="absolute top-3 right-3 px-2.5 py-1 rounded-full font-body text-xs font-bold"
          style={{ background: 'rgba(0,0,0,0.65)', color: '#4EFFC4', border: '1px solid rgba(78,255,196,0.35)' }}
        >
          {profile.distance}
        </div>
        {/* Element badge */}
        <div
          className="absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', border: '1.5px solid rgba(255,255,255,0.2)' }}
        >
          <img src={elementImages[profile.element]} alt="" className="w-5 h-5 object-contain" draggable={false} />
        </div>
        {/* Affiliation badge */}
        <div
          className="absolute bottom-3 left-3 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', border: '1.5px solid rgba(255,255,255,0.2)' }}
        >
          <img src={affiliationImages[profile.affiliation]} alt="" className="w-5 h-5 object-contain" draggable={false} />
        </div>
      </div>

      {/* Info area */}
      <div className="flex-1 px-4 pt-3 pb-3 flex flex-col gap-1.5 min-h-0">
        {/* Name + age */}
        <div className="flex items-baseline gap-2">
          <span
            className="font-display text-2xl leading-none"
            style={{ color: '#FFE66D', textShadow: '0 0 10px rgba(255,230,109,0.5)' }}
          >
            {profile.name}
          </span>
          <span className="font-body font-bold text-lg" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {profile.age}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1 font-body text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <svg width="9" height="11" viewBox="0 0 9 11" fill="none">
            <path
              d="M4.5 0C2.57 0 1 1.57 1 3.5C1 6.12 4.5 11 4.5 11C4.5 11 8 6.12 8 3.5C8 1.57 6.43 0 4.5 0ZM4.5 4.75C3.81 4.75 3.25 4.19 3.25 3.5C3.25 2.81 3.81 2.25 4.5 2.25C5.19 2.25 5.75 2.81 5.75 3.5C5.75 4.19 5.19 4.75 4.5 4.75Z"
              fill="currentColor"
            />
          </svg>
          {profile.location}
        </div>

        {/* Bio */}
        <p
          className="font-body text-xs leading-relaxed overflow-hidden"
          style={{ color: 'rgba(255,255,255,0.6)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}
        >
          {profile.bio}
        </p>

        {/* Game icons */}
        <div className="flex items-center gap-1.5">
          {profile.games.slice(0, 3).map((game) => (
            <div
              key={game}
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <img src={gameTypeIcons[game]} alt={game} className="w-4 h-4 object-contain" draggable={false} />
            </div>
          ))}
        </div>

        {/* Looking for */}
        <div className="mt-auto">
          <span
            className="font-body text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              background: `${lfColor}22`,
              color: lfColor,
              border: `1px solid ${lfColor}44`,
            }}
          >
            {lookingForLabels[profile.lookingFor]}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Background card (static, shows depth) ───────────────────────────────────

function BackgroundCard({ profile, stackIndex }: { profile: Profile; stackIndex: 1 | 2 }) {
  const scale = stackIndex === 1 ? 0.96 : 0.92;
  const yPx = stackIndex === 1 ? 12 : 24;
  return (
    <div
      className="absolute inset-0"
      style={{ transform: `scale(${scale}) translateY(${yPx}px)`, transformOrigin: 'center bottom' }}
    >
      <ProfileCard profile={profile} />
    </div>
  );
}

// ─── Top (draggable) card ─────────────────────────────────────────────────────

function TopCard({
  profile,
  swipeCommand,
  onCommandConsumed,
  onSwipeStart,
  onSwipe,
  disabled,
}: {
  profile: Profile;
  swipeCommand: 'left' | 'right' | null;
  onCommandConsumed: () => void;
  onSwipeStart: () => void;
  onSwipe: (dir: 'left' | 'right') => void;
  disabled: boolean;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-20, 20]);
  const likeOpacity = useTransform(x, [20, 80], [0, 1]);
  const nopeOpacity = useTransform(x, [-20, -80], [0, 1]);

  // Programmatic swipe from buttons
  useEffect(() => {
    if (!swipeCommand) return;
    onCommandConsumed();
    const exitX = swipeCommand === 'right' ? 750 : -750;
    animate(x, exitX, { type: 'tween', duration: 0.28, ease: [0.32, 0, 0.67, 0] });
    const t = window.setTimeout(() => onSwipe(swipeCommand), 280);
    return () => window.clearTimeout(t);
  }, [swipeCommand]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragEnd = (_: unknown, info: { velocity: { x: number } }) => {
    const dx = x.get();
    const vx = info.velocity.x;
    if (dx > 80 || vx > 500) {
      onSwipeStart();
      animate(x, 750, { type: 'tween', duration: 0.28 });
      window.setTimeout(() => onSwipe('right'), 280);
    } else if (dx < -80 || vx < -500) {
      onSwipeStart();
      animate(x, -750, { type: 'tween', duration: 0.28 });
      window.setTimeout(() => onSwipe('left'), 280);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 35 });
    }
  };

  return (
    <motion.div
      className="absolute inset-0 select-none"
      style={{ x, rotate, cursor: disabled ? 'default' : 'grab' }}
      drag={disabled ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
    >
      {/* LIKE stamp */}
      <motion.div
        className="absolute top-6 right-5 z-20 font-display text-2xl border-[3px] rounded-xl px-3 py-0.5 pointer-events-none"
        style={{
          opacity: likeOpacity,
          color: '#4EFFC4',
          borderColor: '#4EFFC4',
          textShadow: '0 0 15px rgba(78,255,196,0.7)',
          rotate: -15,
        }}
      >
        LIKE
      </motion.div>

      {/* NOPE stamp */}
      <motion.div
        className="absolute top-6 left-5 z-20 font-display text-2xl border-[3px] rounded-xl px-3 py-0.5 pointer-events-none"
        style={{
          opacity: nopeOpacity,
          color: '#FF6BA8',
          borderColor: '#FF6BA8',
          textShadow: '0 0 15px rgba(255,107,168,0.7)',
          rotate: 15,
        }}
      >
        NOPE
      </motion.div>

      <ProfileCard profile={profile} />
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      className="flex flex-col items-center gap-6 text-center px-6"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <motion.div
        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img src="/icons/Star.png" alt="" className="w-16 h-16 object-contain" draggable={false}
          style={{ filter: 'drop-shadow(0 0 12px rgba(255,230,109,0.7))' }} />
      </motion.div>
      <div>
        <p className="font-display text-3xl mb-2" style={{ color: '#FFE66D', textShadow: '0 0 15px rgba(255,230,109,0.6)' }}>
          GAME OVER
        </p>
        <p className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
          You've seen everyone nearby.
        </p>
      </div>
      <button
        onClick={onReset}
        className="font-body font-bold text-sm px-6 py-3 rounded-xl"
        style={{
          background: 'linear-gradient(135deg, #4EFFC4 0%, #B565FF 100%)',
          color: '#12122A',
          boxShadow: '0 0 20px rgba(78,255,196,0.35), 4px 4px 0 rgba(0,0,0,0.3)',
        }}
      >
        INSERT COIN AGAIN →
      </button>
    </motion.div>
  );
}

// ─── Match modal ──────────────────────────────────────────────────────────────

function MatchModal({
  matchProfile,
  userCharacter,
  onDismiss,
  onPlay,
}: {
  matchProfile: Profile;
  userCharacter: string;
  onDismiss: () => void;
  onPlay: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDismiss}
    >
      <motion.div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden px-6 pt-8 pb-8 text-center"
        style={{
          background: 'linear-gradient(175deg, #1C1C3E 0%, #12122A 100%)',
          border: '2px solid rgba(255,255,255,0.12)',
          boxShadow: '0 0 60px rgba(78,255,196,0.2)',
        }}
        initial={{ scale: 0.6, y: 60, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow orb */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(78,255,196,0.08) 0%, transparent 70%)',
        }} />

        {/* Title */}
        <motion.div
          className="font-display text-4xl leading-none mb-1"
          style={{ color: '#4EFFC4', textShadow: '0 0 30px rgba(78,255,196,0.9), 0 0 60px rgba(78,255,196,0.4)' }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          IT'S A MATCH!
        </motion.div>
        <p className="font-body text-sm mb-7" style={{ color: 'rgba(255,255,255,0.5)' }}>
          You and {matchProfile.name} liked each other
        </p>

        {/* Avatars */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <motion.div
            className="w-24 h-24 rounded-full overflow-hidden border-4 flex-shrink-0"
            style={{ borderColor: '#4EFFC4', boxShadow: '0 0 20px rgba(78,255,196,0.5)', background: '#0E0E22' }}
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <img
              src={characterImages[userCharacter] ?? '/characters/Ghost.png'}
              alt="you"
              className="w-full h-full object-contain p-2"
              draggable={false}
            />
          </motion.div>

          <motion.div
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
          >
            <img src="/icons/Heart.png" alt="" className="w-9 h-9 object-contain" draggable={false}
              style={{ filter: 'drop-shadow(0 0 10px rgba(255,107,168,0.8))' }} />
          </motion.div>

          <motion.div
            className="w-24 h-24 rounded-full overflow-hidden border-4 flex-shrink-0"
            style={{ borderColor: '#FF6BA8', boxShadow: '0 0 20px rgba(255,107,168,0.5)', background: '#0E0E22' }}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <img
              src={characterImages[matchProfile.character] ?? '/characters/Ghost.png'}
              alt={matchProfile.name}
              className="w-full h-full object-contain p-2"
              draggable={false}
            />
          </motion.div>
        </div>

        {/* Buttons */}
        <motion.button
          onClick={onPlay}
          className="w-full py-4 rounded-xl font-display text-xl mb-3"
          style={{
            background: 'linear-gradient(135deg, #4EFFC4 0%, #B565FF 100%)',
            color: '#12122A',
            boxShadow: '0 0 24px rgba(78,255,196,0.4), 4px 4px 0 rgba(0,0,0,0.35)',
            border: '3px solid rgba(255,255,255,0.2)',
          }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          PLAY NOW ▶
        </motion.button>
        <button
          onClick={onDismiss}
          className="w-full py-2 font-body font-bold text-sm"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          Maybe Later
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Bottom nav ───────────────────────────────────────────────────────────────

function BottomNav({ onProfile, onMatches }: { onProfile: () => void; onMatches: () => void }) {
  return (
    <nav
      className="flex-none flex items-stretch border-t"
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(14,14,34,0.97)' }}
    >
      {/* Matches */}
      <button
        className="flex-1 flex flex-col items-center justify-center gap-1 py-3"
        onClick={onMatches}
        style={{ color: 'rgba(255,255,255,0.35)' }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 19.25C11 19.25 2.75 14.667 2.75 9.167C2.75 6.728 4.728 4.75 7.167 4.75C8.574 4.75 9.828 5.4 10.657 6.427L11 6.844L11.343 6.427C12.172 5.4 13.426 4.75 14.833 4.75C17.272 4.75 19.25 6.728 19.25 9.167C19.25 14.667 11 19.25 11 19.25Z" fill="currentColor"/>
        </svg>
        <span className="font-body text-xs">Matches</span>
      </button>

      {/* Discover (active) */}
      <button
        className="flex-1 flex flex-col items-center justify-center gap-1 py-3"
        style={{ color: '#4EFFC4' }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="8.25" stroke="currentColor" strokeWidth="1.75"/>
          <path d="M14.85 7.15L12.35 12.35L7.15 14.85L9.65 9.65L14.85 7.15Z" fill="currentColor"/>
        </svg>
        <span className="font-body text-xs font-bold">Discover</span>
      </button>

      {/* Profile */}
      <button
        className="flex-1 flex flex-col items-center justify-center gap-1 py-3"
        onClick={onProfile}
        style={{ color: 'rgba(255,255,255,0.35)' }}
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

// ─── Main screen ──────────────────────────────────────────────────────────────

export function DiscoverScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchProfile, setMatchProfile] = useState<Profile | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [swipeCommand, setSwipeCommand] = useState<'left' | 'right' | null>(null);
  const navigate = useNavigate();
  const { character } = useOnboardingStore();

  const remaining = PROFILES.length - currentIndex;
  const showEmpty = currentIndex >= PROFILES.length;

  const handleSwipe = (dir: 'left' | 'right') => {
    const profile = PROFILES[currentIndex];
    setCurrentIndex((i) => i + 1);
    setDisabled(false);
    if (dir === 'right' && profile.willMatch) {
      // Small delay so card finishes flying off before modal appears
      window.setTimeout(() => setMatchProfile(profile), 100);
    }
  };

  const executeButtonSwipe = (dir: 'left' | 'right') => {
    if (disabled || showEmpty) return;
    setDisabled(true);
    setSwipeCommand(dir);
  };

  const stackDepth = Math.min(remaining, 3);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#12122A' }}>
      {/* Scanlines overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-40 opacity-[0.025]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,1) 3px, rgba(255,255,255,1) 4px)',
        }}
      />

      {/* Header */}
      <header className="flex-none flex items-center justify-between px-5 pt-5 pb-3">
        <div
          className="font-display text-2xl"
          style={{ color: '#FFE66D', textShadow: '0 0 16px rgba(255,230,109,0.65), 4px 4px 0 rgba(0,0,0,0.4)' }}
        >
          DUEL
        </div>
        <div className="flex items-center gap-2.5">
          {!showEmpty && (
            <span className="font-body text-xs font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {remaining} nearby
            </span>
          )}
          <div
            className="w-9 h-9 rounded-full overflow-hidden border-2 flex-shrink-0"
            style={{ borderColor: '#4EFFC4', background: '#0E0E22', boxShadow: '0 0 10px rgba(78,255,196,0.35)' }}
          >
            {character ? (
              <img src={characterImages[character]} alt="" className="w-full h-full object-contain p-0.5" draggable={false} />
            ) : (
              <div className="w-full h-full" style={{ background: 'rgba(78,255,196,0.2)' }} />
            )}
          </div>
        </div>
      </header>

      {/* Card stack */}
      <div className="flex-1 flex items-center justify-center px-5 overflow-hidden">
        {showEmpty ? (
          <EmptyState onReset={() => { setCurrentIndex(0); setDisabled(false); }} />
        ) : (
          <div className="relative w-full" style={{ maxWidth: 340, height: 460 }}>
            {stackDepth >= 3 && (
              <BackgroundCard profile={PROFILES[currentIndex + 2]} stackIndex={2} />
            )}
            {stackDepth >= 2 && (
              <BackgroundCard profile={PROFILES[currentIndex + 1]} stackIndex={1} />
            )}
            <TopCard
              key={PROFILES[currentIndex].id}
              profile={PROFILES[currentIndex]}
              swipeCommand={swipeCommand}
              onCommandConsumed={() => setSwipeCommand(null)}
              onSwipeStart={() => setDisabled(true)}
              onSwipe={handleSwipe}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!showEmpty && (
        <div className="flex-none flex items-center justify-center gap-10 py-3">
          {/* Pass */}
          <motion.button
            onClick={() => executeButtonSwipe('left')}
            disabled={disabled}
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(255,61,113,0.12)',
              border: '2px solid rgba(255,61,113,0.45)',
              boxShadow: '0 0 18px rgba(255,61,113,0.18)',
            }}
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.08, boxShadow: '0 0 28px rgba(255,61,113,0.35)' }}
          >
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path d="M5 5L21 21M21 5L5 21" stroke="#FF3D71" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </motion.button>

          {/* Like */}
          <motion.button
            onClick={() => executeButtonSwipe('right')}
            disabled={disabled}
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(78,255,196,0.12)',
              border: '2px solid rgba(78,255,196,0.45)',
              boxShadow: '0 0 18px rgba(78,255,196,0.18)',
            }}
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.08, boxShadow: '0 0 28px rgba(78,255,196,0.35)' }}
          >
            <img src="/icons/Heart.png" alt="like" className="w-7 h-7 object-contain" draggable={false}
              style={{ filter: 'drop-shadow(0 0 6px rgba(78,255,196,0.6))' }} />
          </motion.button>
        </div>
      )}

      {/* Bottom nav */}
      <BottomNav
        onMatches={() => navigate('/onboarding/preview')}
        onProfile={() => navigate('/onboarding/preview')}
      />

      {/* Match modal */}
      <AnimatePresence>
        {matchProfile && (
          <MatchModal
            matchProfile={matchProfile}
            userCharacter={character ?? 'ghost'}
            onDismiss={() => setMatchProfile(null)}
            onPlay={() => { setMatchProfile(null); navigate('/play'); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
