import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelColor?: string;
  error?: string;
  success?: boolean;
  hint?: string;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
  borderColor?: string;
  dark?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  labelColor = 'text-hot-bubblegum',
  error,
  success,
  hint,
  leftIcon,
  rightElement,
  borderColor = 'border-pixel-cyan',
  dark = false,
  className = '',
  ...props
}, ref) => {
  const borderClass = error
    ? 'border-cherry-punch focus:border-cherry-punch focus:ring-cherry-punch/30'
    : success
    ? 'border-electric-mint focus:border-electric-mint focus:ring-electric-mint/30'
    : `${borderColor} focus:ring-hot-bubblegum/30`;

  if (dark) {
    return (
      <div className="w-full">
        {label && (
          <label className="block font-display font-bold text-sm tracking-wider mb-2" style={{ color: error ? '#FF3D71' : success ? '#4EFFC4' : '#4EFFC4' }}>
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            className={`w-full rounded-2xl px-5 py-4 font-body text-base focus:outline-none transition-all duration-200 placeholder:text-white/30 ${leftIcon ? 'pl-11' : ''} ${rightElement || error || success ? 'pr-12' : ''} ${className}`}
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: `2px solid ${error ? '#FF3D71' : success ? '#4EFFC4' : 'rgba(78,255,196,0.3)'}`,
              color: 'white',
              borderRadius: 14,
            }}
            {...props}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            {error && <AlertCircle size={20} className="text-cherry-punch" />}
            {success && !error && <CheckCircle size={20} className="text-electric-mint" />}
            {rightElement && !error && !success && rightElement}
          </span>
        </div>
        <AnimatePresence>
          {error && (
            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="mt-1.5 text-sm text-cherry-punch font-body flex items-center gap-1">
              <AlertCircle size={14} />{error}
            </motion.p>
          )}
          {!error && hint && <p className="mt-1.5 text-xs font-body" style={{ color: 'rgba(255,255,255,0.4)' }}>{hint}</p>}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="w-full">
      {label && (
        <label className={`block font-display font-bold text-sm tracking-wider mb-2 ${labelColor}`}>
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/50">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-white rounded-2xl
            border-3 ${borderClass}
            px-5 py-4 text-charcoal font-body text-base
            placeholder:text-charcoal/30
            focus:outline-none focus:ring-4
            transition-all duration-200
            ${leftIcon ? 'pl-11' : ''}
            ${rightElement || error || success ? 'pr-12' : ''}
            ${className}
          `}
          {...props}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2">
          {error && <AlertCircle size={20} className="text-cherry-punch" />}
          {success && !error && <CheckCircle size={20} className="text-electric-mint" />}
          {rightElement && !error && !success && rightElement}
        </span>
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-1.5 text-sm text-cherry-punch font-body flex items-center gap-1"
          >
            <AlertCircle size={14} />
            {error}
          </motion.p>
        )}
        {!error && hint && (
          <p className="mt-1.5 text-xs text-charcoal/40 font-body">{hint}</p>
        )}
      </AnimatePresence>
    </div>
  );
});

Input.displayName = 'Input';
