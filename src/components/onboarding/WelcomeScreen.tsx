import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const floatingIcons = [
  { icon: '/icons/Star.png',           x: '6%',  y: '8%',  size: 52, delay: 0,   rotate: -15 },
  { icon: '/icons/Lightning bolt.png', x: '80%', y: '6%',  size: 48, delay: 0.3, rotate: 12  },
  { icon: '/icons/Heart.png',          x: '88%', y: '38%', size: 44, delay: 0.6, rotate: -8  },
  { icon: '/icons/Celebration.png',    x: '4%',  y: '42%', size: 46, delay: 0.9, rotate: 10  },
  { icon: '/icons/Console remote.png', x: '78%', y: '72%', size: 50, delay: 0.4, rotate: -12 },
  { icon: '/icons/Star.png',           x: '8%',  y: '74%', size: 40, delay: 0.7, rotate: 20  },
  { icon: '/icons/Lightning bolt.png', x: '48%', y: '88%', size: 42, delay: 0.2, rotate: -5  },
];

export function WelcomeScreen() {
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
            src="/logo/logo"
            alt="Duel"
            className="h-40 w-auto object-contain select-none"
            style={{ filter: 'drop-shadow(0 0 24px rgba(255,100,100,0.5)) drop-shadow(4px 4px 0px rgba(0,0,0,0.5))' }}
          />
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
            { icon: '/icons/Lightning bolt.png', text: 'Real connections', bg: '#FFE66D', fg: '#12122A' },
            { icon: '/icons/Heart.png',          text: 'Games first',      bg: '#FF6BA8', fg: '#fff'    },
            { icon: '/icons/Console remote.png', text: 'No cringe DMs',   bg: '#4EFFC4', fg: '#12122A' },
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

        {/* CTA */}
        <motion.button
          onClick={() => navigate('/onboarding/avatar')}
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
