import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { m } from 'motion/react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { EASE_EDITORIAL } from '../../../utils/motion';
import { cn } from '../../../utils/cn';

export interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export const AuthButton = forwardRef<HTMLButtonElement, AuthButtonProps>(
  ({ children, loading = false, disabled, className, type = 'submit', ...props }, ref) => {
    const reducedMotion = useReducedMotion();
    const isDisabled = Boolean(disabled || loading);

    return (
      <m.button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        whileHover={isDisabled || reducedMotion ? undefined : { scale: 1.01 }}
        whileTap={isDisabled || reducedMotion ? undefined : { scale: 0.985 }}
        transition={{ duration: 0.16, ease: EASE_EDITORIAL }}
        className={cn(
          'group relative flex items-center justify-center w-full h-[52px] sm:h-[54px] rounded-full bg-[#111E32] hover:bg-[#192B45] text-white text-[15px] font-semibold tracking-[0.01em] px-14 transition-colors duration-200 select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5AA70] focus-visible:ring-offset-2',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          className
        )}
        {...(props as Record<string, unknown>)}
      >
        <span
          aria-hidden="true"
          className="absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 h-[40px] w-[40px] sm:h-[42px] sm:w-[42px] rounded-full bg-[#E5C784] text-[#111E32] inline-flex items-center justify-center transition-transform duration-200 group-hover:bg-[#ebd197]"
        >
          {loading ? (
            <Loader2 className="h-[18px] w-[18px] animate-spin" />
          ) : (
            <ArrowRight
              className="h-[18px] w-[18px] transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={2.2}
            />
          )}
        </span>

        <span className="truncate">{children}</span>
      </m.button>
    );
  }
);

AuthButton.displayName = 'AuthButton';
