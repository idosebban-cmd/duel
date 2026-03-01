import { motion } from 'framer-motion';

interface Element {
  id: string;
  name: string;
  image: string;
  hint: string;
  color: string;
  gradient: string;
}

const elements: Element[] = [
  { id: 'fire', name: 'Fire', image: '/elements/Fire.png', hint: 'Passionate & intense', color: '#FF3D71', gradient: 'linear-gradient(135deg, #FF3D71, #FF9F1C)' },
  { id: 'water', name: 'Water', image: '/elements/Water.png', hint: 'Calm & adaptive', color: '#00D9FF', gradient: 'linear-gradient(135deg, #00D9FF, #4EFFC4)' },
  { id: 'earth', name: 'Earth', image: '/elements/Earth.png', hint: 'Grounded & reliable', color: '#4ade80', gradient: 'linear-gradient(135deg, #CAFFBF, #4ade80)' },
  { id: 'air', name: 'Air', image: '/elements/Wind.png', hint: 'Free & spontaneous', color: '#7dd3fc', gradient: 'linear-gradient(135deg, #e0f7ff, #00D9FF)' },
  { id: 'electric', name: 'Electric', image: '/elements/Electricity.png', hint: 'Quick & energetic', color: '#FFE66D', gradient: 'linear-gradient(135deg, #FFE66D, #B565FF)' },
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
          className="font-body text-base"
          style={{ color: 'rgba(255,255,255,0.6)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          What's your energy?
        </motion.p>
      </div>

      {/* Element Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {elements.map((el, index) => {
          const isSelected = selected === el.id;
          return (
            <motion.button
              key={el.id}
              onClick={() => onSelect(el.id)}
              className="relative flex flex-col items-center p-4 rounded-2xl cursor-pointer select-none"
              style={{
                background: isSelected ? 'transparent' : 'rgba(255,255,255,0.07)',
                border: isSelected ? `3px solid ${el.color}` : '2px solid rgba(255,255,255,0.14)',
                boxShadow: isSelected ? `0 0 0 2px ${el.color}, 0 0 22px ${el.color}60, 5px 5px 0px 0px ${el.color}` : 'none',
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
              aria-label={`Select ${el.name} element`}
            >
              {/* Selected checkmark */}
              {isSelected && (
                <motion.span
                  className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: el.color, border: '2px solid #000' }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  ✓
                </motion.span>
              )}

              {/* Element image */}
              <div
                className="w-full aspect-square rounded-xl mb-3 overflow-hidden flex items-center justify-center"
                style={{
                  background: isSelected ? el.gradient : 'rgba(255,255,255,0.05)',
                  border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <img
                  src={el.image}
                  alt={el.name}
                  className="w-4/5 h-4/5 object-contain"
                />
              </div>

              <span className="font-display font-bold text-base sm:text-lg leading-tight" style={{ color: 'white' }}>
                {el.name}
              </span>
              <span className="font-body text-xs mt-0.5 text-center leading-tight" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {el.hint}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
