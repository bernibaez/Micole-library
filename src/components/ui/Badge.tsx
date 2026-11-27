import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

type BadgeVariant = 'neutral' | 'navy' | 'gold' | 'outline' | 'success' | 'forest' | 'forest-soft';

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-[#EFECE4] text-ink-muted border border-transparent',
  navy: 'bg-[#121D32] text-white border border-[#121D32]',
  gold: 'bg-[#F5EFE0] text-[#927437] border border-[#C1A15C]/30',
  outline: 'bg-white/85 text-ink border border-[#D4CFC2]',
  success: 'bg-[#EBF2EF] text-[#294C43] border border-[#294C43]/25',
  forest: 'bg-[#294C43] text-white border border-[#294C43] shadow-xs',
  'forest-soft': 'bg-[#EBF2EF] text-[#294C43] border border-[#294C43]/25',
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
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide whitespace-nowrap',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
