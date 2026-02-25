import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';
import { CharacterCard } from './CharacterCard';
import type { Character } from '../../types/game';

interface GuessModalProps {
  characters: Character[];
  flippedCards: string[]; // opponent's flipped cards (eliminated from their board)
  onConfirm: (charId: string) => void;
  onClose: () => void;
}

export function GuessModal({ characters, flippedCards, onConfirm, onClose }: GuessModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const standing = characters.filter((c) => !flippedCards.includes(c.id));

  const handleConfirm = () => {
    if (!selected) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onConfirm(selected);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #FFF8F0 0%, #F5F0FF 100%)',
          border: '4px solid black',
          boxShadow: '8px 8px 0px 0px #B565FF',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        initial={{ y: 60, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 60, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <h2
              className="font-display font-extrabold text-2xl"
              style={{
                background: 'linear-gradient(135deg, #B565FF, #FF6BA8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              WHO IS IT?
            </h2>
            <p className="font-body text-sm text-charcoal/60 mt-0.5">
              {standing.length} character{standing.length !== 1 ? 's' : ''} still standing
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors"
          >
            <X size={18} className="text-charcoal" />
          </button>
        </div>

        {/* Warning */}
        <div
          className="mx-5 mb-3 px-3 py-2 rounded-xl flex items-center gap-2 flex-shrink-0"
          style={{ background: '#FF3D7122', border: '2px solid #FF3D7166' }}
        >
          <AlertTriangle size={16} className="text-cherry-punch flex-shrink-0" />
          <p className="font-body text-xs text-cherry-punch font-medium">
            Wrong guess = you lose immediately!
          </p>
        </div>

        {/* Character grid */}
        <div className="flex-1 overflow-y-auto px-5 pb-2">
          {standing.length === 0 ? (
            <p className="text-center font-body text-charcoal/40 py-8">No characters remaining</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {standing.map((char) => (
                <div key={char.id} className="flex flex-col items-center">
                  <CharacterCard
                    character={char}
                    isFlipped={false}
                    isSelected={selected === char.id}
                    isSelectable
                    onClick={() => {
                      setSelected(char.id === selected ? null : char.id);
                      setConfirming(false);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirm */}
        <div className="px-5 pb-5 pt-3 flex-shrink-0">
          <AnimatePresence>
            {confirming && selected && (
              <motion.div
                className="mb-3 px-3 py-2 rounded-xl text-center"
                style={{ background: '#FF9F1C33', border: '2px solid #FF9F1C' }}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <p className="font-display font-bold text-sm text-charcoal">
                  Sure about {characters.find((c) => c.id === selected)?.name}? This is your final answer!
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            onClick={handleConfirm}
            disabled={!selected}
            className="w-full py-4 rounded-2xl font-display font-extrabold text-lg text-white relative overflow-hidden"
            style={{
              background: !selected
                ? '#d1d5db'
                : confirming
                ? 'linear-gradient(135deg, #FF3D71, #FF9F1C)'
                : 'linear-gradient(135deg, #B565FF, #FF6BA8)',
              border: '4px solid black',
              boxShadow: !selected ? 'none' : '6px 6px 0px 0px #4EFFC4',
              cursor: !selected ? 'not-allowed' : 'pointer',
            }}
            whileHover={selected ? { scale: 1.02 } : {}}
            whileTap={selected ? { scale: 0.97 } : {}}
          >
            {!selected
              ? 'Tap a character to select'
              : confirming
              ? `✓ Confirm: ${characters.find((c) => c.id === selected)?.name}!`
              : `Guess ${characters.find((c) => c.id === selected)?.name}`}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
