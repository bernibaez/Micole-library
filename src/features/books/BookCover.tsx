import { Scale } from 'lucide-react';
import type { Book } from '../../types';
import { cn } from '../../utils/cn';
import { getDocumentTypeLabel } from '../../utils/format';

interface BookCoverProps {
  book: Book;
  progressPercent?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BookCover({ book, progressPercent, size = 'md', className }: BookCoverProps) {
  const showProgress = typeof progressPercent === 'number' && progressPercent > 0;
  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  return (
    <div className="relative select-none">
      {/* Subtle physical page-block thickness peeking along right & bottom edge */}
      {!isSmall && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-[3px] bottom-[2px] -right-[4px] w-[6px] rounded-r-[4px] bg-gradient-to-b from-[#F5F1E6] via-[#E8E2D2] to-[#DCD4C0] border-y border-r border-black/10 opacity-90 transition-transform duration-300 group-hover:translate-x-[1px]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to right, rgba(16,29,53,0.08) 0px, rgba(16,29,53,0.08) 1px, transparent 1px, transparent 2px)',
          }}
        />
      )}

      <div
        className={cn(
          'lex-book-3d relative aspect-[2/3] w-full overflow-hidden rounded-book shadow-cover',
          className
        )}
        style={{ backgroundColor: book.color || '#101D35' }}
      >
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={`Portada de ${book.title}`}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]"
          />
        ) : (
          <div className="lex-book-linen relative h-full w-full flex flex-col justify-between p-3 sm:p-4 text-white">
            {/* Refined double gold editorial border inset */}
            <div
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute rounded-[2px_8px_8px_2px] border border-gold/30',
                isSmall ? 'inset-1.5 left-2.5' : 'inset-2.5 left-4'
              )}
            />
            {!isSmall && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-[14px] left-[20px] rounded-[1px_5px_5px_1px] border border-white/[0.08]"
              />
            )}

            {/* Top Editorial Masthead */}
            <div className={cn('relative z-10', isSmall ? 'pl-1.5 pt-0.5 space-y-1.5' : 'pl-3 pt-1 space-y-2')}>
              <div className="flex items-center justify-between gap-1.5">
                <span
                  className={cn(
                    'font-semibold uppercase tracking-[0.16em] text-[#EBD9B2] truncate',
                    isSmall ? 'text-[7px]' : 'text-[8.5px] sm:text-[9px]'
                  )}
                >
                  {getDocumentTypeLabel(book.document_type)}
                </span>
                {book.year && (
                  <span
                    className={cn(
                      'font-medium text-white/70 tabular-nums shrink-0',
                      isSmall ? 'text-[7.5px]' : 'text-[9px]'
                    )}
                  >
                    {book.year}
                  </span>
                )}
              </div>

              {/* Ornamental Gold Rule */}
              <div className="flex items-center gap-1.5">
                <span className={cn('h-px bg-gold/75', isSmall ? 'w-5' : 'w-8')} />
                <span className="h-1 w-1 rotate-45 bg-gold/80" aria-hidden="true" />
              </div>

              {/* Embossed Editorial Serif Title */}
              <p
                className={cn(
                  'font-editorial font-semibold leading-[1.18] text-white/95 line-clamp-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]',
                  isLarge
                    ? 'text-xl sm:text-2xl'
                    : isSmall
                      ? 'text-[11px] leading-[1.2]'
                      : 'text-[13.5px] sm:text-[15.5px]'
                )}
              >
                {book.title}
              </p>

              {!isSmall && book.author && (
                <p className="text-[10px] font-medium text-white/70 line-clamp-1 pt-0.5">
                  {book.author}
                </p>
              )}
            </div>

            {/* Bottom Legal Seal & Colophon */}
            <div className={cn('relative z-10', isSmall ? 'pl-1.5 pb-0.5 space-y-1' : 'pl-3 pb-1 space-y-2')}>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'rounded-full border border-gold/40 bg-black/15 inline-flex items-center justify-center text-gold/90',
                    isLarge ? 'h-9 w-9' : isSmall ? 'h-5 w-5' : 'h-7 w-7'
                  )}
                  aria-hidden="true"
                >
                  <Scale
                    className={cn(isLarge ? 'h-5 w-5' : isSmall ? 'h-3 w-3' : 'h-3.5 w-3.5')}
                    strokeWidth={1.5}
                  />
                </span>
                {!isSmall && (
                  <span className="text-[8px] uppercase tracking-[0.14em] text-[#EBD9B2]/80 truncate">
                    Edición Jurídica
                  </span>
                )}
              </div>

              <div className="pt-1.5 border-t border-white/15 flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'uppercase tracking-[0.14em] text-white/70 truncate',
                    isSmall ? 'text-[6.5px]' : 'text-[8px] sm:text-[8.5px]'
                  )}
                >
                  República Dominicana
                </span>
                <span
                  className={cn(
                    'font-bold uppercase tracking-[0.16em] text-gold shrink-0',
                    isSmall ? 'text-[6px]' : 'text-[7.5px]'
                  )}
                >
                  MICOLE
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Realistic Hardcover Spine Shading & Binding Hinge Groove (applies to ALL covers) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-3.5 bg-gradient-to-r from-black/38 via-black/12 to-transparent z-20"
        />
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-y-0 w-[2px] bg-black/28 shadow-[1px_0_0_rgba(255,255,255,0.22)] z-20',
            isSmall ? 'left-[7px]' : 'left-[11px]'
          )}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-[1.5px] bg-white/25 z-20"
        />

        {/* Subtle Top-Left Ambient Light Sheen & Crisp Outer Edge */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.14] via-transparent to-black/[0.18] z-20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/15 rounded-book z-20"
        />

        {showProgress && (
          <div
            className="absolute inset-x-0 bottom-0 h-1.5 bg-black/40 z-30"
            aria-label={`Progreso de lectura: ${Math.round(progressPercent)}%`}
          >
            <div
              className="h-full bg-gold transition-[width] duration-300"
              style={{ width: `${Math.min(100, Math.max(4, progressPercent))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
