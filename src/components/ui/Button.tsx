import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { EASE_EDITORIAL, TRANSITION_MICRO } from '../../utils/motion';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#101D35] text-white border border-[#101D35] hover:bg-[#1C3152] shadow-sm',
  secondary:
    'bg-white text-[#101D35] border border-[#D3D9E3] hover:bg-[#F4F6F9]',
  ghost:
    'bg-transparent text-[#343B49] border border-transparent hover:bg-[#F4F6F9] hover:text-[#101D35]',
  danger:
    'bg-red-600 text-white border border-red-600 hover:bg-red-700',
  gold:
    'bg-[#C5A15B] text-[#101D35] border border-[#C5A15B] hover:bg-[#b8944f] font-semibold',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
  icon: 'h-10 w-10 rounded-lg justify-center',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = Boolean(disabled || loading);

    return (
      <m.button
        ref={ref}
        disabled={isDisabled}
        whileHover={isDisabled ? undefined : { scale: 1.015 }}
        whileTap={isDisabled ? undefined : { scale: 0.982 }}
        transition={{ duration: 0.14, ease: EASE_EDITORIAL }}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...(props as Record<string, unknown>)}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {loading && (
            <m.span
              key="spinner"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={TRANSITION_MICRO}
              className="inline-flex shrink-0"
            >
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            </m.span>
          )}
        </AnimatePresence>
        {children}
      </m.button>
    );
  }
);

Button.displayName = 'Button';
