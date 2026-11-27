import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { m } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Book, ReadingProgress } from '../../types';
import { BookCard } from './BookCard';
import { SCROLL_REVEAL_VARIANTS, VIEWPORT_ONCE } from '../../utils/motion';

interface BookShelfProps {
  title: string;
  subtitle?: string;
  seeAllTo?: string;
  books: Book[];
  isInLibrary?: (bookId: string) => boolean;
  isFavorite?: (bookId: string) => boolean;
  getProgress?: (bookId: string) => ReadingProgress | undefined;
  onToggleLibrary?: (bookId: string) => void;
  onToggleFavorite?: (bookId: string) => void;
  onPreview?: (book: Book) => void;
}

export function BookShelf({
  title,
  subtitle,
  seeAllTo,
  books,
  isInLibrary,
  isFavorite,
  getProgress,
  onToggleLibrary,
  onToggleFavorite,
  onPreview,
}: BookShelfProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (books.length === 0) return null;

  const scrollTrack = (direction: 'left' | 'right') => {
    const el = trackRef.current;
    if (!el) return;
    const distance = Math.max(240, el.clientWidth * 0.72);
    el.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  return (
    <m.section
      variants={SCROLL_REVEAL_VARIANTS}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_ONCE}
      className="space-y-3.5"
    >
      <div className="flex items-end justify-between gap-4 border-b border-line/70 pb-2.5">
        <div className="min-w-0">
          <h2 className="font-editorial text-lg sm:text-[21px] font-semibold text-navy tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-ink-muted mt-0.5 line-clamp-1">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollTrack('left')}
              aria-label={`Desplazar ${title} a la izquierda`}
              className="h-7 w-7 rounded-full border border-line bg-white/85 text-ink-muted hover:text-navy hover:border-line-strong inline-flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => scrollTrack('right')}
              aria-label={`Desplazar ${title} a la derecha`}
              className="h-7 w-7 rounded-full border border-line bg-white/85 text-ink-muted hover:text-navy hover:border-line-strong inline-flex items-center justify-center transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {seeAllTo && (
            <Link
              to={seeAllTo}
              className="inline-flex items-center gap-0.5 text-xs font-semibold text-navy/85 hover:text-gold-dark transition-colors pl-1"
            >
              <span>Ver todos</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Compact −23% editorial shelf cards */}
      <div
        ref={trackRef}
        className="flex gap-4 sm:gap-5 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 pt-2 -mt-1 -mx-1 px-1"
      >
        {books.map((book, idx) => (
          <div
            key={book.id}
            className="w-[124px] sm:w-[138px] lg:w-[148px] shrink-0 snap-start"
          >
            <BookCard
              book={book}
              index={idx}
              inLibrary={isInLibrary?.(book.id)}
              isFavorite={isFavorite?.(book.id)}
              progress={getProgress?.(book.id)}
              onToggleLibrary={onToggleLibrary}
              onToggleFavorite={onToggleFavorite}
              onPreview={onPreview}
            />
          </div>
        ))}
      </div>
    </m.section>
  );
}
