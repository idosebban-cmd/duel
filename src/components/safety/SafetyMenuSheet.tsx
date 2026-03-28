import { motion, AnimatePresence } from 'framer-motion';

export function SafetyMenuSheet({
  open,
  targetName,
  onClose,
  onBlock,
  onReport,
}: {
  open: boolean;
  targetName: string;
  onClose: () => void;
  onBlock: () => void;
  onReport: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Safety options"
            className="fixed left-0 right-0 bottom-0 z-[61] rounded-t-3xl px-5 pt-4 pb-safe pb-6"
            style={{
              background: '#0E1830',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 -12px 40px rgba(0,0,0,0.5)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <div
              className="mx-auto mb-4 h-1 w-10 rounded-full"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            />
            <p className="font-display text-sm mb-3 text-center" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Safety
            </p>
            <div className="flex flex-col gap-2">
              <motion.button
                type="button"
                onClick={() => {
                  onBlock();
                  onClose();
                }}
                className="w-full py-4 rounded-2xl font-body text-sm font-bold text-left px-4"
                style={{
                  background: 'rgba(255,61,113,0.12)',
                  border: '1px solid rgba(255,61,113,0.35)',
                  color: '#FF6BA8',
                }}
                whileTap={{ scale: 0.98 }}
              >
                Block {targetName}
              </motion.button>
              <motion.button
                type="button"
                onClick={() => {
                  onReport();
                  onClose();
                }}
                className="w-full py-4 rounded-2xl font-body text-sm font-bold text-left px-4"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.85)',
                }}
                whileTap={{ scale: 0.98 }}
              >
                Report {targetName}
              </motion.button>
              <motion.button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl font-body text-sm font-bold mt-1"
                style={{ color: 'rgba(255,255,255,0.45)' }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
