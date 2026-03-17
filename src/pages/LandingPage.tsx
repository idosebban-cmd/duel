import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// SHARED
// ─────────────────────────────────────────────────────────────────────────────

function Divider({ color }: { color: string }) {
  return (
    <div
      className="w-full max-w-5xl mx-auto"
      style={{ height: 1, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
    />
  );
}

const floatingIcons = [
  { icon: '/icons/Star.png',                   x: '6%',  y: '8%',  size: 48, delay: 0,   rotate: -15 },
  { icon: '/icons/Lightning%20bolt.png',        x: '82%', y: '5%',  size: 44, delay: 0.3, rotate: 12  },
  { icon: '/icons/Heart.png',                  x: '90%', y: '35%', size: 40, delay: 0.6, rotate: -8  },
  { icon: '/icons/Active%20games.png',         x: '4%',  y: '40%', size: 42, delay: 0.9, rotate: 10  },
  { icon: '/icons/Star.png',                   x: '80%', y: '70%', size: 36, delay: 0.4, rotate: -12 },
  { icon: '/icons/Lightning%20bolt.png',        x: '8%',  y: '72%', size: 38, delay: 0.7, rotate: 20  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. HERO
// ─────────────────────────────────────────────────────────────────────────────

function HeroSection() {
  const navigate = useNavigate();

  return (
    <section
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: '#12122A' }}
    >
      {/* Grid */}
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
          top: '18%', left: '12%', width: 320, height: 320,
          background: 'radial-gradient(circle, rgba(181,101,255,0.12) 0%, transparent 70%)',
          borderRadius: '50%',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '18%', right: '8%', width: 280, height: 280,
          background: 'radial-gradient(circle, rgba(255,107,168,0.12) 0%, transparent 70%)',
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
            opacity: [0.4, 0.8, 0.4],
            scale: [1, 1.15, 1],
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
        {/* Logo + Title */}
        <motion.div
          className="mb-3"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 18, delay: 0.1 }}
        >
          <img
            src="/logo/Logo.png"
            alt=""
            className="h-36 w-auto object-contain select-none mx-auto block"
            style={{ filter: 'drop-shadow(0 0 24px rgba(255,100,100,0.5)) drop-shadow(4px 4px 0px rgba(0,0,0,0.5))' }}
          />
          <h1
            className="font-display select-none leading-none mt-2"
            style={{
              fontSize: '80px',
              color: '#FFE66D',
              textShadow:
                '0 0 18px rgba(255,230,109,0.9), 0 0 50px rgba(255,230,109,0.35), 4px 4px 0px #FF9F1C, 7px 7px 0px rgba(0,0,0,0.6)',
              letterSpacing: '0.06em',
            }}
          >
            DUEL
          </h1>
        </motion.div>

        {/* Subheadline */}
        <motion.p
          className="font-display text-2xl mb-2"
          style={{ color: '#4EFFC4', textShadow: '0 0 14px rgba(78,255,196,0.6)' }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          Play first. Talk later.
        </motion.p>

        {/* Tagline */}
        <motion.p
          className="font-body font-bold text-lg mb-9 leading-snug"
          style={{ color: 'rgba(255,255,255,0.6)' }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          Meet your{' '}
          <span style={{ color: '#FF6BA8', textShadow: '0 0 10px rgba(255,107,168,0.5)' }}>
            Player 2.
          </span>
        </motion.p>

        {/* INSERT COIN */}
        <motion.button
          onClick={() => navigate('/onboarding/welcome')}
          className="relative overflow-hidden w-full max-w-xs font-display font-extrabold text-xl rounded-[14px] py-5 px-8 cursor-pointer select-none"
          style={{
            background: 'linear-gradient(135deg, #4EFFC4 0%, #B565FF 100%)',
            border: '3px solid rgba(255,255,255,0.25)',
            boxShadow: '0 0 28px rgba(78,255,196,0.45), 6px 6px 0px rgba(0,0,0,0.4)',
            color: '#12122A',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{
            scale: 1.05,
            boxShadow: '0 0 50px rgba(78,255,196,0.75), 6px 6px 0px rgba(0,0,0,0.4)',
          }}
          whileTap={{ scale: 0.97, boxShadow: '2px 2px 0px rgba(0,0,0,0.4)' }}
        >
          <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
          INSERT COIN
        </motion.button>

        {/* Log in link */}
        <motion.p
          className="mt-4 font-body text-sm"
          style={{ color: 'rgba(255,255,255,0.28)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Already playing?{' '}
          <button
            className="font-semibold hover:underline"
            style={{ color: '#FF6BA8' }}
            onClick={() => navigate('/login?mode=signin')}
          >
            Log in
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
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. HOW IT WORKS
// ─────────────────────────────────────────────────────────────────────────────

function HowItWorksSection() {
  const steps = [
    {
      num: '1',
      icon: '/icons/Active%20games.png',
      bg: 'linear-gradient(135deg, #4EFFC4, #00D9FF)',
      glow: 'rgba(78,255,196,0.45)',
      title: 'Play',
      desc: 'Challenge someone to a game',
    },
    {
      num: '2',
      icon: '/icons/Heart.png',
      bg: 'linear-gradient(135deg, #FF6BA8, #FF3D71)',
      glow: 'rgba(255,107,168,0.45)',
      title: 'Connect',
      desc: 'Chat after the game ends',
    },
    {
      num: '3',
      icon: '/icons/Star.png',
      bg: 'linear-gradient(135deg, #FFE66D, #FF9F1C)',
      glow: 'rgba(255,230,109,0.45)',
      title: 'Match',
      desc: 'Find your Player 2',
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
            fontSize: 'clamp(28px, 6vw, 44px)',
            background: 'linear-gradient(90deg, #4EFFC4, #00D9FF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 16px rgba(78,255,196,0.45))',
          }}
        >
          HOW IT WORKS
        </motion.h2>

        <div className="space-y-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: -28 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.14 }}
              className="flex items-center gap-5"
            >
              {/* Badge */}
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-xl relative"
                style={{
                  width: 72,
                  height: 72,
                  background: step.bg,
                  boxShadow: `0 4px 22px ${step.glow}`,
                  border: '3px solid rgba(255,255,255,0.18)',
                }}
              >
                <img
                  src={step.icon}
                  alt=""
                  className="w-9 h-9 object-contain"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.3))' }}
                />
                <span
                  className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center font-display text-xs text-white"
                  style={{ background: '#12122A', border: '2px solid rgba(255,255,255,0.3)' }}
                >
                  {step.num}
                </span>
              </div>

              {/* Text */}
              <div>
                <h3 className="font-display text-2xl text-white mb-0.5">{step.title}</h3>
                <p className="font-body text-white/60 text-base">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. THE GAMES
// ─────────────────────────────────────────────────────────────────────────────

function GamesSection() {
  const games = [
    { icon: '/game-icons/Boardgames.png',           name: 'Connect 4',  bg: 'linear-gradient(135deg, #FF6BA8, #FF3D71)' },
    { icon: '/game-icons/Competative%20games.png',   name: 'Battleship', bg: 'linear-gradient(135deg, #4EFFC4, #00D9FF)' },
    { icon: '/game-icons/Strategy.png',             name: 'Draughts',   bg: 'linear-gradient(135deg, #FFE66D, #FF9F1C)' },
    { icon: '/landing-icons/Ghost.png',             name: 'Guess Who',  bg: 'linear-gradient(135deg, #B565FF, #FF6BA8)' },
    { icon: '/landing-icons/Dot%20Dash.png',         name: 'Dot Dash',   bg: 'linear-gradient(135deg, #00D9FF, #4EFFC4)' },
    { icon: '/game-icons/Word%20games.png',         name: 'Word Blitz', bg: 'linear-gradient(135deg, #FF9F1C, #FFE66D)' },
  ];

  return (
    <section className="relative px-4 py-20">
      <div className="max-w-3xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-center mb-4"
          style={{
            fontSize: 'clamp(28px, 6vw, 44px)',
            background: 'linear-gradient(90deg, #FFE66D, #FF9F1C)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 16px rgba(255,230,109,0.45))',
          }}
        >
          THE GAMES
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-body text-white/50 text-center mb-12 text-base"
        >
          2-5 minute games designed for two players
        </motion.p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {games.map((game, i) => (
            <motion.div
              key={game.name}
              initial={{ opacity: 0, scale: 0.88 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.05, y: -4 }}
              className="rounded-2xl p-4 text-center cursor-default"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '2px solid rgba(255,255,255,0.1)',
                boxShadow: '0 0 16px rgba(0,0,0,0.2)',
              }}
            >
              <div
                className="w-full rounded-xl flex items-center justify-center mb-3 mx-auto"
                style={{ height: 80, maxWidth: 120, background: game.bg }}
              >
                <img
                  src={game.icon}
                  alt=""
                  className="object-contain"
                  style={{ width: 44, height: 44, filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.4))' }}
                />
              </div>
              <p className="font-display text-white text-sm">{game.name}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. JUST PLAY vs ROMANCE
// ─────────────────────────────────────────────────────────────────────────────

function IntentSection() {
  const cards = [
    {
      icon: '/icons/Active%20games.png',
      title: 'Just here for games?',
      body: 'No pressure. Just play.',
      border: '#00D4FF',
      bg: 'rgba(0,212,255,0.06)',
      glow: 'rgba(0,212,255,0.18)',
      titleColor: '#00D4FF',
    },
    {
      icon: '/icons/Heart.png',
      title: 'Looking for something more?',
      body: 'It starts with a game.',
      border: '#FF4E6A',
      bg: 'rgba(255,78,106,0.06)',
      glow: 'rgba(255,78,106,0.18)',
      titleColor: '#FF4E6A',
    },
  ];

  return (
    <section className="relative px-4 py-20">
      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="rounded-2xl p-8 text-center flex flex-col items-center"
              style={{
                background: card.bg,
                border: `2px solid ${card.border}`,
                boxShadow: `0 0 28px ${card.glow}`,
              }}
            >
              <img
                src={card.icon}
                alt=""
                className="w-12 h-12 object-contain mb-4"
                style={{ filter: `drop-shadow(0 0 8px ${card.glow})` }}
              />
              <h3
                className="font-display text-xl mb-3"
                style={{ color: card.titleColor, textShadow: `0 0 12px ${card.glow}` }}
              >
                {card.title}
              </h3>
              <p className="font-body text-white/70 text-base">{card.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. FOOTER
// ─────────────────────────────────────────────────────────────────────────────

function FooterSection() {
  const navigate = useNavigate();

  return (
    <section className="relative px-4 pt-16 pb-12">
      <div className="max-w-sm mx-auto text-center">
        {/* INSERT COIN again */}
        <motion.button
          onClick={() => navigate('/onboarding/welcome')}
          className="relative overflow-hidden w-full max-w-xs font-display font-extrabold text-xl rounded-[14px] py-5 px-8 cursor-pointer select-none mx-auto block"
          style={{
            background: 'linear-gradient(135deg, #4EFFC4 0%, #B565FF 100%)',
            border: '3px solid rgba(255,255,255,0.25)',
            boxShadow: '0 0 28px rgba(78,255,196,0.45), 6px 6px 0px rgba(0,0,0,0.4)',
            color: '#12122A',
          }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          whileHover={{
            scale: 1.05,
            boxShadow: '0 0 50px rgba(78,255,196,0.75), 6px 6px 0px rgba(0,0,0,0.4)',
          }}
          whileTap={{ scale: 0.97, boxShadow: '2px 2px 0px rgba(0,0,0,0.4)' }}
        >
          <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
          INSERT COIN
        </motion.button>

        {/* Log in link */}
        <p
          className="mt-4 font-body text-sm mb-10"
          style={{ color: 'rgba(255,255,255,0.28)' }}
        >
          Already playing?{' '}
          <button
            className="font-semibold hover:underline"
            style={{ color: '#FF6BA8' }}
            onClick={() => navigate('/login?mode=signin')}
          >
            Log in
          </button>
        </p>

        {/* App name */}
        <div style={{ borderTop: '1px solid rgba(78,255,196,0.12)' }} className="pt-8">
          <h2
            className="font-display select-none leading-none"
            style={{
              fontSize: '36px',
              color: '#FFE66D',
              textShadow:
                '0 0 12px rgba(255,230,109,0.7), 3px 3px 0px #FF9F1C',
              letterSpacing: '0.06em',
            }}
          >
            DUEL
          </h2>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: '#0A1628', color: 'white' }}>

      {/* Scanlines */}
      <div
        className="fixed inset-0 pointer-events-none z-50"
        aria-hidden
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.022) 4px)',
          backgroundSize: '100% 4px',
        }}
      />

      {/* Neon bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 h-[3px] pointer-events-none z-50"
        aria-hidden
        style={{
          background: 'linear-gradient(90deg, #FF6BA8, #FFE66D, #4EFFC4, #B565FF, #FF6BA8)',
          boxShadow: '0 0 14px rgba(78,255,196,0.7)',
        }}
      />

      {/* Sections */}
      <HeroSection />

      <Divider color="#4EFFC4" />
      <HowItWorksSection />

      <Divider color="#FFE66D" />
      <GamesSection />

      <Divider color="#B565FF" />
      <IntentSection />

      <Divider color="#4EFFC4" />
      <FooterSection />
    </div>
  );
}
