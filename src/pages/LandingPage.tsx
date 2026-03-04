import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function FadeIn({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

/** CRT corner brackets for a section */
function CrtBrackets({ color = 'rgba(78,255,196,0.5)' }: { color?: string }) {
  const style = { borderColor: color };
  return (
    <>
      <div className="absolute top-4 left-4 w-10 h-10 border-t-[3px] border-l-[3px] pointer-events-none" style={style} />
      <div className="absolute top-4 right-4 w-10 h-10 border-t-[3px] border-r-[3px] pointer-events-none" style={style} />
      <div className="absolute bottom-4 left-4 w-10 h-10 border-b-[3px] border-l-[3px] pointer-events-none" style={style} />
      <div className="absolute bottom-4 right-4 w-10 h-10 border-b-[3px] border-r-[3px] pointer-events-none" style={style} />
    </>
  );
}

/** Section headline */
function SectionHeader({
  text,
  gradient,
}: {
  text: string;
  gradient: string;
}) {
  return (
    <h2
      className="font-display text-center mb-10 leading-tight"
      style={{
        fontSize: 'clamp(28px, 5vw, 42px)',
        background: gradient,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        filter: 'drop-shadow(0 0 14px rgba(255,255,255,0.15))',
      }}
    >
      {text}
    </h2>
  );
}

// ─── Confetti particles ────────────────────────────────────────────────────────

const confettiItems = ['⭐', '❤️', '🪙', '⚡', '✨', '💎', '🌟', '🎮'];

function Confetti() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute text-2xl select-none"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-30px',
          }}
          animate={{
            y: ['0px', '600px'],
            rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 2.5 + Math.random() * 1.5,
            delay: Math.random() * 1.5,
            ease: 'easeIn',
            repeat: Infinity,
            repeatDelay: Math.random() * 3,
          }}
        >
          {confettiItems[i % confettiItems.length]}
        </motion.span>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LandingPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Clear any persisted onboarding state so stale data can't trigger redirects
  useEffect(() => {
    localStorage.removeItem('duel-onboarding');
    sessionStorage.removeItem('duel-photos');
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError('');
    // TODO: integrate with Mailchimp / ConvertKit / Airtable
    console.log('Waitlist email:', trimmed);
    setSubmitted(true);
  }

  return (
    <div
      className="min-h-screen font-body text-white overflow-x-hidden"
      style={{ background: '#0A1628' }}
    >
      {/* Global grid background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(78,255,196,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(78,255,196,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Global scanlines */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-30"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)',
        }}
      />

      <div className="relative z-10">

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 1 – HERO
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-20 overflow-hidden">
          <CrtBrackets />

          {/* Ambient glow orbs */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '10%', left: '5%', width: 400, height: 400,
              background: 'radial-gradient(circle, rgba(181,101,255,0.12) 0%, transparent 65%)',
              borderRadius: '50%',
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: '15%', right: '5%', width: 350, height: 350,
              background: 'radial-gradient(circle, rgba(255,107,168,0.12) 0%, transparent 65%)',
              borderRadius: '50%',
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              top: '40%', right: '15%', width: 250, height: 250,
              background: 'radial-gradient(circle, rgba(78,255,196,0.08) 0%, transparent 65%)',
              borderRadius: '50%',
            }}
          />

          {/* Floating decorative elements */}
          {[
            { emoji: '⭐', x: '6%',  y: '12%', delay: 0,    size: '2rem', rotate: -15 },
            { emoji: '❤️', x: '88%', y: '10%', delay: 0.4,  size: '1.8rem', rotate: 8 },
            { emoji: '🍕', x: '4%',  y: '78%', delay: 0.7,  size: '2rem', rotate: 12 },
            { emoji: '⚡', x: '90%', y: '75%', delay: 0.2,  size: '1.8rem', rotate: -10 },
            { emoji: '🎮', x: '82%', y: '42%', delay: 0.9,  size: '1.6rem', rotate: 5 },
            { emoji: '💫', x: '10%', y: '46%', delay: 0.5,  size: '1.4rem', rotate: -5 },
          ].map((el, i) => (
            <motion.div
              key={i}
              className="absolute select-none pointer-events-none hidden sm:block"
              style={{ left: el.x, top: el.y, fontSize: el.size }}
              animate={{
                y: [0, -12, 0],
                rotate: [el.rotate, el.rotate + 8, el.rotate],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 3 + i * 0.4,
                repeat: Infinity,
                delay: el.delay,
                ease: 'easeInOut',
              }}
            >
              {el.emoji}
            </motion.div>
          ))}

          {/* Hero content */}
          <motion.div
            className="relative z-10 flex flex-col items-center text-center max-w-2xl w-full"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            {/* Logo + headline */}
            <motion.div
              className="mb-3"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.1 }}
            >
              <div
                className="text-6xl mb-2 select-none"
                style={{ filter: 'drop-shadow(0 0 20px rgba(255,159,28,0.6))' }}
              >
                ⚔️
              </div>
              <h1
                className="font-display leading-none"
                style={{
                  fontSize: 'clamp(56px, 14vw, 96px)',
                  color: '#FFE66D',
                  textShadow:
                    '0 0 20px rgba(255,230,109,0.9), 0 0 60px rgba(255,230,109,0.4), 4px 4px 0px #FF9F1C, 8px 8px 0px rgba(0,0,0,0.5)',
                  letterSpacing: '0.06em',
                }}
              >
                DUEL
              </h1>
            </motion.div>

            {/* PLAYER 1 START */}
            <motion.div
              className="flex items-center gap-3 w-full mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(78,255,196,0.45))' }} />
              <motion.span
                className="font-display text-sm tracking-widest"
                style={{ color: '#4EFFC4', textShadow: '0 0 10px rgba(78,255,196,0.7)' }}
                animate={{ opacity: [1, 0.25, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                PLAYER 1 START
              </motion.span>
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(78,255,196,0.45), transparent)' }} />
            </motion.div>

            {/* Tagline */}
            <motion.p
              className="font-body text-xl sm:text-2xl mb-8 leading-snug"
              style={{ color: 'rgba(255,255,255,0.85)' }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              Play games together.{' '}
              <span style={{ color: '#FF6BA8', textShadow: '0 0 12px rgba(255,107,168,0.6)' }}>
                Skip the awkward texts.
              </span>
            </motion.p>

            {/* Feature pills */}
            <motion.div
              className="flex gap-2 sm:gap-3 mb-10 flex-wrap justify-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
            >
              {[
                { icon: '🎮', text: 'Real connections', border: '#4EFFC4', glow: 'rgba(78,255,196,0.3)' },
                { icon: '⚔️', text: 'Games first',      border: '#FF6BA8', glow: 'rgba(255,107,168,0.3)' },
                { icon: '🚫', text: 'No cringe DMs',    border: '#B565FF', glow: 'rgba(181,101,255,0.3)' },
              ].map((pill) => (
                <span
                  key={pill.text}
                  className="flex items-center gap-2 px-4 py-2 rounded-full font-body text-sm font-bold"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: `2px solid ${pill.border}`,
                    boxShadow: `0 0 12px ${pill.glow}`,
                    color: '#fff',
                  }}
                >
                  <span>{pill.icon}</span>
                  {pill.text}
                </span>
              ))}
            </motion.div>

            {/* CTA button */}
            <motion.button
              onClick={() => navigate('/onboarding/welcome')}
              className="relative overflow-hidden w-full sm:w-auto sm:min-w-[360px] font-display text-2xl rounded-2xl py-5 px-10 cursor-pointer select-none block text-center"
              style={{
                background: 'linear-gradient(135deg, #4EFFC4 0%, #FF6BA8 100%)',
                border: '3px solid rgba(255,255,255,0.2)',
                boxShadow: '0 0 36px rgba(78,255,196,0.5), 0 0 60px rgba(255,107,168,0.3), 6px 6px 0px rgba(0,0,0,0.35)',
                color: '#0A1628',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              whileHover={{
                scale: 1.05,
                boxShadow: '0 0 60px rgba(78,255,196,0.75), 0 0 90px rgba(255,107,168,0.5), 6px 6px 0px rgba(0,0,0,0.35)',
              }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-2xl" />
              INSERT COIN →
            </motion.button>

            <motion.p
              className="mt-4 font-body text-sm"
              style={{ color: 'rgba(255,255,255,0.3)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              Free to join · Launching Spring 2026 in London
            </motion.p>
          </motion.div>

          {/* Bottom neon bar */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-[3px]"
            style={{
              background: 'linear-gradient(90deg, #FF6BA8, #FFE66D, #4EFFC4, #B565FF, #FF6BA8)',
              boxShadow: '0 0 16px rgba(78,255,196,0.7)',
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
          />
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 2 – THE PROBLEM
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="relative px-6 py-20 overflow-hidden">
          {/* Section glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(255,107,168,0.07) 0%, transparent 60%)',
            }}
          />

          <div className="relative z-10 max-w-5xl mx-auto">
            <FadeIn>
              <SectionHeader
                text="LEVEL 1: THE PROBLEM"
                gradient="linear-gradient(135deg, #FF6BA8 0%, #FF3D71 100%)"
              />
            </FadeIn>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  emoji: '😬',
                  title: '"Hey..."',
                  titleColor: '#FFE66D',
                  border: '#FFE66D',
                  glow: 'rgba(255,230,109,0.2)',
                  body: '54% of dating app users feel anxious about first messages. You\'re stuck trying to be clever with strangers.',
                },
                {
                  emoji: '💀',
                  title: 'Dead Chats',
                  titleColor: '#FF6BA8',
                  border: '#FF6BA8',
                  glow: 'rgba(255,107,168,0.2)',
                  body: '69% of conversations die within days. Boring small talk kills chemistry before it starts.',
                },
                {
                  emoji: '📱',
                  title: 'All Text, No Vibe',
                  titleColor: '#4EFFC4',
                  border: '#4EFFC4',
                  glow: 'rgba(78,255,196,0.2)',
                  body: "Reading someone's bio tells you nothing. You need to experience them to know if there's a spark.",
                },
              ].map((card, i) => (
                <FadeIn key={card.title} delay={i * 0.12}>
                  <div
                    className="rounded-2xl p-6 h-full"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `2px solid ${card.border}`,
                      boxShadow: `0 0 24px ${card.glow}, inset 0 0 20px rgba(0,0,0,0.2)`,
                    }}
                  >
                    <div className="text-5xl mb-4 select-none">{card.emoji}</div>
                    <h3
                      className="font-display text-2xl mb-3 leading-tight"
                      style={{ color: card.titleColor }}
                    >
                      {card.title}
                    </h3>
                    <p className="font-body text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      {card.body}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3 – THE SOLUTION
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="relative px-6 py-20 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, rgba(78,255,196,0.06) 0%, transparent 65%)',
            }}
          />

          <div className="relative z-10 max-w-5xl mx-auto">
            <FadeIn>
              <SectionHeader
                text="LEVEL 2: PLAY FIRST"
                gradient="linear-gradient(135deg, #4EFFC4 0%, #00D9FF 100%)"
              />
            </FadeIn>

            <FadeIn delay={0.1}>
              <p
                className="font-body text-lg sm:text-xl text-center mb-10 max-w-2xl mx-auto leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.8)' }}
              >
                Duel is a dating app where your{' '}
                <span style={{ color: '#FF6BA8', textShadow: '0 0 8px rgba(255,107,168,0.5)' }}>
                  first interaction
                </span>{' '}
                is playing a{' '}
                <span style={{ color: '#FFE66D', textShadow: '0 0 8px rgba(255,230,109,0.5)' }}>
                  2–5 minute game
                </span>{' '}
                together.
              </p>
            </FadeIn>

            {/* Game cards */}
            <FadeIn delay={0.2}>
              <div className="flex gap-4 sm:gap-6 justify-center flex-wrap mb-12">
                {[
                  {
                    icon: '❓',
                    name: 'Guess Who',
                    desc: 'Mystery & wit',
                    accent: '#4EFFC4',
                    glow: 'rgba(78,255,196,0.3)',
                    bg: 'rgba(78,255,196,0.05)',
                  },
                  {
                    icon: '🕹️',
                    name: 'Dot Dash',
                    desc: 'Quick reflexes',
                    accent: '#FF6BA8',
                    glow: 'rgba(255,107,168,0.3)',
                    bg: 'rgba(255,107,168,0.05)',
                  },
                  {
                    icon: '💬',
                    name: 'Caption This',
                    desc: 'Creativity & humor',
                    accent: '#B565FF',
                    glow: 'rgba(181,101,255,0.3)',
                    bg: 'rgba(181,101,255,0.05)',
                  },
                ].map((game, i) => (
                  <motion.div
                    key={game.name}
                    className="flex flex-col items-center rounded-2xl p-6 w-44"
                    style={{
                      background: game.bg,
                      border: `3px solid ${game.accent}`,
                      boxShadow: `0 0 20px ${game.glow}`,
                    }}
                    whileHover={{ scale: 1.06, boxShadow: `0 0 36px ${game.glow}` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    // stagger via transition delay
                    custom={i}
                  >
                    <div
                      className="w-24 h-24 rounded-xl flex items-center justify-center text-5xl mb-4 select-none"
                      style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: `2px solid ${game.accent}40`,
                        boxShadow: `inset 0 0 16px rgba(0,0,0,0.4)`,
                      }}
                    >
                      {game.icon}
                    </div>
                    <h3
                      className="font-display text-base text-center leading-tight mb-1"
                      style={{ color: game.accent }}
                    >
                      {game.name}
                    </h3>
                    <p className="font-body text-xs text-center" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {game.desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            </FadeIn>

            {/* Why games */}
            <FadeIn delay={0.3}>
              <div
                className="rounded-2xl p-7 max-w-xl mx-auto"
                style={{
                  background: 'rgba(255,230,109,0.04)',
                  border: '2px solid rgba(255,230,109,0.3)',
                  boxShadow: '0 0 28px rgba(255,230,109,0.1)',
                }}
              >
                <h3
                  className="font-display text-xl mb-5"
                  style={{ color: '#FFE66D', textShadow: '0 0 10px rgba(255,230,109,0.5)' }}
                >
                  Why games?
                </h3>
                <ul className="space-y-3">
                  {[
                    'Break the ice instantly (no awkward openers)',
                    'Show real personality (not performed text)',
                    'Create shared experience (inside jokes, natural conversation)',
                    'Fun > forced (dating should be playful)',
                  ].map((item) => (
                    <li key={item} className="flex gap-3 font-body text-base leading-snug">
                      <span style={{ color: '#4EFFC4', textShadow: '0 0 8px rgba(78,255,196,0.6)', flexShrink: 0 }}>✓</span>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 4 – HOW IT WORKS
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="relative px-6 py-20 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 100%, rgba(255,230,109,0.06) 0%, transparent 60%)',
            }}
          />

          <div className="relative z-10 max-w-3xl mx-auto">
            <FadeIn>
              <SectionHeader
                text="LEVEL 3: HOW TO PLAY"
                gradient="linear-gradient(135deg, #FFE66D 0%, #FF9F1C 100%)"
              />
            </FadeIn>

            <div className="flex flex-col gap-8">
              {[
                {
                  num: '1',
                  title: 'Match',
                  desc: 'Swipe like normal. When you match, she picks a game.',
                  bg: 'linear-gradient(135deg, #FF6BA8, #FF3D71)',
                  glow: 'rgba(255,107,168,0.4)',
                },
                {
                  num: '2',
                  title: 'Play',
                  desc: '2–5 minutes together. No texting, just playing.',
                  bg: 'linear-gradient(135deg, #4EFFC4, #00D9FF)',
                  glow: 'rgba(78,255,196,0.4)',
                },
                {
                  num: '3',
                  title: 'Connect',
                  desc: 'Chat unlocks after the game. You already have chemistry.',
                  bg: 'linear-gradient(135deg, #FFE66D, #FF9F1C)',
                  glow: 'rgba(255,230,109,0.4)',
                },
              ].map((step, i) => (
                <FadeIn key={step.num} delay={i * 0.15}>
                  <div className="flex items-start gap-6">
                    {/* Number badge */}
                    <div
                      className="flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center font-display text-2xl"
                      style={{
                        background: step.bg,
                        boxShadow: `0 0 20px ${step.glow}, 4px 4px 0px rgba(0,0,0,0.4)`,
                        color: '#0A1628',
                      }}
                    >
                      {step.num}
                    </div>
                    <div>
                      <h3
                        className="font-display text-2xl mb-2 leading-tight"
                        style={{ color: '#fff' }}
                      >
                        {step.title}
                      </h3>
                      <p className="font-body text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 5 – SOCIAL PROOF
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="relative px-6 py-20 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, rgba(181,101,255,0.08) 0%, transparent 65%)',
            }}
          />

          <div className="relative z-10 max-w-5xl mx-auto">
            <FadeIn>
              <SectionHeader
                text="BOSS LEVEL: VALIDATED"
                gradient="linear-gradient(135deg, #FF6BA8 0%, #B565FF 100%)"
              />
            </FadeIn>

            <FadeIn delay={0.1}>
              <p
                className="font-body text-lg text-center mb-10"
                style={{ color: 'rgba(255,255,255,0.65)' }}
              >
                We tested it with real users:
              </p>
            </FadeIn>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Stat 1 */}
              <FadeIn delay={0.1}>
                <div
                  className="rounded-2xl p-8 text-center h-full flex flex-col items-center justify-center"
                  style={{
                    background: 'rgba(78,255,196,0.05)',
                    border: '2px solid rgba(78,255,196,0.35)',
                    boxShadow: '0 0 24px rgba(78,255,196,0.12)',
                  }}
                >
                  <span
                    className="font-display block mb-3 leading-none"
                    style={{
                      fontSize: 'clamp(48px, 10vw, 72px)',
                      color: '#4EFFC4',
                      textShadow: '0 0 20px rgba(78,255,196,0.7)',
                    }}
                  >
                    89%
                  </span>
                  <p className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    felt more comfortable with games than texting
                  </p>
                </div>
              </FadeIn>

              {/* Stat 2 */}
              <FadeIn delay={0.2}>
                <div
                  className="rounded-2xl p-8 text-center h-full flex flex-col items-center justify-center"
                  style={{
                    background: 'rgba(255,107,168,0.05)',
                    border: '2px solid rgba(255,107,168,0.35)',
                    boxShadow: '0 0 24px rgba(255,107,168,0.12)',
                  }}
                >
                  <span
                    className="font-display block mb-3 leading-none"
                    style={{
                      fontSize: 'clamp(48px, 10vw, 72px)',
                      color: '#FF6BA8',
                      textShadow: '0 0 20px rgba(255,107,168,0.7)',
                    }}
                  >
                    100%
                  </span>
                  <p className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    willing to try a game-first dating app
                  </p>
                </div>
              </FadeIn>

              {/* Quote */}
              <FadeIn delay={0.3}>
                <div
                  className="rounded-2xl p-8 text-center h-full flex flex-col items-center justify-center"
                  style={{
                    background: 'rgba(255,230,109,0.05)',
                    border: '2px solid rgba(255,230,109,0.35)',
                    boxShadow: '0 0 24px rgba(255,230,109,0.12)',
                  }}
                >
                  <span
                    className="font-display text-4xl block mb-1 leading-none"
                    style={{ color: '#FFE66D', opacity: 0.5 }}
                  >
                    "
                  </span>
                  <p
                    className="font-body text-base italic leading-snug mb-4"
                    style={{
                      color: '#FFE66D',
                      textShadow: '0 0 10px rgba(255,230,109,0.4)',
                    }}
                  >
                    It's like a mini-date before the first date
                  </p>
                  <p className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    — User research participant
                  </p>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 6 – FINAL CTA / WAITLIST
        ═══════════════════════════════════════════════════════════════════ */}
        <section
          id="waitlist"
          className="relative px-6 py-24 overflow-hidden"
        >
          <CrtBrackets color="rgba(78,255,196,0.4)" />

          {/* Background glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 50% 50%, rgba(78,255,196,0.08) 0%, rgba(255,107,168,0.06) 40%, transparent 70%)',
            }}
          />

          {submitted && <Confetti />}

          <div className="relative z-10 max-w-xl mx-auto text-center">
            <FadeIn>
              <h2
                className="font-display leading-tight mb-4"
                style={{
                  fontSize: 'clamp(36px, 8vw, 64px)',
                  background: 'linear-gradient(135deg, #4EFFC4 20%, #FF6BA8 55%, #FFE66D 85%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 20px rgba(78,255,196,0.3)) drop-shadow(0 0 40px rgba(255,107,168,0.2))',
                }}
              >
                READY PLAYER ONE?
              </h2>
            </FadeIn>

            <FadeIn delay={0.1}>
              <p className="font-body text-xl mb-2" style={{ color: 'rgba(255,255,255,0.9)' }}>
                Join the waitlist
              </p>
              <p
                className="font-body text-sm mb-10"
                style={{ color: '#4EFFC4', textShadow: '0 0 8px rgba(78,255,196,0.4)' }}
              >
                Launching Spring 2026 in London
              </p>
            </FadeIn>

            {submitted ? (
              <FadeIn delay={0}>
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                  className="py-10"
                >
                  <p
                    className="font-display text-4xl sm:text-5xl"
                    style={{
                      color: '#FFE66D',
                      textShadow: '0 0 24px rgba(255,230,109,0.9), 0 0 60px rgba(255,230,109,0.4)',
                    }}
                  >
                    PLAYER 1 JOINED! 🎮
                  </p>
                  <p className="font-body text-base mt-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    We'll be in touch when we launch. Game on!
                  </p>
                </motion.div>
              </FadeIn>
            ) : (
              <FadeIn delay={0.2}>
                <form onSubmit={handleSubmit} noValidate>
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                    <div className="flex-1">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError('');
                        }}
                        placeholder="player1@email.com"
                        aria-label="Email address"
                        className="w-full font-body text-base rounded-xl py-4 px-5 outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: emailError
                            ? '2px solid #FF3D71'
                            : '2px solid rgba(78,255,196,0.5)',
                          boxShadow: emailError
                            ? '0 0 12px rgba(255,61,113,0.3)'
                            : '0 0 12px rgba(78,255,196,0.15)',
                          color: '#fff',
                        }}
                      />
                      {emailError && (
                        <p className="font-body text-xs mt-1 text-left" style={{ color: '#FF6BA8' }}>
                          {emailError}
                        </p>
                      )}
                    </div>

                    <motion.button
                      type="submit"
                      className="relative overflow-hidden font-display text-lg rounded-xl py-4 px-6 cursor-pointer select-none whitespace-nowrap"
                      style={{
                        background: 'linear-gradient(135deg, #FF6BA8 0%, #FFE66D 100%)',
                        border: '3px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 0 28px rgba(255,107,168,0.5), 4px 4px 0px rgba(0,0,0,0.35)',
                        color: '#0A1628',
                      }}
                      whileHover={{
                        scale: 1.04,
                        boxShadow: '0 0 48px rgba(255,107,168,0.75), 4px 4px 0px rgba(0,0,0,0.35)',
                      }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-xl" />
                      GET EARLY ACCESS →
                    </motion.button>
                  </div>
                </form>
              </FadeIn>
            )}

            {/* Decorative scattered elements */}
            <div className="mt-12 flex justify-center gap-6 text-2xl opacity-40 select-none pointer-events-none">
              {['⭐', '❤️', '🪙', '⚡', '💎'].map((em) => (
                <motion.span
                  key={em}
                  animate={{ y: [0, -8, 0], opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 2.5 + Math.random(), repeat: Infinity, ease: 'easeInOut' }}
                >
                  {em}
                </motion.span>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            FOOTER
        ═══════════════════════════════════════════════════════════════════ */}
        <footer
          className="relative px-6 py-8 text-center"
          style={{ borderTop: '1px solid rgba(78,255,196,0.12)' }}
        >
          <p className="font-body text-sm mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Made with ❤️ in London
          </p>
          <div className="flex justify-center gap-6">
            {['About', 'Contact'].map((link) => (
              <a
                key={link}
                href="#"
                className="font-body text-sm transition-colors duration-200"
                style={{ color: '#4EFFC4', textDecoration: 'none' }}
                onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = '#FF6BA8')}
                onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = '#4EFFC4')}
              >
                {link}
              </a>
            ))}
          </div>
        </footer>

        {/* Bottom neon bar */}
        <div
          className="h-[3px] w-full"
          style={{
            background: 'linear-gradient(90deg, #FF6BA8, #FFE66D, #4EFFC4, #B565FF, #FF6BA8)',
            boxShadow: '0 0 14px rgba(78,255,196,0.6)',
          }}
        />
      </div>
    </div>
  );
}
