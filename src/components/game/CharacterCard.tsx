import { motion } from 'framer-motion';
import type { Character } from '../../types/game';

interface CharacterCardProps {
  character: Character;
  isFlipped: boolean;
  isMySecret?: boolean;
  isSelected?: boolean;
  isSelectable?: boolean;
  size?: 'sm' | 'lg';
  onClick?: () => void;
}

export function CharacterCard({
  character,
  isFlipped,
  isMySecret = false,
  isSelected = false,
  isSelectable = false,
  size = 'sm',
  onClick,
}: CharacterCardProps) {
  const isLg = size === 'lg';

  return (
    <div
      className="relative"
      style={{
        perspective: 1000,
        width: '100%',
        aspectRatio: '3 / 4',
      }}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Front face */}
        <motion.div
          className="absolute inset-0 rounded-xl overflow-hidden cursor-pointer"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            border: isSelected
              ? `3px solid ${character.color}`
              : isMySecret
              ? '3px solid #FF9F1C'
              : isSelectable
              ? '2px solid rgba(255,255,255,0.3)'
              : '2px solid rgba(0,0,0,0.12)',
            boxShadow: isSelected
              ? `0 0 0 2px ${character.color}, 0 0 16px ${character.color}88`
              : isSelectable
              ? '2px 2px 0 rgba(0,0,0,0.15)'
              : '2px 2px 0 rgba(0,0,0,0.1)',
          }}
          onClick={isSelectable && !isFlipped ? onClick : undefined}
          whileHover={isSelectable && !isFlipped ? { y: -2, scale: 1.02 } : {}}
        >
          {/* Character image — fills the card */}
          <img
            src={character.image}
            alt={character.name}
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: isLg ? 'contain' : 'cover' }}
            draggable={false}
          />

          {/* Gradient overlay at the bottom for the name */}
          <div
            className="absolute inset-x-0 bottom-0 flex items-end justify-center"
            style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
              paddingBottom: isLg ? 8 : 4,
              paddingTop: isLg ? 28 : 16,
            }}
          >
            <span
              className="font-display font-bold text-white text-center leading-tight truncate px-1"
              style={{ fontSize: isLg ? 13 : 7 }}
            >
              {character.name}
            </span>
          </div>

          {/* My secret badge */}
          {isMySecret && (
            <div
              className="absolute top-1 left-1 px-1 rounded text-white font-display font-bold"
              style={{ fontSize: 6, background: '#FF9F1C', border: '1px solid black' }}
            >
              ★ YOU
            </div>
          )}

          {/* Selected checkmark */}
          {isSelected && (
            <motion.div
              className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: character.color, border: '2px solid black' }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              <span style={{ fontSize: 10, color: 'white' }}>✓</span>
            </motion.div>
          )}
        </motion.div>

        {/* Back face (flipped) */}
        <div
          className="absolute inset-0 rounded-xl flex items-center justify-center"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(135deg, #374151, #1f2937)',
            border: '2px solid #374151',
          }}
        >
          <span style={{ fontSize: isLg ? 40 : 22, opacity: 0.6 }}>?</span>
        </div>
      </motion.div>
    </div>
  );
}
