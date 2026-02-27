import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Zap, Heart } from 'lucide-react';

// Decorative pixel elements
const decorElements = [
  { icon: '/icons/Celebration.png', x: '8%', y: '15%', size: 32, delay: 0 },
  { icon: '/icons/Heart.png', x: '92%', y: '20%', size: 28, delay: 0.3 },
  { icon: '/icons/Lightning bolt.png', x: '5%', y: '70%', size: 24, delay: 0.6 },
  { icon: '/icons/Celebration.png', x: '88%', y: '75%', size: 30, delay: 0.2 },
  { icon: '/icons/Celebration.png', x: '50%', y: '8%', size: 20, delay: 0.8 },
  { icon: '/icons/Console remote.png', x: '15%', y: '45%', size: 26, delay: 0.4 },
  { icon: '/icons/Heart.png', x: '80%', y: '50%', size: 22, delay: 0.7 },
];

export function WelcomeScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #FFF8F0 0%, #FFF0F5 40%, #F0F0FF 100%)',
      }}
    >
      {/* Halftone background */}
      <div className="absolute inset-0 halftone opacity-60 pointer-events-none" />

      {/* Background burst shapes */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,230,109,0.15) 0%, transparent 70%)',
        }}
      />

      {/* Speed lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-5" aria-hidden="true">
        {[...Array(8)].map((_, i) => (
          <line
            key={i}
            x1={`${(i / 8) * 100}%`} y1="0"
            x2="50%" y2="50%"
            stroke="#2D3142" strokeWidth="1"
          />
        ))}
        {[...Array(8)].map((_, i) => (
          <line
            key={`b-${i}`}
            x1={`${(i / 8) * 100}%`} y1="100%"
            x2="50%" y2="50%"
            stroke="#2D3142" strokeWidth="1"
          />
        ))}
      </svg>

      {/* Floating decorative elements */}
      {decorElements.map((el, i) => (
        <motion.div
          key={i}
          className="absolute select-none pointer-events-none"
          style={{ left: el.x, top: el.y, width: el.size, height: el.size }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0.7, 1, 0.7],
            scale: [1, 1.2, 1],
            y: [0, -8, 0],
          }}
          transition={{
            duration: 2.5 + i * 0.3,
            repeat: Infinity,
            delay: el.delay,
            ease: 'easeInOut',
          }}
        >
          <img src={el.icon} alt="" className="w-full h-full object-contain" />
        </motion.div>
      ))}

      {/* Comic burst behind logo */}
      <motion.div
        className="absolute"
        style={{
          width: 280,
          height: 280,
          background: 'radial-gradient(circle, rgba(255,230,109,0.25) 0%, transparent 65%)',
          borderRadius: '50%',
        }}
        animate={{ scale: [1, 1.08, 1], rotate: [0, 5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Main content */}
      <motion.div
        className="relative z-10 flex flex-col items-center px-6 text-center max-w-md"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        >
          <h1
            className="font-display text-8xl font-extrabold tracking-tight leading-none mb-2 select-none"
            style={{
              background: 'linear-gradient(135deg, #FF6BA8 0%, #B565FF 50%, #FF3D71 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(3px 3px 0px rgba(0,0,0,0.15))',
            }}
          >
            DUEL
          </h1>
        </motion.div>

        {/* Headline */}
        <motion.h2
          className="font-display font-extrabold text-4xl sm:text-5xl text-charcoal mb-4 leading-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Welcome to{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #FF6BA8, #FF3D71)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Duel
          </span>
        </motion.h2>

        {/* Subheading */}
        <motion.p
          className="font-body font-medium text-lg sm:text-xl text-charcoal/70 mb-4 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          Play games together.{' '}
          <span className="text-charcoal/90 font-semibold">Skip the awkward texts.</span>
        </motion.p>

        {/* Feature pills */}
        <motion.div
          className="flex gap-2 mb-10 flex-wrap justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {[
            { icon: <Zap size={14} />, text: 'Real connections', color: '#FFE66D' },
            { icon: <Heart size={14} />, text: 'Games first', color: '#FF6BA8' },
            { icon: <Gamepad2 size={14} />, text: 'No cringe DMs', color: '#4EFFC4' },
          ].map((pill) => (
            <span
              key={pill.text}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-semibold text-charcoal border-2 border-black shadow-manga"
              style={{ backgroundColor: pill.color }}
            >
              {pill.icon}
              {pill.text}
            </span>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.button
          onClick={() => navigate('/onboarding/avatar')}
          className="relative overflow-hidden w-full max-w-xs font-display font-extrabold text-xl text-white rounded-[20px] py-5 px-8 cursor-pointer select-none"
          style={{
            background: 'linear-gradient(135deg, #FFE66D 0%, #FF9F1C 40%, #FF3D71 100%)',
            border: '4px solid black',
            boxShadow: '8px 8px 0px 0px #B565FF',
            textShadow: '1px 1px 0 rgba(0,0,0,0.3)',
          }}
          whileHover={{
            scale: 1.05,
            boxShadow: '10px 10px 0px 0px #B565FF',
          }}
          whileTap={{
            scale: 0.97,
            boxShadow: '4px 4px 0px 0px #B565FF',
            translateX: 4,
            translateY: 4,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Glossy overlay */}
          <span className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
          Create Your Character
        </motion.button>

        <motion.p
          className="mt-4 font-body text-sm text-charcoal/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Already have an account?{' '}
          <button className="text-hot-bubblegum font-semibold hover:underline">Sign in</button>
        </motion.p>
      </motion.div>

      {/* Bottom decorative bar */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-2"
        style={{
          background: 'linear-gradient(90deg, #FF6BA8, #FFE66D, #4EFFC4, #B565FF, #FF6BA8)',
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      />
    </div>
  );
}
