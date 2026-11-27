import { m } from 'motion/react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { cn } from '../../utils/cn';
import { EASE_EDITORIAL } from '../../utils/motion';

const NOTFOUND_STATIC_SRC = '/mascot/lex-notfound-static.webp';

const BOTTOM_FADE_MASK_STYLE = {
  WebkitMaskImage:
    'linear-gradient(to bottom, #000 0%, #000 84%, rgba(0, 0, 0, 0.55) 94%, transparent 100%)',
  maskImage:
    'linear-gradient(to bottom, #000 0%, #000 84%, rgba(0, 0, 0, 0.55) 94%, transparent 100%)',
} as const;

export interface LexNotFoundMascotProps {
  /** Compact mode for inline search dropdown popovers. */
  compact?: boolean;
  /** Wrapper class name. */
  className?: string;
}

export function LexNotFoundMascot({
  compact = false,
  className,
}: LexNotFoundMascotProps) {
  const reducedMotion = useReducedMotion();

  return (
    <m.div
      initial={reducedMotion ? false : { opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.36, ease: EASE_EDITORIAL }}
      className={cn(
        'relative inline-flex items-end justify-center select-none',
        compact ? 'h-24' : 'h-48 sm:h-56',
        className
      )}
    >
      <span
        className="relative flex h-full w-auto items-end justify-center drop-shadow-[0_12px_20px_rgba(16,29,53,0.12)]"
        style={BOTTOM_FADE_MASK_STYLE}
      >
        <img
          src={NOTFOUND_STATIC_SRC}
          alt="Asistente jurídica buscando sin resultados"
          draggable={false}
          decoding="async"
          className="h-full w-auto object-contain object-bottom pointer-events-none"
        />
      </span>
    </m.div>
  );
}
