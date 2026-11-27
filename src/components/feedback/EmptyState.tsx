import type { ReactNode } from 'react';
import { BookOpen } from 'lucide-react';
import { cn } from '../../utils/cn';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border border-dashed border-line-strong bg-surface-secondary/50',
        className
      )}
    >
      <div className="h-12 w-12 rounded-xl bg-white border border-line flex items-center justify-center text-gold-dark mb-4 shadow-subtle">
        {icon ?? <BookOpen className="h-5 w-5" />}
      </div>
      <h2 className="text-lg font-semibold text-navy">{title}</h2>
      <p className="text-sm text-ink-muted max-w-md mt-1.5 leading-relaxed">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
