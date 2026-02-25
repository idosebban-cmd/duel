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
        width: isLg ? '100%' : 60,
        height: isLg ? 160 : 80,
      }}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Front face */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden cursor-pointer"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: isSelected
              ? `linear-gradient(135deg, ${character.color}33, ${character.color}66)`
              : `linear-gradient(135deg, ${character.color}22, white)`,
            border: isSelected
              ? `3px solid ${character.color}`
              : isMySecret
              ? '3px solid #FF9F1C'
              : '2px solid black',
            boxShadow: isSelected
              ? `0 0 0 2px ${character.color}, 0 0 16px ${character.color}88`
              : isSelectable
              ? '2px 2px 0 rgba(0,0,0,0.15)'
              : '2px 2px 0 rgba(0,0,0,0.1)',
          }}
          onClick={isSelectable && !isFlipped ? onClick : undefined}
        >
          {/* Emoji avatar */}
          <div
            className="flex items-center justify-center"
            style={{
              height: isLg ? 100 : 52,
              fontSize: isLg ? 40 : 28,
              background: `linear-gradient(135deg, ${character.color}44, ${character.color}22)`,
            }}
          >
            {character.emoji}
          </div>

          {/* Name */}
          <div
            className="text-center font-display font-bold truncate px-1"
            style={{
              fontSize: isLg ? 13 : 7,
              color: '#2D3142',
              paddingTop: isLg ? 4 : 2,
              paddingBottom: isLg ? 4 : 2,
            }}
          >
            {character.name}
          </div>

          {/* Attribute badges (lg only) */}
          {isLg && (
            <div className="flex flex-wrap gap-1 px-2 pb-2 justify-center">
              {character.attributes.glasses && <Badge label="Glasses" color="#00D9FF" />}
              {character.attributes.hat && <Badge label="Hat" color="#FFE66D" />}
              {character.attributes.facialHair && <Badge label="Facial hair" color="#B565FF" />}
              <Badge label={character.attributes.hairColor} color="#FF6BA8" />
              <Badge label={character.attributes.gender} color="#4EFFC4" />
            </div>
          )}

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

          {/* Hover lift (selectable only) */}
          {isSelectable && (
            <motion.div
              className="absolute inset-0 rounded-xl"
              whileHover={{ y: -2 }}
              style={{ pointerEvents: 'none' }}
            />
          )}
        </div>

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

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="rounded-full px-1.5 py-0.5 font-body font-medium capitalize"
      style={{ fontSize: 9, background: `${color}33`, color: '#2D3142', border: `1px solid ${color}66` }}
    >
      {label}
    </span>
  );
}
