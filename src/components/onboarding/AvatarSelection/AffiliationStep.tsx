import { motion } from 'framer-motion';

interface Affiliation {
  id: string;
  name: string;
  image: string;
  hint: string;
  color: string;
  gradient: string;
}

const affiliations: Affiliation[] = [
  { id: 'city', name: 'City', image: '/affiliation/City.png', hint: 'Urban life', color: '#B565FF', gradient: 'linear-gradient(135deg, #B565FF, #00D9FF)' },
  { id: 'country', name: 'Country', image: '/affiliation/Country.png', hint: 'Simple living', color: '#FFE66D', gradient: 'linear-gradient(135deg, #FFE66D, #4EFFC4)' },
  { id: 'nature', name: 'Nature', image: '/affiliation/Nature.png', hint: 'Wild outdoors', color: '#4EFFC4', gradient: 'linear-gradient(135deg, #4EFFC4, #FFE66D)' },
  { id: 'fitness', name: 'Fitness', image: '/affiliation/Sports.png', hint: 'Active lifestyle', color: '#FF9F1C', gradient: 'linear-gradient(135deg, #FF9F1C, #FF3D71)' },
  { id: 'academia', name: 'Library', image: '/affiliation/Library.png', hint: 'Knowledge seeker', color: '#00D9FF', gradient: 'linear-gradient(135deg, #00D9FF, #B565FF)' },
  { id: 'music', name: 'Music', image: '/affiliation/Music.png', hint: 'Creative soul', color: '#FF6BA8', gradient: 'linear-gradient(135deg, #FF6BA8, #B565FF)' },
  { id: 'art', name: 'Art', image: '/affiliation/Art.png', hint: 'Artistic spirit', color: '#FF3D71', gradient: 'linear-gradient(135deg, #FF3D71, #FF9F1C)' },
  { id: 'tech', name: 'Tech', image: '/affiliation/Tech.png', hint: 'Digital native', color: '#B565FF', gradient: 'linear-gradient(135deg, #B565FF, #00D9FF)' },
  { id: 'cosmic', name: 'Cosmic', image: '/affiliation/Cosmos.png', hint: 'Spiritual mystic', color: '#4EFFC4', gradient: 'linear-gradient(135deg, #4EFFC4, #B565FF)' },
  { id: 'travel', name: 'Travel', image: '/affiliation/Travel.png', hint: 'World explorer', color: '#FF9F1C', gradient: 'linear-gradient(135deg, #FF9F1C, #FFE66D)' },
];

interface AffiliationStepProps {
  selected: string | null;
  onSelect: (id: string) => void;
}

export function AffiliationStep({ selected, onSelect }: AffiliationStepProps) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.h2
          className="font-display font-extrabold text-3xl sm:text-4xl mb-2"
          style={{
            background: 'linear-gradient(135deg, #FF9F1C, #FFE66D)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          CHOOSE YOUR AFFILIATION
        </motion.h2>
        <motion.p
          className="font-body text-base"
          style={{ color: 'rgba(255,255,255,0.6)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          What's your world?
        </motion.p>
      </div>

      {/* Affiliation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {affiliations.map((aff, index) => {
          const isSelected = selected === aff.id;
          return (
            <motion.button
              key={aff.id}
              onClick={() => onSelect(aff.id)}
              className="relative flex flex-col items-center p-4 rounded-2xl cursor-pointer select-none"
              style={{
                background: isSelected ? 'transparent' : 'rgba(255,255,255,0.07)',
                border: isSelected ? `3px solid ${aff.color}` : '2px solid rgba(255,255,255,0.14)',
                boxShadow: isSelected ? `0 0 0 2px ${aff.color}, 0 0 22px ${aff.color}60, 5px 5px 0px 0px ${aff.color}` : 'none',
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
              aria-label={`Select ${aff.name} - ${aff.hint}`}
            >
              {/* Selected checkmark */}
              {isSelected && (
                <motion.span
                  className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: aff.color, border: '2px solid #000' }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  ✓
                </motion.span>
              )}

              {/* Affiliation image */}
              <div
                className="w-full aspect-square rounded-xl mb-3 overflow-hidden flex items-center justify-center"
                style={{
                  background: isSelected ? aff.gradient : 'rgba(255,255,255,0.05)',
                  border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <img
                  src={aff.image}
                  alt={aff.name}
                  className="w-4/5 h-4/5 object-contain"
                />
              </div>

              <span className="font-display font-bold text-base sm:text-lg leading-tight" style={{ color: 'white' }}>
                {aff.name}
              </span>
              <span className="font-body text-xs mt-0.5 text-center leading-tight" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {aff.hint}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
