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
    const distance = Math.max(260, el.clientWidth * 0.72);
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
      className="space-y-4"
    >
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-editorial text-xl sm:text-[22px] font-semibold text-navy tracking-tight">
            {title}
          </h2>
          {subtitle && <p className="text-xs sm:text-sm text-ink-muted mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollTrack('left')}
              aria-label={`Desplazar ${title} a la izquierda`}
              className="h-8 w-8 rounded-full border border-line bg-white text-ink-muted hover:text-navy hover:border-line-strong inline-flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollTrack('right')}
              aria-label={`Desplazar ${title} a la derecha`}
              className="h-8 w-8 rounded-full border border-line bg-white text-ink-muted hover:text-navy hover:border-line-strong inline-flex items-center justify-center transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {seeAllTo && (
            <Link
              to={seeAllTo}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-navy hover:border-navy/25 hover:bg-sand-soft transition-all"
            >
              Ver todos
              <ChevronRight className="h-3.5 w-3.5 text-ink-muted" />
            </Link>
          )}
        </div>
      </div>

      <div
        ref={trackRef}
        className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 pt-2 -mt-2 -mx-1 px-1"
      >
        {books.map((book, idx) => (
          <div
            key={book.id}
            className="w-[156px] sm:w-[178px] lg:w-[192px] shrink-0 snap-start"
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
