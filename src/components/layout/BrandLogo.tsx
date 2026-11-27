import { Scale } from 'lucide-react';
import { cn } from '../../utils/cn';

export function BrandLogo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <span className="h-9 w-9 rounded-xl bg-navy text-gold inline-flex items-center justify-center shadow-sm shrink-0">
        <Scale className="h-[19px] w-[19px]" strokeWidth={1.8} />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-bold tracking-[0.04em] text-navy whitespace-nowrap">
            MICOLE <span className="font-semibold text-navy-secondary">LIBRARY</span>
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-gold-dark mt-0.5">
            Biblioteca Jurídica
          </span>
        </span>
      )}
    </span>
  );
}
