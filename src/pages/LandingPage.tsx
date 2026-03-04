import { useState, useRef } from 'react';
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
// HERO
// ─────────────────────────────────────────────────────────────────────────────

function HeroSection({ onCta }: { onCta: () => void }) {
  const pills = [
    { icon: '🎮', label: 'Real connections', border: '#4EFFC4' },
    { icon: '⚔️', label: 'Games first',      border: '#FF6BA8' },
    { icon: '🚫', label: 'No cringe DMs',    border: '#B565FF' },
  ];

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-24 overflow-hidden">
      <CrtBrackets color="#4EFFC4" size={32} inset={20} />

      {/* Grid bg */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(78,255,196,1) 1px, transparent 1px), linear-gradient(90deg, rgba(78,255,196,1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Floating pixel decorations */}
      {[
        { emoji: '⭐', pos: 'top-12 left-6',    anim: { y: [0,-14,0], rotate: [0,20,0] }, dur: 4 },
        { emoji: '❤️', pos: 'top-14 right-6',   anim: { scale: [1,1.35,1] },              dur: 2 },
        { emoji: '🍕', pos: 'bottom-24 left-6', anim: { y: [0,-10,0] },                  dur: 3.5 },
        { emoji: '⚡', pos: 'bottom-28 right-6',anim: { y: [0,-12,0] },                  dur: 3   },
      ].map(({ emoji, pos, anim, dur }) => (
        <motion.div
          key={emoji}
          className={`absolute text-3xl select-none pointer-events-none ${pos}`}
          animate={anim as any}
          transition={{ repeat: Infinity, duration: dur, ease: 'easeInOut' }}
        >
          {emoji}
        </motion.div>
      ))}

      {/* Sword logo */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 12, stiffness: 180 }}
        className="text-7xl mb-4 select-none"
        style={{ filter: 'drop-shadow(0 0 24px rgba(255,159,28,0.9))' }}
      >
        ⚔️
      </motion.div>

      {/* DUEL */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="font-display text-center leading-none mb-3"
        style={{
          fontSize: 'clamp(72px, 18vw, 108px)',
          background: 'linear-gradient(180deg, #FFE66D 0%, #FF9F1C 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 0 30px rgba(255,230,109,0.65))',
        }}
      >
        DUEL
      </motion.h1>

      {/* PLAYER 1 START — blinking */}
      <motion.p
        className="font-display tracking-widest mb-8"
        style={{ color: '#4EFFC4', textShadow: '0 0 14px #4EFFC4', fontSize: 18 }}
        animate={{ opacity: [1, 1, 0, 0, 1] }}
        transition={{ repeat: Infinity, duration: 2.4, times: [0, 0.45, 0.5, 0.95, 1] }}
      >
        PLAYER 1 START
      </motion.p>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="font-body text-white text-center mb-9 leading-relaxed"
        style={{ fontSize: 'clamp(18px, 4vw, 22px)', maxWidth: 480 }}
      >
        Play games together.{' '}
        <span
          style={{
            background: 'linear-gradient(90deg, #FF6BA8, #FF9F1C)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Skip the awkward texts.
        </span>
      </motion.p>

      {/* Feature pills */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="flex flex-wrap justify-center gap-3 mb-10"
      >
        {pills.map(({ icon, label, border }) => (
          <div
            key={label}
            className="flex items-center gap-2 px-5 py-2 rounded-pill font-body text-white text-sm"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: `2px solid ${border}`,
              boxShadow: `0 0 12px ${border}40`,
            }}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </div>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7 }}
        whileHover={{ scale: 1.05, boxShadow: '0 0 50px rgba(255,107,168,0.85)' }}
        whileTap={{ scale: 0.97 }}
        onClick={onCta}
        className="font-display text-2xl text-white rounded-pill px-14 py-5 w-full max-w-sm"
        style={{
          background: 'linear-gradient(90deg, #4EFFC4, #FF6BA8)',
          boxShadow: '0 0 24px rgba(255,107,168,0.5)',
          border: '3px solid rgba(255,255,255,0.18)',
        }}
      >
        INSERT COIN →
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="font-body text-white/30 text-sm mt-4"
      >
        Free to join · Launching Spring 2026
      </motion.p>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 1 — THE PROBLEM
// ─────────────────────────────────────────────────────────────────────────────

function ProblemSection() {
  const cards = [
    {
      emoji: '😬',
      title: '"Hey..."',
      titleColor: '#FFE66D',
      body: '54% of dating app users feel anxious about first messages. You\'re stuck trying to be clever with strangers.',
      border: '#FF6BA8',
      glow: 'rgba(255,107,168,0.15)',
    },
    {
      emoji: '💀',
      title: 'Dead Chats',
      titleColor: '#FF6BA8',
      body: '69% of conversations die within days. Boring small talk kills chemistry before it starts.',
      border: '#4EFFC4',
      glow: 'rgba(78,255,196,0.12)',
    },
    {
      emoji: '📱',
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
              <div className="text-5xl mb-4">{card.emoji}</div>
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
    { icon: '❓', name: 'Guess Who',     desc: 'Mystery & wit',      bg: 'linear-gradient(135deg, #B565FF 0%, #FF6BA8 100%)' },
    { icon: '👾', name: 'Dot Dash',      desc: 'Quick reflexes',     bg: 'linear-gradient(135deg, #4EFFC4 0%, #00D9FF 100%)' },
    { icon: '💬', name: 'Caption This',  desc: 'Creativity & humor', bg: 'linear-gradient(135deg, #FFE66D 0%, #FF9F1C 100%)' },
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

        {/* Game cards */}
        <div className="flex justify-center gap-5 overflow-x-auto pb-3 mb-14 snap-x snap-mandatory">
          {games.map((game, i) => (
            <motion.div
              key={game.name}
              initial={{ opacity: 0, scale: 0.88 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.06, y: -6 }}
              className="flex-shrink-0 snap-center rounded-card p-4 text-center cursor-default"
              style={{
                width: 164,
                background: 'rgba(255,255,255,0.04)',
                border: '3px solid #4EFFC4',
                boxShadow: '0 0 22px rgba(78,255,196,0.18)',
              }}
            >
              <div
                className="w-full rounded-xl flex items-center justify-center text-5xl mb-3"
                style={{ height: 120, background: game.bg }}
              >
                {game.icon}
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
