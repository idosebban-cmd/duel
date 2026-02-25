import { motion } from 'framer-motion';

interface Character {
  id: string;
  name: string;
  image: string;
  hint: string;
  color: string;
  gradient: string;
}

const characters: Character[] = [
  { id: 'dragon', name: 'Dragon', image: '/characters/Dragon.png', hint: 'Bold & Competitive', color: '#FF3D71', gradient: 'linear-gradient(135deg, #FF3D71, #FF9F1C)' },
  { id: 'cat', name: 'Cat', image: '/characters/Cat.png', hint: 'Playful & Mysterious', color: '#B565FF', gradient: 'linear-gradient(135deg, #B565FF, #FF6BA8)' },
  { id: 'robot', name: 'Robot', image: '/characters/Robot.png', hint: 'Logical & Quirky', color: '#00D9FF', gradient: 'linear-gradient(135deg, #00D9FF, #4EFFC4)' },
  { id: 'phoenix', name: 'Phoenix', image: '/characters/Phoenix.png', hint: 'Transformative & Deep', color: '#FF9F1C', gradient: 'linear-gradient(135deg, #FF9F1C, #FF3D71)' },
  { id: 'bear', name: 'Bear', image: '/characters/Bear.png', hint: 'Warm & Steady', color: '#4EFFC4', gradient: 'linear-gradient(135deg, #4EFFC4, #FFE66D)' },
  { id: 'fox', name: 'Fox', image: '/characters/Fox.png', hint: 'Clever & Witty', color: '#FF9F1C', gradient: 'linear-gradient(135deg, #FF9F1C, #B565FF)' },
  { id: 'octopus', name: 'Octopus', image: '/characters/Octopus.png', hint: 'Creative & Adaptable', color: '#FF6BA8', gradient: 'linear-gradient(135deg, #FF6BA8, #B565FF)' },
  { id: 'owl', name: 'Owl', image: '/characters/Owl.png', hint: 'Wise & Thoughtful', color: '#B565FF', gradient: 'linear-gradient(135deg, #B565FF, #00D9FF)' },
  { id: 'wolf', name: 'Wolf', image: '/characters/Wolf.png', hint: 'Loyal & Intense', color: '#2D3142', gradient: 'linear-gradient(135deg, #2D3142, #B565FF)' },
  { id: 'unicorn', name: 'Unicorn', image: '/characters/Unicorn.png', hint: 'Optimistic & Magical', color: '#FF6BA8', gradient: 'linear-gradient(135deg, #FF6BA8, #FFE66D)' },
  { id: 'ghost', name: 'Ghost', image: '/characters/Ghost.png', hint: 'Mysterious & Introverted', color: '#00D9FF', gradient: 'linear-gradient(135deg, #00D9FF, #B565FF)' },
  { id: 'lion', name: 'Lion', image: '/characters/Lion.png', hint: 'Confident & Leader', color: '#FFE66D', gradient: 'linear-gradient(135deg, #FFE66D, #FF9F1C)' },
];

interface CharacterStepProps {
  selected: string | null;
  onSelect: (id: string) => void;
}

export function CharacterStep({ selected, onSelect }: CharacterStepProps) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.h2
          className="font-display font-extrabold text-3xl sm:text-4xl mb-2"
          style={{
            background: 'linear-gradient(135deg, #FF6BA8, #B565FF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          CHOOSE YOUR CHARACTER
        </motion.h2>
        <motion.p
          className="font-body text-base text-charcoal/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          How do you vibe?
        </motion.p>
      </div>

      {/* Character Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {characters.map((char, index) => {
          const isSelected = selected === char.id;
          return (
            <motion.button
              key={char.id}
              onClick={() => onSelect(char.id)}
              className="relative flex flex-col items-center p-4 rounded-2xl bg-white cursor-pointer select-none text-left"
              style={{
                border: isSelected ? `4px solid ${char.color}` : '3px solid #000',
                boxShadow: isSelected
                  ? `0 0 0 2px ${char.color}, 0 0 20px ${char.color}60, 6px 6px 0px 0px ${char.color}`
                  : '4px 4px 0px 0px rgba(0,0,0,0.15)',
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: isSelected ? 1.05 : 1 }}
              transition={{
                delay: index * 0.04,
                scale: { type: 'spring', stiffness: 400, damping: 17 },
              }}
              whileHover={{ scale: isSelected ? 1.05 : 1.03 }}
              whileTap={{ scale: 0.97 }}
              aria-pressed={isSelected}
              aria-label={`Select ${char.name} - ${char.hint}`}
            >
              {/* Selected checkmark */}
              {isSelected && (
                <motion.span
                  className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: char.color, border: '2px solid #000' }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  ✓
                </motion.span>
              )}

              {/* Character avatar */}
              <div
                className="w-full aspect-square rounded-xl mb-3 overflow-hidden"
                style={{
                  background: isSelected ? char.gradient : 'linear-gradient(135deg, #f5f5f5, #ebebeb)',
                  border: '2px solid rgba(0,0,0,0.1)',
                }}
              >
                <img
                  src={char.image}
                  alt={char.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Character info */}
              <span className="font-display font-bold text-base sm:text-lg text-charcoal leading-tight">
                {char.name}
              </span>
              <span className="font-body text-xs text-charcoal/50 mt-0.5 text-center leading-tight">
                {char.hint}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
