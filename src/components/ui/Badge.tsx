import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

type BadgeVariant = 'neutral' | 'navy' | 'gold' | 'outline' | 'success';

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-secondary text-ink-muted border border-transparent',
  navy: 'bg-navy text-white border border-navy',
  gold: 'bg-gold-soft text-gold-dark border border-gold/30',
  outline: 'bg-white text-ink border border-line-strong',
  success: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
};

export function Badge({
  children,
  variant = 'neutral',
  className,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide whitespace-nowrap',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
