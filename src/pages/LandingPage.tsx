import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function CrtBrackets({ color = '#4EFFC4', size = 28, inset = 16 }: { color?: string; size?: number; inset?: number }) {
  const b = `3px solid ${color}`;
  const n = 'none';
  const base: React.CSSProperties = { position: 'absolute', width: size, height: size };
  return (
    <>
      <div style={{ ...base, top: inset, left: inset,  borderTop: b, borderLeft: b,  borderRight: n, borderBottom: n }} />
      <div style={{ ...base, top: inset, right: inset, borderTop: b, borderRight: b, borderLeft: n,  borderBottom: n }} />
      <div style={{ ...base, bottom: inset, left: inset,  borderBottom: b, borderLeft: b,  borderTop: n, borderRight: n }} />
      <div style={{ ...base, bottom: inset, right: inset, borderBottom: b, borderRight: b, borderTop: n, borderLeft: n }} />
    </>
  );
}

function Divider({ color }: { color: string }) {
  return (
    <div
      className="w-full max-w-5xl mx-auto my-0"
      style={{ height: 1, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO — exact copy of WelcomeScreen (INSERT COIN scrolls to waitlist CTA)
// ─────────────────────────────────────────────────────────────────────────────

const floatingIcons = [
  { icon: '/icons/Star.png',                       x: '6%',  y: '8%',  size: 52, delay: 0,   rotate: -15 },
  { icon: '/icons/Lightning%20bolt.png',            x: '80%', y: '6%',  size: 48, delay: 0.3, rotate: 12  },
  { icon: '/icons/Heart.png',                      x: '88%', y: '38%', size: 44, delay: 0.6, rotate: -8  },
  { icon: '/icons/Trivia%20%26%20quizzes.png',     x: '4%',  y: '42%', size: 46, delay: 0.9, rotate: 10  },
  { icon: '/icons/Active%20games.png',             x: '78%', y: '72%', size: 50, delay: 0.4, rotate: -12 },
  { icon: '/icons/Star.png',                       x: '8%',  y: '74%', size: 40, delay: 0.7, rotate: 20  },
  { icon: '/icons/Lightning%20bolt.png',           x: '48%', y: '88%', size: 42, delay: 0.2, rotate: -5  },
];

function HeroSection({ onCta }: { onCta: () => void }) {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: '#12122A' }}
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(78,255,196,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(78,255,196,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)',
        }}
      />

      {/* Corner brackets */}
      <div className="absolute top-5 left-5 w-10 h-10 border-t-[3px] border-l-[3px] border-electric-mint/50 pointer-events-none" />
      <div className="absolute top-5 right-5 w-10 h-10 border-t-[3px] border-r-[3px] border-electric-mint/50 pointer-events-none" />
      <div className="absolute bottom-5 left-5 w-10 h-10 border-b-[3px] border-l-[3px] border-electric-mint/50 pointer-events-none" />
      <div className="absolute bottom-5 right-5 w-10 h-10 border-b-[3px] border-r-[3px] border-electric-mint/50 pointer-events-none" />

      {/* Ambient glow orbs */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '20%', left: '15%', width: 320, height: 320,
          background: 'radial-gradient(circle, rgba(181,101,255,0.10) 0%, transparent 70%)',
          borderRadius: '50%',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '20%', right: '10%', width: 280, height: 280,
          background: 'radial-gradient(circle, rgba(255,107,168,0.10) 0%, transparent 70%)',
          borderRadius: '50%',
        }}
      />

      {/* Floating icons */}
      {floatingIcons.map((el, i) => (
        <motion.div
          key={i}
          className="absolute select-none pointer-events-none"
          style={{ left: el.x, top: el.y, width: el.size, height: el.size }}
          initial={{ opacity: 0, scale: 0, rotate: el.rotate }}
          animate={{
            opacity: [0.45, 0.85, 0.45],
            scale: [1, 1.18, 1],
            y: [0, -10, 0],
            rotate: [el.rotate, el.rotate + 6, el.rotate],
          }}
          transition={{
            duration: 3 + i * 0.35,
            repeat: Infinity,
            delay: el.delay,
            ease: 'easeInOut',
          }}
        >
          <img
            src={el.icon}
            alt=""
            className="w-full h-full object-contain"
            style={{ filter: 'drop-shadow(0 0 8px rgba(78,255,196,0.55))' }}
          />
        </motion.div>
      ))}

      {/* Main content */}
      <motion.div
        className="relative z-10 flex flex-col items-center px-6 text-center max-w-sm w-full"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <motion.div
          className="mb-2"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 18, delay: 0.1 }}
        >
          <img
            src="/logo/Logo.png"
            alt=""
            className="h-40 w-auto object-contain select-none mx-auto block"
            style={{ filter: 'drop-shadow(0 0 24px rgba(255,100,100,0.5)) drop-shadow(4px 4px 0px rgba(0,0,0,0.5))' }}
          />
          <h1
            className="font-display select-none leading-none mt-2"
            style={{
              fontSize: '72px',
              color: '#FFE66D',
              textShadow:
                '0 0 18px rgba(255,230,109,0.9), 0 0 50px rgba(255,230,109,0.35), 4px 4px 0px #FF9F1C, 7px 7px 0px rgba(0,0,0,0.6)',
              letterSpacing: '0.06em',
            }}
          >
            DUEL
          </h1>
        </motion.div>

        {/* "PLAYER 1 START" divider */}
        <motion.div
          className="flex items-center gap-3 w-full mb-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(78,255,196,0.45))' }} />
          <motion.span
            className="font-body text-xs font-bold tracking-widest uppercase"
            style={{ color: '#4EFFC4' }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            PLAYER 1 START
          </motion.span>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(78,255,196,0.45), transparent)' }} />
        </motion.div>

        {/* Tagline */}
        <motion.p
          className="font-body font-bold text-lg mb-7 leading-snug"
          style={{ color: 'rgba(255,255,255,0.7)' }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          Play games together.{' '}
          <span style={{ color: '#FF6BA8', textShadow: '0 0 10px rgba(255,107,168,0.5)' }}>
            Skip the awkward texts.
          </span>
        </motion.p>

        {/* Feature pills */}
        <motion.div
          className="flex gap-2 mb-9 flex-wrap justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
        >
          {[
            { icon: '/icons/Lightning%20bolt.png', text: 'Real connections', bg: '#FFE66D', fg: '#12122A' },
            { icon: '/icons/Heart.png',           text: 'Games first',      bg: '#FF6BA8', fg: '#fff'    },
            { icon: '/icons/Active%20games.png',  text: 'No cringe DMs',   bg: '#4EFFC4', fg: '#12122A' },
          ].map((pill) => (
            <span
              key={pill.text}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-bold border-2 border-black"
              style={{
                backgroundColor: pill.bg,
                color: pill.fg,
                boxShadow: '3px 3px 0px rgba(0,0,0,0.6)',
              }}
            >
              <img src={pill.icon} alt="" className="w-3.5 h-3.5 object-contain" />
              {pill.text}
            </span>
          ))}
        </motion.div>

        {/* CTA — scrolls to waitlist form instead of navigating into the app */}
        <motion.button
          onClick={onCta}
          className="relative overflow-hidden w-full max-w-xs font-display font-extrabold text-xl rounded-[14px] py-5 px-8 cursor-pointer select-none"
          style={{
            background: 'linear-gradient(135deg, #4EFFC4 0%, #B565FF 100%)',
            border: '3px solid rgba(255,255,255,0.25)',
            boxShadow: '0 0 28px rgba(78,255,196,0.45), 6px 6px 0px rgba(0,0,0,0.4)',
            color: '#12122A',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          whileHover={{
            scale: 1.05,
            boxShadow: '0 0 50px rgba(78,255,196,0.75), 6px 6px 0px rgba(0,0,0,0.4)',
          }}
          whileTap={{ scale: 0.97, boxShadow: '2px 2px 0px rgba(0,0,0,0.4)' }}
        >
          <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
          INSERT COIN →
        </motion.button>

        <motion.p
          className="mt-4 font-body text-sm"
          style={{ color: 'rgba(255,255,255,0.28)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
        >
          Already have an account?{' '}
          <button
            className="font-semibold hover:underline"
            style={{ color: '#FF6BA8' }}
            onClick={() => navigate('/login')}
          >
            Sign in
          </button>
        </motion.p>
      </motion.div>

      {/* Bottom neon bar */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[3px]"
        style={{
          background: 'linear-gradient(90deg, #FF6BA8, #FFE66D, #4EFFC4, #B565FF, #FF6BA8)',
          boxShadow: '0 0 14px rgba(78,255,196,0.7)',
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 1 — THE PROBLEM
// ─────────────────────────────────────────────────────────────────────────────

function ProblemSection() {
  const cards = [
    {
      icon: '/landing-icons/Embarrassed.png',
      title: '"Hey..."',
      titleColor: '#FFE66D',
      body: '54% of dating app users feel anxious about first messages. You\'re stuck trying to be clever with strangers.',
      border: '#FF6BA8',
      glow: 'rgba(255,107,168,0.15)',
    },
    {
      icon: '/landing-icons/Skull.png',
      title: 'Dead Chats',
      titleColor: '#FF6BA8',
      body: '69% of conversations die within days. Boring small talk kills chemistry before it starts.',
      border: '#4EFFC4',
      glow: 'rgba(78,255,196,0.12)',
    },
    {
      icon: '/landing-icons/Mobile%20games.png',
      title: 'All Text, No Vibe',
      titleColor: '#4EFFC4',
      body: "Reading someone's bio tells you nothing. You need to experience them to know if there's a spark.",
      border: '#B565FF',
      glow: 'rgba(181,101,255,0.12)',
    },
  ];

  return (
    <section className="relative px-4 py-20">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-center mb-14"
          style={{
            fontSize: 'clamp(28px, 6vw, 48px)',
            background: 'linear-gradient(90deg, #FF6BA8, #FF3D71)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 16px rgba(255,107,168,0.45))',
          }}
        >
          LEVEL 1: THE PROBLEM
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.14 }}
              className="rounded-card p-6"
              style={{
                background: 'linear-gradient(135deg, rgba(26,10,46,0.95), rgba(18,18,42,0.9))',
                border: `2px solid ${card.border}`,
                boxShadow: `0 0 24px ${card.glow}`,
              }}
            >
              <img
                src={card.icon}
                alt=""
                className="mb-4 object-contain"
                style={{ width: 56, height: 56, filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.25))' }}
              />
              <h3
                className="font-display text-2xl mb-3"
                style={{ color: card.titleColor, textShadow: `0 0 12px ${card.titleColor}55` }}
              >
                {card.title}
              </h3>
              <p className="font-body text-white/80 text-base leading-relaxed">{card.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 2 — PLAY FIRST
// ─────────────────────────────────────────────────────────────────────────────

function SolutionSection() {
  const games = [
    { icon: '/landing-icons/Trivia%20%26%20quizzes.png', name: 'Guess Who',    desc: 'Mystery & wit',      bg: 'linear-gradient(135deg, #B565FF 0%, #FF6BA8 100%)' },
    { icon: '/landing-icons/Dot%20Dash.png',             name: 'Dot Dash',     desc: 'Quick reflexes',     bg: 'linear-gradient(135deg, #4EFFC4 0%, #00D9FF 100%)' },
    { icon: '/landing-icons/Word%20games.png',           name: 'Caption This', desc: 'Creativity & humor', bg: 'linear-gradient(135deg, #FFE66D 0%, #FF9F1C 100%)' },
  ];

  const whys = [
    'Break the ice instantly (no awkward openers)',
    'Show real personality (not performed text)',
    'Create shared experience (inside jokes, natural conversation)',
    'Fun > forced (dating should be playful)',
  ];

  return (
    <section className="relative px-4 py-20">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-center mb-6"
          style={{
            fontSize: 'clamp(28px, 6vw, 48px)',
            background: 'linear-gradient(90deg, #4EFFC4, #00D9FF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 16px rgba(78,255,196,0.45))',
          }}
        >
          LEVEL 2: PLAY FIRST
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-body text-white text-center mb-14"
          style={{ fontSize: 18, maxWidth: 560, margin: '0 auto 56px' }}
        >
          Duel is a dating app where your{' '}
          <span style={{ color: '#FF6BA8', fontWeight: 700 }}>first interaction</span>{' '}
          is playing a{' '}
          <span style={{ color: '#FFE66D', fontWeight: 700 }}>2–5 minute game</span>{' '}
          together.
        </motion.p>

        {/* Game cards — 1 col mobile, 2 col tablet, 3 col desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {games.map((game, i) => (
            <motion.div
              key={game.name}
              initial={{ opacity: 0, scale: 0.88 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.03, y: -4 }}
              className="rounded-card p-4 text-center cursor-default w-full"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '3px solid #4EFFC4',
                boxShadow: '0 0 22px rgba(78,255,196,0.18)',
              }}
            >
              <div
                className="w-full rounded-xl flex items-center justify-center mb-3"
                style={{ height: 120, background: game.bg }}
              >
                <img
                  src={game.icon}
                  alt=""
                  className="object-contain"
                  style={{ width: 60, height: 60, filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.4))' }}
                />
              </div>
              <p className="font-display text-white text-[15px] mb-1">{game.name}</p>
              <p className="font-body text-white/50 text-xs">{game.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Why games */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-lg mx-auto"
        >
          <h3
            className="font-display text-xl text-center mb-6"
            style={{ color: '#FFE66D', textShadow: '0 0 14px rgba(255,230,109,0.5)' }}
          >
            Why games?
          </h3>
          <ul className="space-y-4">
            {whys.map((why, i) => (
              <motion.li
                key={why}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="flex items-start gap-3 font-body text-white/90 text-base"
              >
                <span
                  className="font-display flex-shrink-0 mt-0.5"
                  style={{ color: '#4EFFC4', fontSize: 18, textShadow: '0 0 8px #4EFFC4' }}
                >
                  ✓
                </span>
                <span>{why}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 3 — HOW TO PLAY
// ─────────────────────────────────────────────────────────────────────────────

function HowItWorksSection() {
  const steps = [
    {
      num: '1',
      bg: 'linear-gradient(135deg, #FF6BA8, #FF3D71)',
      glow: 'rgba(255,107,168,0.45)',
      title: 'Match',
      desc: 'Swipe like normal. When you match, she picks a game.',
    },
    {
      num: '2',
      bg: 'linear-gradient(135deg, #4EFFC4, #00D9FF)',
      glow: 'rgba(78,255,196,0.45)',
      title: 'Play',
      desc: '2–5 minutes together. No texting, just playing.',
    },
    {
      num: '3',
      bg: 'linear-gradient(135deg, #FFE66D, #FF9F1C)',
      glow: 'rgba(255,230,109,0.45)',
      title: 'Connect',
      desc: 'Chat unlocks after the game. You already have chemistry.',
    },
  ];

  return (
    <section className="relative px-4 py-20">
      <div className="max-w-2xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-center mb-14"
          style={{
            fontSize: 'clamp(28px, 6vw, 48px)',
            background: 'linear-gradient(90deg, #FFE66D, #FF9F1C)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 16px rgba(255,230,109,0.45))',
          }}
        >
          LEVEL 3: HOW TO PLAY
        </motion.h2>

        <div className="space-y-10">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: -28 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.14 }}
              className="flex items-start gap-7"
            >
              {/* Badge */}
              <div
                className="flex-shrink-0 flex items-center justify-center font-display text-white text-2xl rounded-xl"
                style={{
                  width: 64,
                  height: 64,
                  background: step.bg,
                  boxShadow: `0 4px 22px ${step.glow}`,
                  border: '3px solid rgba(255,255,255,0.18)',
                }}
              >
                {step.num}
              </div>

              {/* Text */}
              <div className="pt-2">
                <h3 className="font-display text-2xl text-white mb-1">{step.title}</h3>
                <p className="font-body text-white/70 text-base">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOSS LEVEL — VALIDATED
// ─────────────────────────────────────────────────────────────────────────────

function SocialProofSection() {
  const stats = [
    {
      value: '89%',
      color: '#4EFFC4',
      border: '#4EFFC4',
      bg: 'rgba(78,255,196,0.05)',
      glow: 'rgba(78,255,196,0.15)',
      label: 'felt more comfortable with games than texting',
      isQuote: false,
    },
    {
      value: '100%',
      color: '#FF6BA8',
      border: '#FF6BA8',
      bg: 'rgba(255,107,168,0.05)',
      glow: 'rgba(255,107,168,0.15)',
      label: 'willing to try a game-first dating app',
      isQuote: false,
    },
    {
      value: '"It\'s like a mini-date before the first date"',
      color: '#FFE66D',
      border: '#FFE66D',
      bg: 'rgba(255,230,109,0.05)',
      glow: 'rgba(255,230,109,0.15)',
      label: '— User research participant',
      isQuote: true,
    },
  ];

  return (
    <section className="relative px-4 py-20">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-center mb-4"
          style={{
            fontSize: 'clamp(28px, 6vw, 48px)',
            background: 'linear-gradient(90deg, #FF6BA8, #B565FF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 16px rgba(255,107,168,0.4))',
          }}
        >
          BOSS LEVEL: VALIDATED
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-body text-white/60 text-center mb-12 text-lg"
        >
          We tested it with real users:
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.14 }}
              className="rounded-card p-8 text-center flex flex-col justify-center"
              style={{
                background: stat.bg,
                border: `2px solid ${stat.border}`,
                boxShadow: `0 0 30px ${stat.glow}`,
              }}
            >
              {stat.isQuote ? (
                <>
                  <div
                    className="font-display text-xl mb-4 leading-snug"
                    style={{ color: stat.color, textShadow: `0 0 10px ${stat.color}55` }}
                  >
                    {stat.value}
                  </div>
                  <p className="font-body text-white/40 text-sm">{stat.label}</p>
                </>
              ) : (
                <>
                  <div
                    className="font-display mb-3 leading-none"
                    style={{
                      fontSize: 68,
                      color: stat.color,
                      textShadow: `0 0 24px ${stat.color}CC`,
                    }}
                  >
                    {stat.value}
                  </div>
                  <p className="font-body text-white/70 text-sm">{stat.label}</p>
                </>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FINAL CTA — READY PLAYER ONE
// ─────────────────────────────────────────────────────────────────────────────

function FinalCtaSection() {
  const navigate = useNavigate();
  const [email,  setEmail]  = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  // Pre-generate confetti so values are stable
  const confetti = useRef(
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      left: `${(i / 24) * 100}%`,
      delay: (i * 0.13) % 1.5,
      emoji: ['⭐', '❤️', '🎮', '⚡', '💎', '🪙'][i % 6],
    }))
  ).current;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrMsg('Please enter a valid email address');
      setStatus('error');
      return;
    }
    setStatus('loading');
    // MVP – log to console; replace with Mailchimp / Airtable call later
    await new Promise(r => setTimeout(r, 900));
    console.log('[Duel waitlist] signup:', email);
    setStatus('success');
  }

  return (
    <section className="relative px-4 py-28 overflow-hidden">
      <CrtBrackets color="#FF6BA8" size={30} inset={20} />

      {/* Confetti rain on success */}
      <AnimatePresence>
        {status === 'success' && confetti.map(c => (
          <motion.div
            key={c.id}
            className="absolute text-2xl pointer-events-none select-none"
            style={{ left: c.left, top: -40 }}
            initial={{ y: -40, opacity: 1, rotate: 0 }}
            animate={{ y: 900, opacity: 0, rotate: 360 }}
            exit={{}}
            transition={{ duration: 3.2, delay: c.delay, ease: 'linear' }}
          >
            {c.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display leading-tight mb-4"
          style={{
            fontSize: 'clamp(36px, 9vw, 72px)',
            background: 'linear-gradient(90deg, #4EFFC4 0%, #FF6BA8 50%, #FFE66D 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 20px rgba(255,107,168,0.5))',
          }}
        >
          READY PLAYER ONE?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-body text-white text-xl mb-2"
        >
          Join the waitlist
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.18 }}
          className="font-body text-base mb-10"
          style={{ color: '#4EFFC4' }}
        >
          Launching Spring 2026 in London
        </motion.p>

        {/* Demo link — always visible, above the form */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <motion.button
            onClick={() => navigate('/onboarding/welcome')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 font-body font-bold text-base px-6 py-3 rounded-xl"
            style={{
              color: '#4EFFC4',
              border: '2px solid rgba(78,255,196,0.4)',
              background: 'rgba(78,255,196,0.06)',
              boxShadow: '0 0 14px rgba(78,255,196,0.12)',
            }}
          >
            <span>Try the demo</span>
            <span style={{ fontSize: 18 }}>→</span>
          </motion.button>
          <p className="font-body text-white/30 text-xs mt-2">No account needed</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div
              key="success"
              initial={{ scale: 0.75, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              className="font-display"
              style={{
                fontSize: 'clamp(28px, 7vw, 48px)',
                color: '#FFE66D',
                textShadow: '0 0 24px rgba(255,230,109,0.9), 0 0 48px rgba(255,230,109,0.4)',
              }}
            >
              PLAYER 1 JOINED! 🎮
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col gap-3 max-w-md mx-auto"
              noValidate
            >
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
                placeholder="player1@email.com"
                aria-label="Email address for Duel waitlist"
                disabled={status === 'loading'}
                className="font-body text-white text-base rounded-xl px-5 py-4 w-full outline-none placeholder-white/30 disabled:opacity-50"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: `2px solid ${status === 'error' ? '#FF3D71' : '#4EFFC4'}`,
                  boxShadow: status === 'error'
                    ? '0 0 12px rgba(255,61,113,0.35)'
                    : '0 0 12px rgba(78,255,196,0.18)',
                }}
              />

              <AnimatePresence>
                {status === 'error' && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="font-body text-sm text-left"
                    style={{ color: '#FF3D71' }}
                  >
                    {errMsg}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={status === 'loading'}
                whileHover={status !== 'loading' ? { scale: 1.04, boxShadow: '0 0 44px rgba(255,107,168,0.85)' } : {}}
                whileTap={status !== 'loading' ? { scale: 0.97 } : {}}
                className="font-display text-xl text-white rounded-xl py-5 w-full disabled:opacity-60"
                style={{
                  background: 'linear-gradient(90deg, #FF6BA8, #FFE66D)',
                  boxShadow: '0 0 22px rgba(255,107,168,0.45)',
                  border: '3px solid rgba(255,255,255,0.15)',
                  cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                }}
              >
                {status === 'loading' ? 'INSERTING COIN...' : 'GET EARLY ACCESS →'}
              </motion.button>

              <p className="font-body text-white/25 text-xs text-center mt-1">
                No spam. Unsubscribe anytime.
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer
      className="py-8 text-center"
      style={{ borderTop: '1px solid rgba(78,255,196,0.12)' }}
    >
      <p className="font-body text-sm mb-3" style={{ color: '#4EFFC4' }}>
        Made with ❤️ in London
      </p>
      <div className="flex justify-center gap-6">
        {['About', 'Contact'].map(link => (
          <a
            key={link}
            href={`#${link.toLowerCase()}`}
            className="font-body text-sm transition-colors duration-200"
            style={{ color: '#4EFFC480' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#FF6BA8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#4EFFC480')}
          >
            {link}
          </a>
        ))}
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export function LandingPage() {
  const ctaRef = useRef<HTMLDivElement>(null);

  function scrollToCta() {
    ctaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: '#0A1628', color: 'white' }}>

      {/* Scanlines — subtle CRT horizontal-line overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-50"
        aria-hidden
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.022) 4px)',
          backgroundSize: '100% 4px',
        }}
      />

      {/* Neon bottom bar — matches app chrome */}
      <div
        className="fixed bottom-0 left-0 right-0 h-[3px] pointer-events-none z-50"
        aria-hidden
        style={{
          background: 'linear-gradient(90deg, #FF6BA8, #FFE66D, #4EFFC4, #B565FF, #FF6BA8)',
          boxShadow: '0 0 14px rgba(78,255,196,0.7)',
        }}
      />

      {/* ── Sections ── */}
      <HeroSection onCta={scrollToCta} />

      <Divider color="#4EFFC4" />
      <ProblemSection />

      <Divider color="#FF6BA8" />
      <SolutionSection />

      <Divider color="#FFE66D" />
      <HowItWorksSection />

      <Divider color="#B565FF" />
      <SocialProofSection />

      <Divider color="#4EFFC4" />
      <div ref={ctaRef}>
        <FinalCtaSection />
      </div>

      <Footer />
    </div>
  );
}
