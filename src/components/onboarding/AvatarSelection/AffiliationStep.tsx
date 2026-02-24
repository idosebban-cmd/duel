import { motion } from 'framer-motion';

interface Affiliation {
  id: string;
  name: string;
  emoji: string;
  descriptor: string;
  color: string;
}

const affiliations: Affiliation[] = [
  { id: 'city', name: 'City', emoji: '🏙️', descriptor: 'Urban life', color: '#B565FF' },
  { id: 'country', name: 'Country', emoji: '🌾', descriptor: 'Simple living', color: '#FFE66D' },
  { id: 'nature', name: 'Nature', emoji: '🌲', descriptor: 'Wild outdoors', color: '#4EFFC4' },
  { id: 'fitness', name: 'Fitness', emoji: '💪', descriptor: 'Active lifestyle', color: '#FF9F1C' },
  { id: 'academia', name: 'Academia', emoji: '📚', descriptor: 'Knowledge seeker', color: '#00D9FF' },
  { id: 'music', name: 'Music', emoji: '🎵', descriptor: 'Creative soul', color: '#FF6BA8' },
  { id: 'art', name: 'Art', emoji: '🎨', descriptor: 'Artistic spirit', color: '#FF3D71' },
  { id: 'tech', name: 'Tech', emoji: '💻', descriptor: 'Digital native', color: '#B565FF' },
  { id: 'cosmic', name: 'Cosmic', emoji: '🌌', descriptor: 'Spiritual mystic', color: '#4EFFC4' },
  { id: 'travel', name: 'Travel', emoji: '✈️', descriptor: 'World explorer', color: '#FF9F1C' },
];

interface AffiliationStepProps {
  selected: string | null;
  onSelect: (id: string) => void;
  characterName: string | null;
  elementName: string | null;
}

export function AffiliationStep({ selected, onSelect, characterName, elementName }: AffiliationStepProps) {
  const capitalize = (s: string | null) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  const avatarLabel = [
    selected ? capitalize(selected) : null,
    elementName ? capitalize(elementName) : null,
    characterName ? capitalize(characterName) : null,
  ].filter(Boolean).join(' ');

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
          className="font-body text-base text-charcoal/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          What's your world?
        </motion.p>
      </div>

      {/* Affiliation Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {affiliations.map((aff, index) => {
          const isSelected = selected === aff.id;
          return (
            <motion.button
              key={aff.id}
              onClick={() => onSelect(aff.id)}
              className="flex items-center gap-3 p-4 rounded-2xl bg-white cursor-pointer select-none text-left"
              style={{
                border: isSelected ? `4px solid ${aff.color}` : '3px solid #000',
                boxShadow: isSelected
                  ? `0 0 0 2px ${aff.color}, 0 0 16px ${aff.color}60, 5px 5px 0px 0px ${aff.color}`
                  : '4px 4px 0px 0px rgba(0,0,0,0.15)',
                backgroundColor: isSelected ? `${aff.color}15` : 'white',
              }}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: isSelected ? 1.03 : 1 }}
              transition={{
                delay: index * 0.04,
                scale: { type: 'spring', stiffness: 400, damping: 17 },
              }}
              whileHover={{ scale: isSelected ? 1.03 : 1.02 }}
              whileTap={{ scale: 0.97 }}
              aria-pressed={isSelected}
            >
              {/* Icon */}
              <span
                className="text-2xl w-12 h-12 flex items-center justify-center rounded-xl flex-shrink-0"
                style={{
                  background: isSelected ? `${aff.color}30` : '#f5f5f5',
                  border: `2px solid ${isSelected ? aff.color : 'transparent'}`,
                }}
              >
                {aff.emoji}
              </span>

              <div className="min-w-0">
                <span className="block font-display font-bold text-base text-charcoal">
                  {aff.name}
                </span>
                <span className="block font-body text-xs text-charcoal/50 truncate">
                  {aff.descriptor}
                </span>
              </div>

              {isSelected && (
                <motion.span
                  className="ml-auto text-sm font-bold flex-shrink-0"
                  style={{ color: aff.color }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  ✓
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Avatar Preview */}
      {avatarLabel && (
        <motion.div
          className="relative flex items-center gap-4 p-4 rounded-2xl border-3 border-black"
          style={{
            background: 'linear-gradient(135deg, #FF6BA8 0%, #B565FF 50%, #00D9FF 100%)',
            boxShadow: '6px 6px 0px 0px rgba(0,0,0,0.2)',
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-2xl pointer-events-none" />
          <div className="text-4xl">
            {affiliations.find(a => a.id === selected)?.emoji || '?'}
          </div>
          <div>
            <p className="font-body text-white/80 text-xs font-medium uppercase tracking-widest">Your Avatar</p>
            <p className="font-display font-extrabold text-white text-lg leading-tight drop-shadow-sm">
              {avatarLabel}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
