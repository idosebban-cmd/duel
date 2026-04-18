import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from '../ui/Icons';
import { useOnboardingStore, ONBOARDING_PROGRESS_DOTS } from '../../store/onboardingStore';
import { useOnboardingScroll } from '../../hooks/useOnboardingScroll';

interface Question {
  id: 'kids' | 'drinking' | 'smoking' | 'cannabis' | 'pets' | 'exercise';
  question: string;
  icon: string;
  options: string[];
  gradient: string;
}

const questions: Question[] = [
  {
    id: 'kids',
    question: 'DO YOU HAVE OR WANT KIDS?',
    icon: '/Lifestyle/Baby.png',
    options: ['Have kids', 'Want kids someday', "Don't want kids", 'Not sure yet', 'Open to partner with kids'],
    gradient: 'linear-gradient(135deg, #FF6BA8, #B565FF)',
  },
  {
    id: 'drinking',
    question: 'HOW OFTEN DO YOU DRINK?',
    icon: '/Lifestyle/Cocktail.png',
    options: ['Never', 'Rarely', 'Socially', 'Regularly'],
    gradient: 'linear-gradient(135deg, #FF9F1C, #FFE66D)',
  },
  {
    id: 'smoking',
    question: 'DO YOU SMOKE?',
    icon: '/Lifestyle/Smoking.png',
    options: ['Yes', 'No', 'Socially', 'Trying to quit'],
    gradient: 'linear-gradient(135deg, #4EFFC4, #00D9FF)',
  },
  {
    id: 'cannabis',
    question: 'DO YOU USE CANNABIS?',
    icon: '/Lifestyle/Cannabis.png',
    options: ['Never', 'Occasionally', 'Regularly', 'Prefer not to say'],
    gradient: 'linear-gradient(135deg, #CAFFBF, #4EFFC4)',
  },
  {
    id: 'pets',
    question: 'HOW DO YOU FEEL ABOUT PETS?',
    icon: '/Lifestyle/Pets.png',
    options: ['Have a dog', 'Have a cat', 'Want pets', 'Allergic to pets', 'Not interested in pets'],
    gradient: 'linear-gradient(135deg, #FF9F1C, #FF6BA8)',
  },
  {
    id: 'exercise',
    question: 'HOW OFTEN DO YOU EXERCISE?',
    icon: '/Lifestyle/Exercise.png',
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

export function LifestyleQuestions() {
  const navigate = useNavigate();
  const {
    kids, drinking, smoking, cannabis, pets, exercise,
    updateLifestyle, completeStep,
  } = useOnboardingStore();

  const answers = { kids, drinking, smoking, cannabis, pets, exercise };

  const allAnswered = useMemo(
    () => questions.every((q) => answers[q.id] != null),
    [kids, drinking, smoking, cannabis, pets, exercise],
  );

  const { scrollRef } = useOnboardingScroll<HTMLDivElement>(allAnswered);

  const handleContinue = () => {
    if (!allAnswered) return;
    completeStep(8);
    navigate('/onboarding/bio');
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#12122A' }}>
      <div className="absolute top-4 left-4 w-8 h-8 border-t-[3px] border-l-[3px] border-electric-mint/40 pointer-events-none" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t-[3px] border-r-[3px] border-electric-mint/40 pointer-events-none" />

      <div className="relative z-10 flex items-center px-4 sm:px-6 py-4 gap-3 flex-shrink-0">
        <motion.button onClick={() => navigate('/onboarding/preferences')} className="flex items-center gap-1.5 font-body font-medium text-ui-body flex-shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }} whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}>
          <ArrowLeft size={24} /><span>Back</span>
        </motion.button>
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <span className="font-body text-ui-label font-bold tracking-widest uppercase" style={{ color: '#4EFFC4' }}>Lifestyle</span>
          <div className="flex gap-1">
            {ONBOARDING_PROGRESS_DOTS.map((i) => (
              <div key={i} className="h-1.5 rounded-full" style={{ width: i === 7 ? 24 : 8, background: i < 7 ? '#FF6BA8' : i === 7 ? 'linear-gradient(90deg, #4EFFC4, #FF6BA8)' : 'rgba(255,255,255,0.15)' }} />
            ))}
          </div>
        </div>
        <div className="w-14 flex-shrink-0" />
      </div>

      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 pb-36">
        <div className="max-w-lg mx-auto w-full space-y-8 py-2">
          {questions.map((question) => {
            const currentAnswer = answers[question.id];
            return (
              <motion.section
                key={question.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl overflow-hidden"
                style={{
                  border: '4px solid #000',
                  boxShadow: '8px 8px 0px 0px rgba(0,0,0,0.15)',
                }}
              >
                <div
                  className="relative p-5 sm:p-6 text-center"
                  style={{ background: question.gradient }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
                  <motion.img
                    src={question.icon}
                    alt=""
                    className="relative w-14 h-14 mx-auto mb-3 object-contain"
                    style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}
                  />
                  <h2
                    className="relative font-display font-extrabold text-lg sm:text-xl text-white leading-tight"
                    style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.15)' }}
                  >
                    {question.question}
                  </h2>
                </div>

                <div className="p-4 space-y-2.5" style={{ background: '#12122A' }}>
                  {question.options.map((option, i) => {
                    const isSelected = currentAnswer === option;
                    const color = optionColors[i % optionColors.length];
                    return (
                      <motion.button
                        key={option}
                        type="button"
                        onClick={() => updateLifestyle(question.id, option)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left relative overflow-hidden"
                        style={{
                          background: isSelected ? color.bg : 'rgba(255,255,255,0.07)',
                          border: isSelected ? `2px solid ${color.bg}` : '2px solid rgba(255,255,255,0.12)',
                          boxShadow: isSelected
                            ? `0 0 0 1px ${color.bg}, 0 0 20px ${color.glow}, 5px 5px 0px 0px ${color.bg}`
                            : 'none',
                        }}
                        whileHover={{ scale: isSelected ? 1.02 : 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        aria-pressed={isSelected}
                      >
                        {isSelected && (
                          <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                        )}
                        <span
                          className="relative w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-ui-caption flex-shrink-0"
                          style={{
                            background: isSelected ? 'rgba(0,0,0,0.2)' : '#f5f5f5',
                            color: isSelected ? 'white' : '#2D3142',
                            border: isSelected ? '2px solid rgba(255,255,255,0.3)' : '2px solid transparent',
                          }}
                        >
                          {isSelected ? '✓' : i + 1}
                        </span>
                        <span className="relative font-display font-bold text-base flex-1" style={{ color: isSelected ? color.text : 'rgba(255,255,255,0.85)' }}>
                          {option}
                        </span>
                      </motion.button>
                    );
                  })}
                  <motion.button
                    type="button"
                    onClick={() => updateLifestyle(question.id, '')}
                    className="w-full flex items-center justify-center px-4 py-3 rounded-2xl min-h-[44px]"
                    style={{
                      background: 'transparent',
                      border: '2px dashed rgba(255,255,255,0.15)',
                    }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="font-body text-ui-body" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      Prefer not to say
                    </span>
                  </motion.button>
                </div>
              </motion.section>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 px-4 sm:px-6 py-5 flex-shrink-0" style={{ borderTop: '1px solid rgba(78,255,196,0.15)', background: '#12122A' }}>
        <motion.button
          type="button"
          onClick={handleContinue}
          disabled={!allAnswered}
          className={`w-full max-w-lg mx-auto block font-display font-extrabold text-xl rounded-[14px] py-5 px-8 relative overflow-hidden select-none ${!allAnswered ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
          style={{
            background: allAnswered ? 'linear-gradient(135deg, #4EFFC4 0%, #B565FF 100%)' : 'rgba(255,255,255,0.07)',
            border: '3px solid rgba(255,255,255,0.25)',
            boxShadow: allAnswered ? '0 0 28px rgba(78,255,196,0.45), 6px 6px 0px rgba(0,0,0,0.4)' : 'none',
            color: allAnswered ? '#12122A' : 'rgba(255,255,255,0.2)',
            cursor: allAnswered ? 'pointer' : 'not-allowed',
          }}
          whileHover={allAnswered ? { scale: 1.03, boxShadow: '0 0 42px rgba(78,255,196,0.65), 6px 6px 0px rgba(0,0,0,0.4)' } : {}}
          whileTap={allAnswered ? { scale: 0.97 } : {}}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          {allAnswered && <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />}
          Continue →
        </motion.button>
      </div>

      <div className="h-[3px] w-full flex-shrink-0" style={{ background: 'linear-gradient(90deg, #FF6BA8, #FFE66D, #4EFFC4, #B565FF, #FF6BA8)', boxShadow: '0 0 14px rgba(78,255,196,0.7)' }} />
    </div>
  );
}
