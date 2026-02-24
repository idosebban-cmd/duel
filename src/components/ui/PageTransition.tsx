import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: ReactNode;
}

const pageVariants = {
  initial: { opacity: 0, x: 60 },
  enter: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
};

const pageTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  duration: 0.3,
};

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
        className="w-full min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Decorative animated elements
export function PixelStar({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`text-lemon-pop select-none pointer-events-none ${className}`}
      animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 0.9, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      ★
    </motion.div>
  );
}

export function FloatingHeart({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`text-hot-bubblegum select-none pointer-events-none ${className}`}
      animate={{ y: [0, -8, 0], rotate: [-5, 5, -5] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      ♥
    </motion.div>
  );
}
