import { Link } from 'react-router-dom';
import { m } from 'motion/react';
import { Scale } from 'lucide-react';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { EASE_EDITORIAL } from '../../../utils/motion';
import { cn } from '../../../utils/cn';

interface AuthBrandProps {
  centered?: boolean;
  className?: string;
}

export function AuthBrand({ centered = false, className }: AuthBrandProps) {
  const reducedMotion = useReducedMotion();

  return (
    <m.div
      initial={reducedMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_EDITORIAL }}
      className={cn(
        'inline-flex items-center',
        centered ? 'justify-center' : 'justify-start',
        className
      )}
    >
      <Link
        to="/"
        aria-label="MICOLE LIBRARY — Volver al inicio"
        className="inline-flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C784] rounded-xl p-1 -m-1"
      >
        <span className="h-11 w-11 sm:h-12 sm:w-12 rounded-[14px] bg-[#111E32]/90 border border-[#C5AA70]/70 text-[#E5C784] inline-flex items-center justify-center shadow-[0_6px_18px_rgba(0,0,0,0.28)] transition-transform duration-200 group-hover:scale-105 shrink-0">
          <Scale className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} aria-hidden="true" />
        </span>

        <span className="flex flex-col text-left leading-none">
          <span className="text-[17px] sm:text-[19px] font-bold tracking-[0.04em] text-white whitespace-nowrap">
            MICOLE LIBRARY
          </span>
          <span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.22em] text-white/70 mt-1 whitespace-nowrap">
            Biblioteca Jurídica Virtual
          </span>
        </span>
      </Link>
    </m.div>
  );
}
