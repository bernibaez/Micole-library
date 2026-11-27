import type { ReactNode } from 'react';
import { BookOpen } from 'lucide-react';
import { LexNotFoundMascot } from '../mascot/LexNotFoundMascot';
import { cn } from '../../utils/cn';

interface EmptyStateProps {
  icon?: ReactNode;
  mascot?: 'not-found' | 'none';
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  mascot = 'none',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 sm:py-16 px-6 rounded-3xl border border-line/90 bg-white shadow-subtle',
        className
      )}
    >
      {mascot === 'not-found' ? (
        <LexNotFoundMascot className="mb-3" />
      ) : (
        <div className="h-12 w-12 rounded-2xl bg-paper border border-line flex items-center justify-center text-gold-dark mb-4">
          {icon ?? <BookOpen className="h-5 w-5" />}
        </div>
      )}
      <h2 className="font-editorial text-xl sm:text-2xl font-semibold text-navy tracking-tight">
        {title}
      </h2>
      <p className="text-sm text-ink-muted max-w-md mt-1.5 leading-relaxed">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
