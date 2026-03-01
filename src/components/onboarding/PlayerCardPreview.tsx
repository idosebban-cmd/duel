import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Gamepad2 } from 'lucide-react';
import { useOnboardingStore } from '../../store/onboardingStore';

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
  trivia:      '/game-icons/Trivia%20%26%20quizzes.png',
  puzzles:     '/game-icons/Puzzles.png',
  drawing:     '/game-icons/Drawing%20%26%20Creative.png',
  word:        '/game-icons/Word%20games.png',
  board:       '/game-icons/Boardgames.png',
  video:       '/game-icons/Video%20games.png',
  card:        '/game-icons/Card%20games.png',
  competitive: '/game-icons/Competative%20games.png',
  coop:        '/game-icons/Coop%20games.png',
  party:       '/game-icons/Party%20games.png',
  strategy:    '/game-icons/Strategy.png',
  rpg:         '/game-icons/Role%20play.png',
  active:      '/game-icons/Active%20games.png',
  mobile:      '/game-icons/Mobile%20games.png',
};

const lookingForLabels: Record<string, string> = {
  casual: 'Something casual',
  'short-term': 'Short-term fun',
  'long-term': 'Long-term relationship',
  'not-sure': 'Not sure yet',
  open: 'Open to see what happens',
};

const lookingForColors: Record<string, string> = {
  casual: '#FF3D71',
  'short-term': '#FF9F1C',
  'long-term': '#4EFFC4',
  'not-sure': '#B565FF',
  open: '#FFE66D',
};

const lookingForIcons: Record<string, string> = {
  casual: '/looking-for/Casual.png',
  'short-term': '/looking-for/Short-term.png',
  'long-term': '/looking-for/long-term.png',
  'not-sure': '/looking-for/Not-sure.png',
  open: '/looking-for/Open.png',
};


