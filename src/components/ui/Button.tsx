import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-gradient-to-r from-lemon-pop to-cherry-punch
    text-white font-display font-extrabold tracking-wide
    border-4 border-black
    shadow-[8px_8px_0px_0px_#B565FF]
    hover:shadow-[10px_10px_0px_0px_#B565FF]
    active:shadow-[4px_4px_0px_0px_#B565FF]
    active:translate-x-[4px] active:translate-y-[4px]
  `,
  secondary: `
    bg-white
    text-charcoal font-display font-bold
    border-3 border-black
    shadow-manga
    hover:shadow-manga-lg
  `,
  ghost: `
    bg-transparent
    text-hot-bubblegum font-body font-medium
    border-2 border-hot-bubblegum
    hover:bg-hot-bubblegum hover:text-white
  `,
  danger: `
    bg-gradient-to-r from-cherry-punch to-arcade-orange
    text-white font-display font-bold
    border-3 border-black
    shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)]
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm rounded-xl',
  md: 'px-6 py-3 text-base rounded-2xl',
  lg: 'px-8 py-4 text-lg rounded-2xl',
  xl: 'px-10 py-5 text-xl rounded-2xl',
};

export function Button({
  children,
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
  disabled = false,
  loading = false,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={disabled || loading ? {} : { scale: 1.03 }}
      whileTap={disabled || loading ? {} : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      disabled={disabled || loading}
      className={`
        relative overflow-hidden
        cursor-pointer select-none
        transition-all duration-150
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      {...props}
    >
      {/* Glossy overlay */}
      {variant === 'primary' && (
        <span className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-inherit pointer-events-none" />
      )}

      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
          Loading...
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}
