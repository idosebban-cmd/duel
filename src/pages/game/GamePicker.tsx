/**
 * Game Picker – choose which game to play (Guess Who or Dot Dash)
 */
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface GameOption {
  id: string;
  name: string;
  emoji: string;
  description: string;
  route: string;
  gradient: string;
  color: string;
  icon: string;
}

const GAMES: GameOption[] = [
  {
    id: 'guess-who',
    name: 'Guess Who?',
    emoji: '🕵️',
    description: 'Ask questions to deduce your opponent\'s secret character. Quick deduction game.',
    route: '/game',
    gradient: 'linear-gradient(135deg, #FF6BA8, #B565FF)',
    color: '#FF6BA8',
    icon: '❓',
  },
  {
    id: 'dot-dash',
    name: 'Dot Dash',
    emoji: '🕹️',
    description: 'Race through a maze collecting dots while avoiding ghosts. Real-time action!',
    route: '/dotdash',
    gradient: 'linear-gradient(135deg, #4EFFC4, #FFE66D)',
    color: '#4EFFC4',
    icon: '🎮',
  },
];

export function GamePicker() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{ background: '#12122A' }}
    >
      {/* Grid bg */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(78,255,196,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(78,255,196,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)',
        }}
      />

      <div className="relative z-10 w-full max-w-2xl flex flex-col gap-8">
        {/* Header */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1
            className="font-display font-extrabold text-4xl sm:text-5xl mb-2"
            style={{
              background: 'linear-gradient(135deg, #FF6BA8, #4EFFC4, #FFE66D)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            READY TO PLAY?
          </h1>
          <p className="font-body text-white/60 text-lg">Choose your game</p>
        </motion.div>

        {/* Game options grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {GAMES.map((game, idx) => (
            <motion.button
              key={game.id}
              onClick={() => navigate(game.route)}
              className="group relative rounded-3xl p-6 text-left overflow-hidden transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '3px solid rgba(255,255,255,0.1)',
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + idx * 0.1, type: 'spring', stiffness: 300, damping: 25 }}
              whileHover={{
                scale: 1.04,
                borderColor: game.color,
                boxShadow: `0 0 30px ${game.color}44, inset 0 0 30px ${game.color}11`,
              }}
              whileTap={{ scale: 0.96 }}
            >
              {/* Gradient background on hover */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ background: game.gradient, opacity: 0 }}
                whileHover={{ opacity: 0.05 }}
                transition={{ duration: 0.3 }}
              />

              {/* Content */}
              <div className="relative flex flex-col h-full gap-4">
                {/* Icon + name */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{game.emoji}</div>
                    <h2 className="font-display font-extrabold text-2xl text-white">
                      {game.name}
                    </h2>
                  </div>
                  <div
                    className="text-2xl opacity-60 group-hover:opacity-100 transition-opacity"
                    style={{ color: game.color }}
                  >
                    {game.icon}
                  </div>
                </div>

                {/* Description */}
                <p className="font-body text-white/70 text-sm leading-relaxed flex-1">
                  {game.description}
                </p>

                {/* Play button */}
                <motion.div
                  className="flex items-center gap-2 font-display font-bold text-sm uppercase tracking-wide mt-auto"
                  style={{ color: game.color }}
                  whileHover={{ x: 4 }}
                >
                  <span>Play</span>
                  <span>→</span>
                </motion.div>
              </div>

              {/* Border glow on hover */}
              <motion.div
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{ border: `3px solid ${game.color}` }}
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          ))}
        </motion.div>

        {/* Bottom section */}
        <motion.div
          className="text-center mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <button
            onClick={() => window.history.back()}
            className="font-body text-sm text-white/30 hover:text-white/60 transition-colors"
          >
            ← Back to profile
          </button>
        </motion.div>
      </div>

      {/* Neon bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 h-[3px] pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, #FF6BA8, #FFE66D, #4EFFC4, #B565FF, #FF6BA8)',
          boxShadow: '0 0 14px rgba(78,255,196,0.7)',
        }}
      />
    </div>
  );
}