export function PlayerCardPreview() {
  const navigate = useNavigate();
  const store = useOnboardingStore();
  const [photoIndex, setPhotoIndex] = useState(0);
  const btnRef = useRef<HTMLButtonElement>(null);

  const {
    character, element, affiliation,
    name, age, gender, interestedIn,
    photos, gameTypes, favoriteGames,
    lookingFor, kids, drinking, smoking, exercise,
  } = store;

  const capitalize = (s: string | null) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1) : '';


  const lifestyleItems = [
    kids     && { icon: '/Lifestyle/Baby.png',     label: kids },
    drinking && { icon: '/Lifestyle/Cocktail.png', label: drinking === 'Socially' ? 'Social drinker' : drinking },
    smoking  && { icon: '/Lifestyle/Smoking.png',  label: smoking === 'No' ? 'Non-smoker' : smoking },
    exercise && { icon: '/Lifestyle/Exercise.png', label: exercise },
  ].filter(Boolean) as { icon: string; label: string }[];


  const handleStartPlaying = () => {
    navigate('/game');
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#12122A' }}>
      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(78,255,196,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(78,255,196,0.06) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)' }} />
      {/* Corner brackets */}
      <div className="absolute top-4 left-4 w-8 h-8 border-t-[3px] border-l-[3px] border-electric-mint/40 pointer-events-none" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t-[3px] border-r-[3px] border-electric-mint/40 pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center px-4 sm:px-6 py-4 gap-3">
        <motion.button onClick={() => navigate('/onboarding/lifestyle')} className="flex items-center gap-1.5 font-body font-medium text-sm flex-shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }} whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}>
          <ArrowLeft size={18} /><span>Back</span>
        </motion.button>
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <span className="font-body text-xs font-bold tracking-widest uppercase" style={{ color: '#4EFFC4' }}>Player Card</span>
          <div className="flex gap-1">
            {[0,1,2,3,4,5,6,7].map((i) => (
              <div key={i} className="h-1.5 rounded-full" style={{ width: i === 7 ? 24 : 8, background: '#FF6BA8' }} />
            ))}
          </div>
        </div>
        <div className="w-14 flex-shrink-0" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 pb-32">
        <div className="max-w-lg mx-auto space-y-4">
          {/* Headline */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1
              className="font-display font-extrabold text-4xl sm:text-5xl"
              style={{
                background: 'linear-gradient(135deg, #FF6BA8, #B565FF, #00D9FF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              YOUR PLAYER CARD
            </h1>
            <p className="font-body mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Here's how you'll appear to matches
            </p>
          </motion.div>

          {/* Main card */}
          <motion.div
            className="relative rounded-3xl overflow-hidden"
            style={{
              background: 'white',
              border: '4px solid #000',
              boxShadow: '10px 10px 0px 0px rgba(0,0,0,0.15)',
            }}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
          >
            {/* Avatar Section */}
            <div
              className="relative p-6 text-center"
              style={{
                background: 'linear-gradient(135deg, #FF6BA8 0%, #B565FF 50%, #00D9FF 100%)',
              }}
            >
              {/* Glossy */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />

              {/* Avatar emoji */}
              <motion.div
                className="relative inline-block mb-4"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div
                  className="w-28 h-28 rounded-3xl flex items-center justify-center text-6xl mx-auto"
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: '3px solid rgba(255,255,255,0.5)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  {character && characterImages[character]
                    ? <img src={characterImages[character]} alt={character} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
                    : '?'}
                </div>

                {/* Affiliation badge */}
                {affiliation && affiliationImages[affiliation] && (
                  <motion.img
                    src={affiliationImages[affiliation]}
                    alt={affiliation}
                    className="absolute -top-4 -left-4 w-12 h-12 object-contain drop-shadow-lg"
                    style={{ imageRendering: 'pixelated' }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: 'spring' }}
                  />
                )}

                {/* Element badge */}
                {element && elementImages[element] && (
                  <motion.img
                    src={elementImages[element]}
                    alt={element}
                    className="absolute -bottom-4 -right-4 w-12 h-12 object-contain drop-shadow-lg"
                    style={{ imageRendering: 'pixelated' }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                  />
                )}
              </motion.div>

              {/* Name & Age */}
              <h2 className="font-display font-extrabold text-3xl text-white"
                style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.2)' }}>
                {name || 'Your Name'}{age ? `, ${age}` : ''}
              </h2>

              {/* Gender/interest info */}
              <div className="flex justify-center gap-2 mt-2 flex-wrap">
                {gender && (
                  <span className="px-2 py-1 rounded-lg text-xs font-body font-semibold text-white bg-black/20">
                    {capitalize(gender)}
                  </span>
                )}
                {interestedIn && (
                  <span className="px-2 py-1 rounded-lg text-xs font-body font-semibold text-white bg-black/20">
                    Likes {interestedIn}
                  </span>
                )}
              </div>
            </div>

            {/* Photos carousel */}
            {photos.length === 0 && (
              <div className="px-5 py-5 text-center" style={{ background: 'rgba(0,0,0,0.04)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                <p className="font-body text-sm" style={{ color: 'rgba(0,0,0,0.35)' }}>
                  📷 No photos yet — go back to the Photos step to add them
                </p>
              </div>
            )}
            {photos.length > 0 && (
              <div className="relative">
                <div className="aspect-[4/3] overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={photoIndex}
                      src={photos[photoIndex]}
                      alt={`Photo ${photoIndex + 1}`}
                      className="w-full h-full object-cover object-top"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  </AnimatePresence>
                </div>

                {/* Photo navigation */}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={() => setPhotoIndex((i) => Math.max(0, i - 1))}
                      disabled={photoIndex === 0}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center disabled:opacity-30"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={() => setPhotoIndex((i) => Math.min(photos.length - 1, i + 1))}
                      disabled={photoIndex === photos.length - 1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center disabled:opacity-30"
                      aria-label="Next photo"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                      {photos.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setPhotoIndex(i)}
                          className="rounded-full"
                          style={{
                            width: i === photoIndex ? 20 : 6,
                            height: 6,
                            background: i === photoIndex ? '#FF6BA8' : 'rgba(255,255,255,0.6)',
                            transition: 'all 0.2s',
                          }}
                          aria-label={`View photo ${i + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Card body */}
            <div className="p-5 space-y-5">
              {/* Games I like */}
              {gameTypes.length > 0 && (
                <div>
                  <p
                    className="font-display font-bold text-sm mb-3 pb-1"
                    style={{
                      background: 'linear-gradient(90deg, #FF6BA8, #B565FF)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      borderBottom: '2px solid',
                      borderImage: 'linear-gradient(90deg, #FF6BA8, #B565FF) 1',
                    }}
                  >
                    GAMES I LIKE
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {gameTypes.map((gt) => (
                      <motion.span
                        key={gt}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-display font-bold text-sm text-charcoal"
                        style={{
                          background: 'linear-gradient(135deg, #FFF0F5, #F5F0FF)',
                          border: '2px solid #000',
                          boxShadow: '3px 3px 0px 0px rgba(0,0,0,0.15)',
                        }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <img src={gameTypeIcons[gt] || '/game-icons/Active%20games.png'} alt="" className="w-5 h-5 object-contain" />
                        <span className="capitalize">{gt}</span>
                      </motion.span>
                    ))}
                  </div>
                  {favoriteGames.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {favoriteGames.map((game) => (
                        <span key={game} className="text-xs font-body text-charcoal/60 bg-charcoal/5 px-2 py-1 rounded-lg">
                          🎮 {game}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Looking for */}
              {Array.isArray(lookingFor) && lookingFor.some(id => lookingForLabels[id]) && (
                <div>
                  <p className="font-display font-bold text-sm text-charcoal/50 mb-2 uppercase tracking-wider">
                    Looking For
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(lookingFor as string[]).filter(id => lookingForLabels[id]).map((id) => (
                      <span
                        key={id}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-display font-bold text-sm text-white"
                        style={{
                          background: `linear-gradient(135deg, ${lookingForColors[id]}, ${lookingForColors[id]})`,
                          border: '2px solid #000',
                          boxShadow: '3px 3px 0px 0px rgba(0,0,0,0.15)',
                        }}
                      >
                        {lookingForIcons[id] && <img src={lookingForIcons[id]} alt="" className="w-5 h-5 object-contain" />}
                        {lookingForLabels[id]}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Lifestyle vibes */}
              {lifestyleItems.length > 0 && (
                <div>
                  <p className="font-display font-bold text-sm text-charcoal/50 mb-3 uppercase tracking-wider">
                    My Vibe
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {lifestyleItems.map((item) => (
                      <span
                        key={item.label}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-display font-bold text-sm text-charcoal bg-cream"
                        style={{ border: '2px solid #000', boxShadow: '3px 3px 0px 0px rgba(0,0,0,0.15)' }}
                      >
                        <img src={item.icon} alt="" className="w-5 h-5 object-contain" />
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Spacer for fixed button */}
          <div className="h-4" />
        </div>
      </div>

      {/* Fixed bottom buttons */}
      <div className="fixed bottom-0 left-0 right-0 px-4 sm:px-6 py-5 z-20" style={{ background: 'linear-gradient(to top, #12122A 70%, transparent)' }}>
        <div className="max-w-lg mx-auto space-y-3">
          {/* START PLAYING button */}
          <motion.button
            ref={btnRef}
            onClick={handleStartPlaying}
            className="w-full font-display font-extrabold text-xl sm:text-2xl text-white rounded-2xl py-5 px-8 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #FF6BA8 0%, #FF3D71 100%)',
              border: '4px solid black',
              boxShadow: '8px 8px 0px 0px #B565FF',
              textShadow: '2px 2px 0 rgba(0,0,0,0.2)',
            }}
            whileHover={{
              scale: 1.03,
              boxShadow: '12px 12px 0px 0px #B565FF',
            }}
            whileTap={{
              scale: 0.97,
              boxShadow: '4px 4px 0px 0px #B565FF',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Glossy overlay */}
            <span className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />

            <span className="flex items-center justify-center gap-2">
              <Gamepad2 size={24} />
              START PLAYING
            </span>
          </motion.button>

          {/* Edit button */}
          <motion.button onClick={() => navigate('/onboarding/avatar')} className="w-full font-display font-bold text-base rounded-2xl py-3 px-8"
            style={{ background: 'rgba(255,255,255,0.07)', border: '2px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            ✏️ Edit Profile
          </motion.button>
        </div>
      </div>

      {/* Neon bottom bar (above fixed buttons) */}
      <div className="fixed bottom-0 left-0 right-0 h-[3px] z-30 pointer-events-none" style={{ background: 'linear-gradient(90deg, #FF6BA8, #FFE66D, #4EFFC4, #B565FF, #FF6BA8)', boxShadow: '0 0 14px rgba(78,255,196,0.7)' }} />
    </div>
  );
}
