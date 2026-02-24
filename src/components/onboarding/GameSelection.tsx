import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { useOnboardingStore } from '../../store/onboardingStore';

interface GameType {
  id: string;
  name: string;
  emoji: string;
  color: string;
  gradient: string;
}

const gameTypes: GameType[] = [
  { id: 'trivia', name: 'Trivia & Quizzes', emoji: '🎯', color: '#FF3D71', gradient: 'linear-gradient(135deg, #FF3D71, #FF9F1C)' },
  { id: 'puzzles', name: 'Puzzles', emoji: '🧩', color: '#B565FF', gradient: 'linear-gradient(135deg, #B565FF, #00D9FF)' },
  { id: 'drawing', name: 'Drawing & Creative', emoji: '🎨', color: '#FF6BA8', gradient: 'linear-gradient(135deg, #FF6BA8, #FFE66D)' },
  { id: 'word', name: 'Word Games', emoji: '💬', color: '#4EFFC4', gradient: 'linear-gradient(135deg, #4EFFC4, #00D9FF)' },
  { id: 'board', name: 'Board Games', emoji: '🎲', color: '#FF9F1C', gradient: 'linear-gradient(135deg, #FF9F1C, #FFE66D)' },
  { id: 'video', name: 'Video Games', emoji: '🎮', color: '#B565FF', gradient: 'linear-gradient(135deg, #B565FF, #FF3D71)' },
  { id: 'card', name: 'Card Games', emoji: '🃏', color: '#FF3D71', gradient: 'linear-gradient(135deg, #FF3D71, #B565FF)' },
  { id: 'competitive', name: 'Competitive', emoji: '⚔️', color: '#FF6BA8', gradient: 'linear-gradient(135deg, #FF6BA8, #FF3D71)' },
  { id: 'coop', name: 'Co-op', emoji: '🤝', color: '#4EFFC4', gradient: 'linear-gradient(135deg, #4EFFC4, #FFE66D)' },
  { id: 'party', name: 'Party Games', emoji: '🎪', color: '#FFE66D', gradient: 'linear-gradient(135deg, #FFE66D, #FF9F1C)' },
  { id: 'strategy', name: 'Strategy', emoji: '♟️', color: '#00D9FF', gradient: 'linear-gradient(135deg, #00D9FF, #B565FF)' },
  { id: 'rpg', name: 'Role-playing', emoji: '🎭', color: '#B565FF', gradient: 'linear-gradient(135deg, #B565FF, #FF6BA8)' },
  { id: 'active', name: 'Active Games', emoji: '🏃', color: '#4EFFC4', gradient: 'linear-gradient(135deg, #4EFFC4, #FF9F1C)' },
  { id: 'mobile', name: 'Mobile Games', emoji: '📱', color: '#FF9F1C', gradient: 'linear-gradient(135deg, #FF9F1C, #4EFFC4)' },
];

const MIN_SELECTION = 3;
const MAX_SELECTION = 8;

