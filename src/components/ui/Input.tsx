import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, error, hint, leftIcon, rightSlot, className, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-navy">
            {label}
          </label>
        )}
        <div
          className={cn(
            'flex items-center rounded-lg border bg-white transition-colors duration-150',
            error
              ? 'border-red-500 focus-within:ring-2 focus-within:ring-red-200'
              : 'border-line-strong focus-within:border-navy focus-within:ring-2 focus-within:ring-navy/10',
            props.disabled && 'bg-surface-secondary opacity-70'
          )}
        >
          {leftIcon && <span className="pl-3 text-ink-muted shrink-0">{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            className={cn(
              'w-full min-w-0 bg-transparent px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:outline-none',
              leftIcon && 'pl-2',
              rightSlot && 'pr-2',
              className
            )}
            {...props}
          />
          {rightSlot && <div className="pr-2 shrink-0 flex items-center">{rightSlot}</div>}
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-xs text-ink-muted">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
