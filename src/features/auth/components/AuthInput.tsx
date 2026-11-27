import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../../utils/cn';

export interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  error?: string;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ id, label, leftIcon, rightSlot, error, className, ...props }, ref) => {
    const errorId = id ? `${id}-error` : undefined;

    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="sr-only">
          {label}
        </label>

        <div
          className={cn(
            'flex items-center h-[50px] sm:h-[52px] rounded-2xl bg-white border transition-all duration-200',
            error
              ? 'border-red-400 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-100'
              : 'border-[#E2E5EB] hover:border-[#C8CDD8] focus-within:border-[#111E32] focus-within:ring-4 focus-within:ring-[#111E32]/[0.07]'
          )}
        >
          {leftIcon && (
            <span
              aria-hidden="true"
              className="pl-4 pr-2.5 text-[#667085] flex items-center justify-center shrink-0"
            >
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={id}
            aria-label={label}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error && errorId ? errorId : undefined}
            className={cn(
              'w-full min-w-0 h-full bg-transparent text-base sm:text-[15px] text-[#111E32] placeholder:text-[#667085]/80 focus:outline-none',
              !leftIcon && 'pl-4',
              !rightSlot && 'pr-4',
              className
            )}
            {...props}
          />

          {rightSlot && (
            <div className="pr-1.5 flex items-center justify-center shrink-0">{rightSlot}</div>
          )}
        </div>

        {error && (
          <p id={errorId} role="alert" className="text-xs text-red-600 pl-2 font-medium">
            {error}
          </p>
        )}
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';