export function GameSelection() {
  const navigate = useNavigate();
  const { gameTypes: storedTypes, favoriteGames: storedFavorites, updateGameTypes, updateFavoriteGames, completeStep } = useOnboardingStore();

  const [selected, setSelected] = useState<string[]>(storedTypes);
  const [favorites, setFavorites] = useState<string[]>(
    storedFavorites.length > 0 ? storedFavorites : ['', '', '', '', '']
  );

  const toggleType = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((s) => s !== id);
      }
      if (prev.length >= MAX_SELECTION) return prev;
      return [...prev, id];
    });
  };

  const updateFavorite = (index: number, value: string) => {
    setFavorites((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const clearFavorite = (index: number) => {
    setFavorites((prev) => {
      const next = [...prev];
      next[index] = '';
      return next;
    });
  };

  const canContinue = selected.length >= MIN_SELECTION;

  const handleContinue = () => {
    updateGameTypes(selected);
    updateFavoriteGames(favorites.filter(Boolean));
    completeStep(4);
    navigate('/onboarding/relationship-goals');
  };

  const selectionColor = selected.length < MIN_SELECTION
    ? '#FF3D71'
    : selected.length === MAX_SELECTION
    ? '#4EFFC4'
    : '#FF6BA8';

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #FFF8F0 0%, #F0FFF8 60%, #F5F0FF 100%)' }}
    >
      {/* Top bar */}
      <div className="flex items-center px-4 sm:px-6 py-4 gap-4">
        <motion.button
          onClick={() => navigate('/onboarding/photos')}
          className="flex items-center gap-1.5 text-charcoal/60 font-body font-medium hover:text-charcoal transition-colors flex-shrink-0"
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Back</span>
        </motion.button>

        <div className="flex-1 text-center">
          <span className="font-display font-bold text-sm text-charcoal/50 tracking-widest uppercase">
            Games
          </span>
          <div className="flex gap-1 mt-1.5 justify-center">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="h-1.5 rounded-full"
                style={{
                  width: i === 4 ? 24 : 8,
                  background: i <= 4
                    ? 'linear-gradient(90deg, #FF6BA8, #B565FF)'
                    : '#e5e7eb',
                }}
              />
            ))}
          </div>
        </div>
        <div className="w-16" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
        <div className="max-w-lg mx-auto space-y-8">
          {/* Part A: Game Types */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center mb-6">
              <h2
                className="font-display font-extrabold text-3xl sm:text-4xl mb-2"
                style={{
                  background: 'linear-gradient(135deg, #4EFFC4, #00D9FF)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                WHAT GAMES DO YOU LIKE?
              </h2>
              <p className="font-body text-base text-charcoal/60">
                Pick 3–8 game types you enjoy
              </p>
            </div>

            {/* Selection counter */}
            <motion.div
              className="flex items-center justify-between mb-4 px-1"
              animate={{ color: selectionColor }}
            >
              <span className="font-display font-bold text-sm text-charcoal/50">
                {selected.length < MIN_SELECTION && `Select at least ${MIN_SELECTION - selected.length} more`}
                {selected.length >= MIN_SELECTION && selected.length < MAX_SELECTION && 'Great picks!'}
                {selected.length === MAX_SELECTION && 'Maximum reached'}
              </span>
              <motion.span
                className="font-mono font-bold text-lg"
                style={{ color: selectionColor }}
                key={selected.length}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500 }}
              >
                {selected.length}/{MAX_SELECTION}
              </motion.span>
            </motion.div>

            {/* Game type grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {gameTypes.map((game, index) => {
                const isSelected = selected.includes(game.id);
                const isDisabled = !isSelected && selected.length >= MAX_SELECTION;
                return (
                  <motion.button
                    key={game.id}
                    onClick={() => !isDisabled && toggleType(game.id)}
                    className="relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl"
                    style={{
                      background: isSelected ? game.gradient : 'white',
                      border: isSelected ? '3px solid #000' : '3px solid #000',
                      opacity: isDisabled ? 0.4 : 1,
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      boxShadow: isSelected
                        ? `0 0 20px ${game.color}60, 5px 5px 0px 0px ${game.color}`
                        : '4px 4px 0px 0px rgba(0,0,0,0.12)',
                    }}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: isDisabled ? 0.4 : 1, scale: isSelected ? 1.04 : 1 }}
                    transition={{
                      delay: index * 0.03,
                      scale: { type: 'spring', stiffness: 400, damping: 17 },
                    }}
                    whileHover={!isDisabled ? { scale: isSelected ? 1.04 : 1.02 } : {}}
                    whileTap={!isDisabled ? { scale: 0.96 } : {}}
                    aria-pressed={isSelected}
                  >
                    {/* Glossy overlay when selected */}
                    {isSelected && (
                      <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent rounded-2xl pointer-events-none" />
                    )}

                    {/* Checkmark */}
                    {isSelected && (
                      <motion.span
                        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500 }}
                      >
                        ✓
                      </motion.span>
                    )}

                    <span className="text-3xl">{game.emoji}</span>
                    <span
                      className="font-display font-bold text-sm text-center leading-tight"
                      style={{ color: isSelected ? 'white' : '#2D3142' }}
                    >
                      {game.name}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Part B: Favorite Games (Optional) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="mb-4">
              <h3
                className="font-display font-bold text-2xl mb-1"
                style={{
                  background: 'linear-gradient(135deg, #B565FF, #FF6BA8)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                NAME SOME GAMES YOU LOVE
              </h3>
              <p className="font-body text-sm text-charcoal/50">
                Optional — helps us match you better
              </p>
            </div>

            <div className="space-y-3">
              {favorites.map((fav, i) => (
                <div key={i} className="relative">
                  <div
                    className="flex items-center rounded-2xl bg-white overflow-hidden"
                    style={{ border: '3px solid #000', boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.1)' }}
                  >
                    <span className="pl-4 text-lg">🎮</span>
                    <input
                      type="text"
                      value={fav}
                      onChange={(e) => updateFavorite(i, e.target.value)}
                      placeholder={`e.g., ${['Monopoly', 'Wordle', 'God of War', 'Stardew Valley', 'Minecraft'][i]}...`}
                      className="flex-1 px-3 py-3.5 font-body text-base text-charcoal placeholder:text-charcoal/25 bg-transparent outline-none"
                      aria-label={`Favorite game ${i + 1}`}
                    />
                    <AnimatePresence>
                      {fav && (
                        <motion.button
                          type="button"
                          onClick={() => clearFavorite(i)}
                          className="px-3 text-charcoal/30 hover:text-charcoal transition-colors"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          transition={{ type: 'spring', stiffness: 500 }}
                          aria-label="Clear"
                        >
                          <X size={16} />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-4 sm:px-6 py-6 border-t border-black/5 bg-cream/80 backdrop-blur-sm">
        <motion.button
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full max-w-lg mx-auto block font-display font-extrabold text-xl text-white rounded-2xl py-4 px-8 relative overflow-hidden"
          style={{
            background: canContinue
              ? 'linear-gradient(135deg, #4EFFC4 0%, #B565FF 100%)'
              : '#d1d5db',
            border: '4px solid black',
            boxShadow: canContinue ? '8px 8px 0px 0px #FF9F1C' : 'none',
            cursor: canContinue ? 'pointer' : 'not-allowed',
            textShadow: canContinue ? '1px 1px 0 rgba(0,0,0,0.2)' : 'none',
            color: canContinue ? '#2D3142' : 'white',
          }}
          whileHover={canContinue ? { scale: 1.02, boxShadow: '10px 10px 0px 0px #FF9F1C' } : {}}
          whileTap={canContinue ? { scale: 0.97 } : {}}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          {canContinue && (
            <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
          )}
          Continue →
        </motion.button>
      </div>
    </div>
  );
}
