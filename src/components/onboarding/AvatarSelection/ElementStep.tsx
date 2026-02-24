import { motion } from 'framer-motion';

interface Element {
  id: string;
  name: string;
  emoji: string;
  description: string;
  gradient: string;
  glow: string;
  border: string;
}

const elements: Element[] = [
  {
    id: 'fire',
    name: 'Fire',
    emoji: '🔥',
    description: 'Passionate & intense',
    gradient: 'linear-gradient(135deg, #FF3D71 0%, #FF9F1C 100%)',
    glow: 'rgba(255, 61, 113, 0.5)',
    border: '#FF3D71',
  },
  {
    id: 'water',
    name: 'Water',
    emoji: '💧',
    description: 'Calm & adaptive',
    gradient: 'linear-gradient(135deg, #00D9FF 0%, #4EFFC4 100%)',
    glow: 'rgba(0, 217, 255, 0.5)',
    border: '#00D9FF',
  },
  {
    id: 'earth',
    name: 'Earth',
    emoji: '🌿',
    description: 'Grounded & reliable',
    gradient: 'linear-gradient(135deg, #CAFFBF 0%, #FF9F1C 100%)',
    glow: 'rgba(202, 255, 191, 0.6)',
    border: '#4ade80',
  },
  {
    id: 'air',
    name: 'Air',
    emoji: '💨',
    description: 'Free & spontaneous',
    gradient: 'linear-gradient(135deg, #e0f7ff 0%, #00D9FF 100%)',
    glow: 'rgba(224, 247, 255, 0.8)',
    border: '#7dd3fc',
  },
  {
    id: 'electric',
    name: 'Electric',
    emoji: '⚡',
    description: 'Quick & energetic',
    gradient: 'linear-gradient(135deg, #FFE66D 0%, #B565FF 100%)',
    glow: 'rgba(255, 230, 109, 0.6)',
    border: '#FFE66D',
  },
];

interface ElementStepProps {
  selected: string | null;
  onSelect: (id: string) => void;
}

export function ElementStep({ selected, onSelect }: ElementStepProps) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.h2
          className="font-display font-extrabold text-3xl sm:text-4xl mb-2"
          style={{
            background: 'linear-gradient(135deg, #4EFFC4, #00D9FF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          CHOOSE YOUR ELEMENT
        </motion.h2>
        <motion.p
          className="font-body text-base text-charcoal/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          What's your energy?
        </motion.p>
      </div>

      {/* Element Cards */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        {elements.map((el, index) => {
          const isSelected = selected === el.id;
          return (
            <motion.button
              key={el.id}
              onClick={() => onSelect(el.id)}
              className="relative flex-1 flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl cursor-pointer select-none min-h-[140px] sm:min-h-[200px]"
              style={{
                background: el.gradient,
                border: isSelected ? `4px solid #000` : '3px solid #000',
                boxShadow: isSelected
                  ? `0 0 0 3px ${el.border}, 0 0 30px ${el.glow}, 6px 6px 0px 0px ${el.border}`
                  : '4px 4px 0px 0px rgba(0,0,0,0.2)',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, scale: isSelected ? 1.04 : 1 }}
              transition={{
                delay: index * 0.07,
                scale: { type: 'spring', stiffness: 400, damping: 17 },
              }}
              whileHover={{ scale: isSelected ? 1.04 : 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              aria-pressed={isSelected}
              aria-label={`Select ${el.name} element`}
            >
              {/* Selected indicator */}
              {isSelected && (
                <motion.div
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black flex items-center justify-center text-white text-sm font-bold"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  ✓
                </motion.div>
              )}

              {/* Glossy overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent rounded-2xl pointer-events-none" />

              {/* Element icon */}
              <motion.span
                className="text-5xl sm:text-6xl mb-3 block"
                animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.5, repeat: isSelected ? Infinity : 0, repeatDelay: 2 }}
              >
                {el.emoji}
              </motion.span>

              <span className="font-display font-bold text-xl sm:text-2xl text-charcoal drop-shadow-sm">
                {el.name}
              </span>
              <span className="font-body text-xs sm:text-sm text-charcoal/70 mt-1 text-center">
                {el.description}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
