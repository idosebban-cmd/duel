import { motion } from 'framer-motion';

/** Standard onboarding selection: orange/gold border + top-right checkmark (per design critique). */
export const GOLD_SELECTION = {
  borderSolid: '#FF9F1C',
  shadow: '0 0 0 2px rgba(255,159,28,0.45), 0 0 22px rgba(255,230,109,0.35), 5px 5px 0px 0px rgba(255,159,28,0.85)',
} as const;

export function GoldCornerCheckmark({ className }: { className?: string }) {
  return (
    <motion.span
      className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-full flex items-center justify-center text-[#12122A] text-xs font-bold pointer-events-none ${className ?? ''}`}
      style={{
        background: 'linear-gradient(135deg, #FF9F1C, #FFE66D)',
        border: '2px solid #000',
        boxShadow: '2px 2px 0 rgba(0,0,0,0.35)',
      }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500 }}
    >
      ✓
    </motion.span>
  );
}

export function GoldCornerCheckmarkSm({ className }: { className?: string }) {
  return (
    <motion.span
      className={`absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full flex items-center justify-center text-[#12122A] text-xs font-bold pointer-events-none ${className ?? ''}`}
      style={{
        background: 'linear-gradient(135deg, #FF9F1C, #FFE66D)',
        border: '2px solid #000',
        boxShadow: '1px 1px 0 rgba(0,0,0,0.35)',
      }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500 }}
    >
      ✓
    </motion.span>
  );
}
