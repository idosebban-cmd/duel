import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useOnboardingStore } from '../../store/onboardingStore';

interface Question {
  id: 'kids' | 'drinking' | 'smoking' | 'cannabis' | 'pets' | 'exercise';
  question: string;
  emoji: string;
  options: string[];
  gradient: string;
}

const questions: Question[] = [
  {
    id: 'kids',
    question: 'DO YOU HAVE OR WANT KIDS?',
    emoji: '👶',
    options: ['Have kids', 'Want kids someday', "Don't want kids", 'Not sure yet', 'Open to partner with kids'],
    gradient: 'linear-gradient(135deg, #FF6BA8, #B565FF)',
  },
  {
    id: 'drinking',
    question: 'HOW OFTEN DO YOU DRINK?',
    emoji: '🍹',
    options: ['Never', 'Rarely', 'Socially', 'Regularly'],
    gradient: 'linear-gradient(135deg, #FF9F1C, #FFE66D)',
  },
  {
    id: 'smoking',
    question: 'DO YOU SMOKE?',
    emoji: '🚭',
    options: ['Yes', 'No', 'Socially', 'Trying to quit'],
    gradient: 'linear-gradient(135deg, #4EFFC4, #00D9FF)',
  },
  {
    id: 'cannabis',
    question: 'DO YOU USE CANNABIS?',
    emoji: '🌿',
    options: ['Never', 'Occasionally', 'Regularly', 'Prefer not to say'],
    gradient: 'linear-gradient(135deg, #CAFFBF, #4EFFC4)',
  },
  {
    id: 'pets',
    question: 'HOW DO YOU FEEL ABOUT PETS?',
    emoji: '🐾',
    options: ['Have a dog', 'Have a cat', 'Want pets', 'Allergic to pets', 'Not interested in pets'],
    gradient: 'linear-gradient(135deg, #FF9F1C, #FF6BA8)',
  },
  {
    id: 'exercise',
    question: 'HOW OFTEN DO YOU EXERCISE?',
    emoji: '💪',
    options: ['Daily', 'Few times a week', 'Occasionally', 'Rarely'],
    gradient: 'linear-gradient(135deg, #B565FF, #FF3D71)',
  },
];

const optionColors = [
  { bg: '#FF6BA8', glow: 'rgba(255,107,168,0.4)', text: 'white' },
  { bg: '#4EFFC4', glow: 'rgba(78,255,196,0.4)', text: '#2D3142' },
  { bg: '#B565FF', glow: 'rgba(181,101,255,0.4)', text: 'white' },
  { bg: '#FF9F1C', glow: 'rgba(255,159,28,0.4)', text: 'white' },
  { bg: '#00D9FF', glow: 'rgba(0,217,255,0.4)', text: '#2D3142' },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 100 : -100, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -100 : 100, opacity: 0 }),
};

