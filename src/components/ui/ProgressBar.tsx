import { motion } from 'framer-motion';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

export function ProgressBar({ current, total, label }: ProgressBarProps) {

  return (
    <div className="w-full">
      {label && (
        <p className="font-body text-sm text-charcoal/60 mb-2 text-center">
          {label}
        </p>
      )}
      <div className="flex items-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <motion.div
            key={i}
            className="flex-1 h-2 rounded-full border border-black/20 overflow-hidden"
            style={{ backgroundColor: '#e5e7eb' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: i < current
                  ? 'linear-gradient(90deg, #FF6BA8, #B565FF)'
                  : 'transparent',
              }}
              initial={{ width: 0 }}
              animate={{ width: i < current ? '100%' : '0%' }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: 'easeOut' }}
            />
          </motion.div>
        ))}
      </div>
      <p className="font-display font-bold text-xs text-center mt-1.5 text-charcoal/50">
        {current} / {total}
      </p>
    </div>
  );
}

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
}

export function StepIndicator({ currentStep, totalSteps, stepLabel }: StepIndicatorProps) {
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto">
      <span className="font-display font-bold text-sm text-charcoal/60 tracking-widest uppercase">
        Step {currentStep} of {totalSteps} — {stepLabel}
      </span>
      <ProgressBar current={currentStep} total={totalSteps} />
    </div>
  );
}
