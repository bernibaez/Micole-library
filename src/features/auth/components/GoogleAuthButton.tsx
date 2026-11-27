import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { m } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { EASE_EDITORIAL } from '../../../utils/motion';
import { cn } from '../../../utils/cn';

export interface GoogleAuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  label?: string;
}

export const GoogleAuthButton = forwardRef<HTMLButtonElement, GoogleAuthButtonProps>(
  (
    {
      loading = false,
      disabled,
      label = 'Continuar con Google',
      className,
      type = 'button',
      ...props
    },
    ref
  ) => {
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
          'flex items-center justify-center gap-3 w-full h-[50px] sm:h-[52px] rounded-full bg-white border border-[#E2E5EB] hover:bg-[#F8F9FB] hover:border-[#CDD2DC] text-[#111E32] text-[15px] font-semibold transition-colors duration-200 select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111E32] focus-visible:ring-offset-2',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          className
        )}
        {...(props as Record<string, unknown>)}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-[#667085]" aria-hidden="true" />
        ) : (
          <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        <span>{label}</span>
      </m.button>
    );
  }
);

GoogleAuthButton.displayName = 'GoogleAuthButton';