export function LifestyleQuestions() {
  const navigate = useNavigate();
  const {
    kids, drinking, smoking, cannabis, pets, exercise,
    updateLifestyle, completeStep,
  } = useOnboardingStore();

  const answers = { kids, drinking, smoking, cannabis, pets, exercise };

  const [currentQ, setCurrentQ] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isSelecting, setIsSelecting] = useState(false);

  const question = questions[currentQ];
  const currentAnswer = answers[question.id];

  const handleSelect = async (option: string) => {
    if (isSelecting) return;
    setIsSelecting(true);
    updateLifestyle(question.id, option);

    // Auto-advance after brief delay
    await new Promise((r) => setTimeout(r, 350));

    if (currentQ < questions.length - 1) {
      setDirection(1);
      setCurrentQ((q) => q + 1);
    } else {
      completeStep(6);
      navigate('/onboarding/preview');
    }
    setIsSelecting(false);
  };

  const handleBack = () => {
    if (currentQ > 0) {
      setDirection(-1);
      setCurrentQ((q) => q - 1);
    } else {
      navigate('/onboarding/relationship-goals');
    }
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
      setDirection(1);
      setCurrentQ((q) => q + 1);
    } else if (answers[question.id]) {
      completeStep(6);
      navigate('/onboarding/preview');
    }
  };

  const handleSkip = () => {
    if (currentQ < questions.length - 1) {
      setDirection(1);
      setCurrentQ((q) => q + 1);
    } else {
      completeStep(6);
      navigate('/onboarding/preview');
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #FFF8F0 0%, #F5F0FF 50%, #F0FFF8 100%)' }}
    >
      {/* Top bar */}
      <div className="flex items-center px-4 sm:px-6 py-4 gap-4">
        <motion.button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-charcoal/60 font-body font-medium hover:text-charcoal transition-colors flex-shrink-0"
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Back</span>
        </motion.button>

        <div className="flex-1 text-center">
          <span className="font-display font-bold text-sm text-charcoal/50 tracking-widest uppercase">
            Lifestyle
          </span>
          <div className="flex gap-1 mt-1.5 justify-center">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="h-1.5 rounded-full"
                style={{
                  width: i === 6 ? 24 : 8,
                  background: i <= 6
                    ? 'linear-gradient(90deg, #FF6BA8, #B565FF)'
                    : '#e5e7eb',
                }}
              />
            ))}
          </div>
        </div>

        <motion.button
          onClick={handleNext}
          disabled={!answers[question.id]}
          className="flex items-center gap-1 font-body font-medium text-sm flex-shrink-0"
          style={{
            color: answers[question.id] ? '#FF6BA8' : 'rgba(45,49,66,0.3)',
            cursor: answers[question.id] ? 'pointer' : 'default',
          }}
          whileHover={answers[question.id] ? { x: 2 } : {}}
          whileTap={answers[question.id] ? { scale: 0.95 } : {}}
        >
          <span>Next</span>
          <ArrowRight size={18} />
        </motion.button>
      </div>

      {/* Question progress dots */}
      <div className="flex justify-center gap-2 px-4 mb-4">
        {questions.map((_, i) => (
          <motion.div
            key={i}
            className="rounded-full"
            style={{
              width: i === currentQ ? 24 : 8,
              height: 8,
              background: i < currentQ
                ? 'linear-gradient(90deg, #FF6BA8, #B565FF)'
                : i === currentQ
                ? question.gradient
                : '#e5e7eb',
              border: i === currentQ ? '2px solid black' : 'none',
            }}
            animate={{ width: i === currentQ ? 24 : 8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          />
        ))}
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col px-4 sm:px-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentQ}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="max-w-lg mx-auto w-full"
          >
            {/* Question card header */}
            <div
              className="relative p-6 rounded-3xl mb-6 text-center overflow-hidden"
              style={{
                background: question.gradient,
                border: '4px solid #000',
                boxShadow: '8px 8px 0px 0px rgba(0,0,0,0.15)',
              }}
            >
              {/* Glossy */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none rounded-3xl" />

              {/* Question number */}
              <div className="flex justify-between items-center mb-3">
                <span className="font-mono text-xs font-bold text-white/70 bg-black/20 px-2 py-1 rounded-lg">
                  Q{currentQ + 1}
                </span>
                <span className="font-mono text-xs font-bold text-white/70">
                  {currentQ + 1} / {questions.length}
                </span>
              </div>

              <motion.span
                className="block text-5xl mb-3"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {question.emoji}
              </motion.span>
              <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white drop-shadow-sm leading-tight"
                style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.15)' }}
              >
                {question.question}
              </h2>

              {currentAnswer && (
                <motion.div
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-body font-semibold text-white bg-black/25"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <span>✓</span>
                  <span>{currentAnswer}</span>
                </motion.div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-3">
              {question.options.map((option, i) => {
                const isSelected = currentAnswer === option;
                const color = optionColors[i % optionColors.length];

                return (
                  <motion.button
                    key={option}
                    onClick={() => handleSelect(option)}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left relative overflow-hidden"
                    style={{
                      background: isSelected ? color.bg : 'white',
                      border: isSelected ? '3px solid #000' : '3px solid #000',
                      boxShadow: isSelected
                        ? `0 0 0 2px ${color.bg}, 0 0 20px ${color.glow}, 6px 6px 0px 0px ${color.bg}`
                        : '4px 4px 0px 0px rgba(0,0,0,0.12)',
                      cursor: 'pointer',
                    }}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0, scale: isSelected ? 1.03 : 1 }}
                    transition={{
                      delay: i * 0.05,
                      scale: { type: 'spring', stiffness: 400, damping: 17 },
                    }}
                    whileHover={{ scale: isSelected ? 1.03 : 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    aria-pressed={isSelected}
                  >
                    {isSelected && (
                      <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                    )}

                    {/* Option number */}
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono font-bold flex-shrink-0"
                      style={{
                        background: isSelected ? 'rgba(0,0,0,0.2)' : '#f5f5f5',
                        color: isSelected ? 'white' : '#2D3142',
                        border: isSelected ? '2px solid rgba(255,255,255,0.3)' : '2px solid transparent',
                      }}
                    >
                      {isSelected ? '✓' : i + 1}
                    </span>

                    <span
                      className="font-display font-bold text-lg flex-1"
                      style={{ color: isSelected ? color.text : '#2D3142' }}
                    >
                      {option}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Skip / hint row */}
            <div className="flex items-center justify-between mt-4">
              <p className="font-body text-xs text-charcoal/35">
                Select an option to automatically advance
              </p>
              <button
                onClick={handleSkip}
                className="font-body text-xs text-charcoal/40 hover:text-charcoal/60 transition-colors underline underline-offset-2 flex-shrink-0 ml-3"
              >
                Skip →
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress summary */}
      <div className="px-4 sm:px-6 py-4 border-t border-black/5 bg-cream/80 backdrop-blur-sm">
        <div className="max-w-lg mx-auto">
          <div className="flex gap-2 flex-wrap justify-center">
            {questions.map((q, i) => {
              const answered = answers[q.id];
              return (
                <motion.button
                  key={q.id}
                  onClick={() => {
                    setDirection(i < currentQ ? -1 : 1);
                    setCurrentQ(i);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-semibold"
                  style={{
                    background: i === currentQ
                      ? 'linear-gradient(135deg, #FF6BA8, #B565FF)'
                      : answered ? '#e8f5e9' : '#f5f5f5',
                    border: '2px solid',
                    borderColor: i === currentQ ? '#000' : answered ? '#4EFFC4' : '#e5e7eb',
                    color: i === currentQ ? 'white' : answered ? '#2D3142' : '#9ca3af',
                    cursor: 'pointer',
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>{q.emoji}</span>
                  {answered && <span>✓</span>}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
