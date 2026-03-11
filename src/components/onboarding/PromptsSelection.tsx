import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shuffle, Pencil, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useOnboardingStore, type UserPrompt } from '../../store/onboardingStore';

// ─── Prompt library ───────────────────────────────────────────────────────────

const ALL_PROMPTS: Omit<UserPrompt, 'answer'>[] = [
  // Games & Competition
  { id: 1,  category: 'games',       icon: '🎮', question: "I'm weirdly competitive about..." },
  { id: 2,  category: 'games',       icon: '🎮', question: "The game I'll always beat you at is..." },
  { id: 3,  category: 'games',       icon: '🎮', question: "My most embarrassing game rage quit moment..." },
  { id: 4,  category: 'games',       icon: '🎮', question: "My secret gaming talent is..." },
  { id: 5,  category: 'games',       icon: '🎮', question: "The last game that made me laugh was..." },
  { id: 6,  category: 'games',       icon: '🎮', question: "I once stayed up until 3am playing..." },
  { id: 7,  category: 'games',       icon: '🎮', question: "My childhood game obsession was..." },
  { id: 8,  category: 'games',       icon: '🎮', question: "The one game I refuse to play is..." },
  { id: 9,  category: 'games',       icon: '🎮', question: "My go-to move in any game is..." },
  { id: 10, category: 'games',       icon: '🎮', question: "I'd describe my gaming style as..." },
  { id: 11, category: 'games',       icon: '🎮', question: "The game that best represents me is..." },
  { id: 12, category: 'games',       icon: '🎮', question: "If I could only play one game forever..." },
  { id: 13, category: 'games',       icon: '🎮', question: "The game I'm terrible at but love anyway..." },
  { id: 14, category: 'games',       icon: '🎮', question: "My board game night essential is..." },
  { id: 15, category: 'games',       icon: '🎮', question: "I'd challenge you to..." },
  { id: 16, category: 'games',       icon: '🎮', question: "The game I wish existed..." },
  { id: 17, category: 'games',       icon: '🎮', question: "My signature victory dance is..." },
  { id: 18, category: 'games',       icon: '🎮', question: "My most creative way to win a game..." },
  { id: 19, category: 'games',       icon: '🎮', question: "My game night red flag is..." },
  { id: 20, category: 'games',       icon: '🎮', question: "I take this game way too seriously..." },
  // Random Fun
  { id: 21, category: 'fun',         icon: '🎲', question: "My most useless skill is..." },
  { id: 22, category: 'fun',         icon: '🎲', question: "I'm the type of person who..." },
  { id: 23, category: 'fun',         icon: '🎲', question: "My hot take that gets people riled up..." },
  { id: 24, category: 'fun',         icon: '🎲', question: "Something I'll never shut up about..." },
  { id: 25, category: 'fun',         icon: '🎲', question: "The hill I'll die on is..." },
  { id: 26, category: 'fun',         icon: '🎲', question: "My guilty pleasure is..." },
  { id: 27, category: 'fun',         icon: '🎲', question: "I'm secretly a nerd about..." },
  { id: 28, category: 'fun',         icon: '🎲', question: "The last thing that made me LOL..." },
  { id: 29, category: 'fun',         icon: '🎲', question: "My unpopular opinion is..." },
  { id: 30, category: 'fun',         icon: '🎲', question: "I have an irrational fear of..." },
  { id: 31, category: 'fun',         icon: '🎲', question: "My party trick is..." },
  { id: 32, category: 'fun',         icon: '🎲', question: "I'm worse than everyone at..." },
  { id: 33, category: 'fun',         icon: '🎲', question: "I'll always laugh at..." },
  { id: 34, category: 'fun',         icon: '🎲', question: "Something that always cheers me up..." },
  { id: 35, category: 'fun',         icon: '🎲', question: "My weirdest flex is..." },
  // Personality & Quirks
  { id: 36, category: 'personality', icon: '💭', question: "On a Sunday you'll find me..." },
  { id: 37, category: 'personality', icon: '💭', question: "My perfect day includes..." },
  { id: 38, category: 'personality', icon: '💭', question: "I geek out over..." },
  { id: 39, category: 'personality', icon: '💭', question: "Don't invite me to this because..." },
  { id: 40, category: 'personality', icon: '💭', question: "My idea of a good time is..." },
  { id: 41, category: 'personality', icon: '💭', question: "I'm looking for someone who can..." },
  { id: 42, category: 'personality', icon: '💭', question: "The way to my heart is..." },
  { id: 43, category: 'personality', icon: '💭', question: "Green flags I look for..." },
  { id: 44, category: 'personality', icon: '💭', question: "My love language is..." },
  { id: 45, category: 'personality', icon: '💭', question: "I value people who..." },
  { id: 46, category: 'personality', icon: '💭', question: "My chaotic energy comes out when..." },
  { id: 47, category: 'personality', icon: '💭', question: "I'm at my best when..." },
  { id: 48, category: 'personality', icon: '💭', question: "You'll know we vibe if..." },
  { id: 49, category: 'personality', icon: '💭', question: "My comfort zone is..." },
  { id: 50, category: 'personality', icon: '💭', question: "I'm looking for someone who..." },
  // Playful Challenge
  { id: 51, category: 'playful',     icon: '🔥', question: "Bet you can't beat me at..." },
  { id: 52, category: 'playful',     icon: '🔥', question: "Think you can handle..." },
  { id: 53, category: 'playful',     icon: '🔥', question: "I dare you to..." },
  { id: 54, category: 'playful',     icon: '🔥', question: "Try and guess my..." },
  { id: 55, category: 'playful',     icon: '🔥', question: "If you can make me laugh with..." },
  { id: 56, category: 'playful',     icon: '🔥', question: "Challenge accepted if you can..." },
  { id: 57, category: 'playful',     icon: '🔥', question: "Prove me wrong about..." },
  { id: 58, category: 'playful',     icon: '🔥', question: "I bet you've never..." },
  { id: 59, category: 'playful',     icon: '🔥', question: "Can you keep up with..." },
  { id: 60, category: 'playful',     icon: '🔥', question: "Think you're ready for..." },
];

