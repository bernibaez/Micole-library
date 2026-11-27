import { Link } from 'react-router-dom';
import { m } from 'motion/react';
import { MoreHorizontal } from 'lucide-react';
import { BookCover } from '../../books/BookCover';
import { ReadingStatusLine } from './ReadingProgress';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { EASE_EDITORIAL } from '../../../utils/motion';
import type { Book, LibraryStatus, ReadingProgress } from '../../../types';

export interface LibraryBookEntry {
  book: Book;
  status: LibraryStatus;
  progress?: ReadingProgress;
  inLibrary: boolean;
  isFavorite: boolean;
  isDownloaded: boolean;
  addedAt: string;
  lastReadAt: string;
}

interface LibraryBookCardProps {
  entry: LibraryBookEntry;
  index: number;
  onOpenMenu: (book: Book, anchorRect: DOMRect | null) => void;
}

export function LibraryBookCard({ entry, index, onOpenMenu }: LibraryBookCardProps) {
  const reducedMotion = useReducedMotion();
  const { book, status, progress, isFavorite, isDownloaded } = entry;
  const staggerDelay = Math.min(index, 10) * 0.025;
  const isInProgress = Boolean(
    progress && progress.progress_percent > 0 && progress.progress_percent < 100
  );
  const destination = isInProgress
    ? `/leer/${book.id}?pagina=${progress?.current_page ?? 1}`
    : `/libro/${book.id}`;

  return (
    <m.article
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay: staggerDelay, ease: EASE_EDITORIAL }}
      className="group flex flex-col min-w-0 w-full max-w-[186px] mx-auto"
    >
      {/* Physical 3D Book Cover with gentle 3-4px hover lift */}
      <div className="relative transition-transform duration-200 ease-out group-hover:-translate-y-1">
        <Link
          to={destination}
          title={book.title}
          className="block rounded-book focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5AA70] focus-visible:ring-offset-2"
        >
          <BookCover
            book={book}
            className="transition-shadow duration-200 group-hover:shadow-[0_16px_30px_-10px_rgba(17,30,50,0.28),0_6px_12px_-4px_rgba(17,30,50,0.14)]"
          />
        </Link>

        {/* Grounded subtle shadow beneath cover */}
        <div
          aria-hidden="true"
          className="pointer-events-none mx-2.5 mt-1 h-1.5 rounded-full bg-[#111E32]/12 blur-[5px] opacity-65 transition-opacity duration-200 group-hover:opacity-95"
        />

        {/* Discrete contextual menu trigger */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenMenu(book, e.currentTarget.getBoundingClientRect());
          }}
          aria-label={`Opciones para ${book.title}`}
          className="absolute top-2 right-2 z-30 h-8 w-8 rounded-full bg-white/92 backdrop-blur-sm border border-black/5 text-[#111E32] shadow-subtle inline-flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 hover:bg-white transition-all duration-150 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5AA70]"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Clean Editorial Metadata below cover */}
      <div className="mt-2 px-0.5 min-w-0 space-y-0.5">
        <Link
          to={destination}
          title={book.title}
          className="block text-[13px] font-semibold text-[#111E32] leading-[1.3] line-clamp-2 hover:text-[#294C43] transition-colors"
        >
          {book.title}
        </Link>
        <p className="text-[11.5px] text-[#667085] truncate">{book.author}</p>
        <ReadingStatusLine
          status={status}
          progress={progress}
          isFavorite={isFavorite}
          isDownloaded={isDownloaded}
        />
      </div>
    </m.article>
  );
}