const CATEGORIES = [
  { key: 'games',       label: 'Games & Competition', icon: '🎮', color: '#00F5FF', glow: 'rgba(0,245,255,0.3)' },
  { key: 'fun',         label: 'Random Fun',          icon: '🎲', color: '#FFE66D', glow: 'rgba(255,230,109,0.3)' },
  { key: 'personality', label: 'Personality & Quirks',icon: '💭', color: '#B565FF', glow: 'rgba(181,101,255,0.3)' },
  { key: 'playful',     label: 'Playful Challenge',   icon: '🔥', color: '#FF6BA8', glow: 'rgba(255,107,168,0.3)' },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  games: '#00F5FF', fun: '#FFE66D', personality: '#B565FF', playful: '#FF6BA8',
};

const MAX_CHARS = 150;

// ─── PromptCard (selected prompt with answer input) ──────────────────────────

function SelectedPromptCard({
  prompt,
  onRemove,
  onAnswerChange,
}: {
  prompt: UserPrompt;
  onRemove: () => void;
  onAnswerChange: (answer: string) => void;
}) {
  const color = CATEGORY_COLORS[prompt.category];
  const remaining = MAX_CHARS - prompt.answer.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="rounded-xl overflow-hidden relative"
      style={{
        background: '#0A1628',
        border: `2px solid ${color}`,
        boxShadow: `0 0 16px ${color}30, 4px 4px 0 rgba(0,0,0,0.4)`,
        padding: 16,
      }}
    >
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        <X size={12} color="rgba(255,255,255,0.5)" />
      </button>

      {/* Icon + question */}
      <div className="flex items-start gap-2 mb-3 pr-8">
        <span className="text-xl flex-shrink-0 mt-0.5">{prompt.icon}</span>
        <p className="font-body text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {prompt.question}
        </p>
      </div>

      {/* Answer input */}
      <textarea
        value={prompt.answer}
        onChange={(e) => onAnswerChange(e.target.value.slice(0, MAX_CHARS))}
        placeholder="Be specific and playful! Show your personality."
        rows={3}
        className="w-full resize-none outline-none font-body text-sm leading-relaxed rounded-lg px-3 py-2.5"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${color}40`,
          color: 'rgba(255,255,255,0.9)',
          caretColor: color,
        }}
      />

      {/* Character counter */}
      <div className="flex justify-end mt-1.5">
        <span
          className="font-body text-xs"
          style={{ color: remaining < 20 ? '#FF6BA8' : 'rgba(255,255,255,0.25)' }}
        >
          {prompt.answer.length}/{MAX_CHARS}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Prompt list item ─────────────────────────────────────────────────────────

function PromptListItem({
  prompt,
  isSelected,
  isDisabled,
  onSelect,
}: {
  prompt: Omit<UserPrompt, 'answer'>;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: () => void;
}) {
  const color = CATEGORY_COLORS[prompt.category];
  return (
    <motion.button
      onClick={onSelect}
      disabled={isDisabled && !isSelected}
      className="w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3"
      style={{
        background: isSelected ? `${color}18` : 'rgba(255,255,255,0.03)',
        border: `1.5px solid ${isSelected ? color : 'rgba(255,255,255,0.07)'}`,
        opacity: isDisabled && !isSelected ? 0.35 : 1,
        cursor: isDisabled && !isSelected ? 'not-allowed' : 'pointer',
      }}
      whileTap={!isDisabled || isSelected ? { scale: 0.97 } : {}}
    >
      <span className="text-base flex-shrink-0">{prompt.icon}</span>
      <span className="font-body text-sm leading-snug" style={{ color: isSelected ? color : 'rgba(255,255,255,0.65)' }}>
        {prompt.question}
      </span>
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="ml-auto flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: color }}
        >
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="#0A1628" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      )}
    </motion.button>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────

function CategorySection({
  category,
  prompts,
  selectedIds,
  isMaxSelected,
  onToggle,
}: {
  category: typeof CATEGORIES[number];
  prompts: Omit<UserPrompt, 'answer'>[];
  selectedIds: Set<number>;
  isMaxSelected: boolean;
  onToggle: (p: Omit<UserPrompt, 'answer'>) => void;
}) {
  const [open, setOpen] = useState(category.key === 'games');

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3"
      >
        <span className="text-xl">{category.icon}</span>
        <span className="flex-1 text-left font-body text-sm font-bold" style={{ color: category.color }}>
          {category.label}
        </span>
        <span className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {prompts.filter(p => selectedIds.has(p.id)).length > 0 && `${prompts.filter(p => selectedIds.has(p.id)).length} selected`}
        </span>
        {open ? <ChevronUp size={16} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={16} color="rgba(255,255,255,0.3)" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 flex flex-col gap-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="h-2" />
              {prompts.map(p => (
                <PromptListItem
                  key={p.id}
                  prompt={p}
                  isSelected={selectedIds.has(p.id)}
                  isDisabled={isMaxSelected}
                  onSelect={() => onToggle(p)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function PromptsSelection() {
  const navigate = useNavigate();
  const { userPrompts, updatePrompts, completeStep } = useOnboardingStore();

  // Local state: working copy of selected prompts
  const [selected, setSelected] = useState<UserPrompt[]>(
    userPrompts.length > 0 ? userPrompts : []
  );

  const selectedIds = useMemo(() => new Set(selected.map(p => p.id)), [selected]);
  const isMaxSelected = selected.length >= 3;
  const isComplete = selected.length === 3 && selected.every(p => p.answer.trim().length > 0);

  const promptsByCategory = useMemo(() =>
    Object.fromEntries(
      CATEGORIES.map(c => [c.key, ALL_PROMPTS.filter(p => p.category === c.key)])
    ), []
  );

  const handleToggle = (prompt: Omit<UserPrompt, 'answer'>) => {
    if (selectedIds.has(prompt.id)) {
      setSelected(prev => prev.filter(p => p.id !== prompt.id));
    } else if (!isMaxSelected) {
      setSelected(prev => [...prev, { ...prompt, answer: '' }]);
    }
  };

  const handleAnswerChange = (id: number, answer: string) => {
    setSelected(prev => prev.map(p => p.id === id ? { ...p, answer } : p));
  };

  const handleRemove = (id: number) => {
    setSelected(prev => prev.filter(p => p.id !== id));
  };

  const handleSurpriseMe = () => {
    const categories = ['games', 'fun', 'personality', 'playful'] as const;
    const picked: Omit<UserPrompt, 'answer'>[] = [];
    const shuffled = [...ALL_PROMPTS].sort(() => Math.random() - 0.5);
    const usedCategories = new Set<string>();
    for (const p of shuffled) {
      if (picked.length >= 3) break;
      if (!usedCategories.has(p.category)) {
        picked.push(p);
        usedCategories.add(p.category);
      }
    }
    // If we don't have 3 from different categories, fill from remaining
    if (picked.length < 3) {
      for (const p of shuffled) {
        if (picked.length >= 3) break;
        if (!picked.find(x => x.id === p.id)) picked.push(p);
      }
    }
    setSelected(picked.map(p => ({ ...p, answer: '' })));
  };

  const handleContinue = () => {
    if (selected.length > 0) {
      updatePrompts(selected);
      completeStep(7);
    }
    navigate('/onboarding/preview');
  };

  const handleSkip = () => {
    navigate('/onboarding/preview');
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#12122A' }}>
      {/* Grid background */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0,245,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 4px)' }} />
      {/* Corner brackets */}
      <div className="absolute top-4 left-4 w-8 h-8 border-t-[3px] border-l-[3px] border-pixel-cyan/30 pointer-events-none" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t-[3px] border-r-[3px] border-pixel-cyan/30 pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center px-4 sm:px-6 py-4 gap-3 flex-none">
        <motion.button
          onClick={() => navigate('/onboarding/lifestyle')}
          className="flex items-center gap-1.5 font-body font-medium text-sm flex-shrink-0"
          style={{ color: 'rgba(255,255,255,0.55)' }}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </motion.button>

        <div className="flex-1 flex flex-col items-center gap-1.5">
          <span className="font-body text-xs font-bold tracking-widest uppercase" style={{ color: '#00F5FF' }}>
            Personality
          </span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-1.5 rounded-full"
                style={{
                  width: i === 7 ? 24 : 8,
                  background:
                    i < 7
                      ? '#FF6BA8'
                      : i === 7
                      ? 'linear-gradient(90deg, #00F5FF, #FF006E)'
                      : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>
        </div>

        <motion.button
          onClick={handleSkip}
          className="font-body font-medium text-sm flex-shrink-0"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          whileHover={{ color: 'rgba(255,255,255,0.8)' } as any}
          whileTap={{ scale: 0.95 }}
        >
          Skip →
        </motion.button>
      </div>

      {/* Scrollable content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 pb-6" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <div className="max-w-lg mx-auto">

          {/* Header */}
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2
              className="font-display font-extrabold text-3xl sm:text-4xl mb-2"
              style={{
                background: 'linear-gradient(135deg, #00F5FF, #FF006E)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              SHOW YOUR<br />PERSONALITY
            </h2>
            <p className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Pick 3 prompts to complete
            </p>
          </motion.div>

          {/* YOUR PROMPTS section */}
          <AnimatePresence mode="popLayout">
            {selected.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="font-display text-sm" style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.06em' }}>
                    YOUR PROMPTS ({selected.length}/3)
                  </p>
                  <motion.button
                    onClick={handleSurpriseMe}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs font-bold"
                    style={{
                      background: 'rgba(255,230,109,0.08)',
                      border: '1.5px solid rgba(255,230,109,0.25)',
                      color: '#FFE66D',
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Shuffle size={12} />
                    Surprise Me
                  </motion.button>
                </div>
                <div className="flex flex-col gap-3">
                  <AnimatePresence mode="popLayout">
                    {selected.map(p => (
                      <SelectedPromptCard
                        key={p.id}
                        prompt={p}
                        onRemove={() => handleRemove(p.id)}
                        onAnswerChange={(answer) => handleAnswerChange(p.id, answer)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Surprise me button (when nothing selected) */}
          {selected.length === 0 && (
            <motion.div className="mb-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <motion.button
                onClick={handleSurpriseMe}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-display text-base"
                style={{
                  background: 'rgba(255,230,109,0.08)',
                  border: '2px dashed rgba(255,230,109,0.3)',
                  color: '#FFE66D',
                }}
                whileHover={{ background: 'rgba(255,230,109,0.12)' } as any}
                whileTap={{ scale: 0.97 }}
              >
                <Shuffle size={18} />
                Surprise Me 🎲
              </motion.button>
            </motion.div>
          )}

          {/* Browse prompts */}
          <div className="mb-6">
            <p className="font-display text-sm mb-3" style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>
              BROWSE PROMPTS
            </p>
            <div className="flex flex-col gap-2">
              {CATEGORIES.map(cat => (
                <CategorySection
                  key={cat.key}
                  category={cat}
                  prompts={promptsByCategory[cat.key] ?? []}
                  selectedIds={selectedIds}
                  isMaxSelected={isMaxSelected}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div
        className="relative z-10 flex-none px-4 sm:px-6 py-5"
        style={{ borderTop: '1px solid rgba(0,245,255,0.12)', background: '#12122A' }}
      >
        <div className="max-w-lg mx-auto">
          <motion.button
            onClick={handleContinue}
            className="w-full font-display font-extrabold text-xl rounded-[14px] py-5 px-8 relative overflow-hidden select-none"
            style={{
              background: isComplete
                ? 'linear-gradient(135deg, #00F5FF 0%, #FF006E 100%)'
                : 'rgba(255,255,255,0.06)',
              border: isComplete
                ? '3px solid rgba(255,255,255,0.25)'
                : '3px solid rgba(255,255,255,0.08)',
              boxShadow: isComplete
                ? '0 0 28px rgba(0,245,255,0.45), 6px 6px 0px rgba(0,0,0,0.4)'
                : 'none',
              color: isComplete ? '#12122A' : 'rgba(255,255,255,0.3)',
              cursor: isComplete ? 'pointer' : 'default',
            }}
            whileHover={isComplete ? { scale: 1.02, boxShadow: '0 0 42px rgba(0,245,255,0.6), 6px 6px 0px rgba(0,0,0,0.4)' } as any : {}}
            whileTap={isComplete ? { scale: 0.97 } : {}}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            {isComplete && <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />}
            Continue →
          </motion.button>

          {!isComplete && selected.length > 0 && (
            <p className="text-center font-body text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {selected.length < 3
                ? `Pick ${3 - selected.length} more prompt${3 - selected.length !== 1 ? 's' : ''}`
                : 'Fill in your answers to continue'}
            </p>
          )}
        </div>
      </div>

      {/* Neon bottom bar */}
      <div
        className="h-[3px] w-full flex-none"
        style={{ background: 'linear-gradient(90deg, #00F5FF, #FF006E, #B565FF, #FFE66D, #00F5FF)', boxShadow: '0 0 14px rgba(0,245,255,0.6)' }}
      />
    </div>
  );
}
