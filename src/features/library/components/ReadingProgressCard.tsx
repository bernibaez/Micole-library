import { Link } from 'react-router-dom';
import { m } from 'motion/react';
import { BookOpen, MoreHorizontal } from 'lucide-react';
import { BookCover } from '../../books/BookCover';
import { ReadingProgressBar } from './ReadingProgress';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { EASE_EDITORIAL } from '../../../utils/motion';
import type { Book, ReadingProgress } from '../../../types';

interface ReadingProgressCardProps {
  book: Book;
  progress: ReadingProgress;
  index?: number;
  onOpenMenu: (book: Book, anchorRect: DOMRect | null) => void;
}

export function ReadingProgressCard({
  book,
  progress,
  index = 0,
  onOpenMenu,
}: ReadingProgressCardProps) {
  const reducedMotion = useReducedMotion();
  const percent = Math.min(100, Math.max(0, Math.round(progress.progress_percent)));
  const totalPages = progress.total_pages ?? book.pages ?? null;
  const readerHref = `/leer/${book.id}?pagina=${Math.max(1, progress.current_page)}`;

  return (
    <m.article
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, delay: Math.min(index, 4) * 0.04, ease: EASE_EDITORIAL }}
      className="group rounded-2xl border border-[#E5E3DD] bg-white p-3.5 sm:p-4 shadow-subtle hover:shadow-[0_12px_28px_-12px_rgba(17,30,50,0.16)] hover:border-[#D6D2C7] transition-all duration-200 flex items-stretch gap-3.5 min-w-0"
    >
      {/* Miniature physical 3D book cover */}
      <Link
        to={readerHref}
        aria-label={`Continuar leyendo ${book.title}`}
        className="w-[68px] sm:w-[76px] shrink-0 self-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5AA70] rounded-book"
      >
        <BookCover
          book={book}
          size="sm"
          className="transition-transform duration-200 group-hover:-translate-y-0.5"
        />
      </Link>

      {/* Details & progress */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-0.5">
            <Link
              to={readerHref}
              title={book.title}
              className="block text-[13.5px] sm:text-sm font-semibold text-[#111E32] leading-snug line-clamp-2 hover:text-[#294C43] transition-colors"
            >
              {book.title}
            </Link>
            {book.author && (
              <p className="text-xs text-[#667085] truncate">{book.author}</p>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => onOpenMenu(book, e.currentTarget.getBoundingClientRect())}
            aria-label={`Más opciones para ${book.title}`}
            className="h-8 w-8 -mr-1 -mt-1 rounded-lg inline-flex items-center justify-center text-[#667085] hover:text-[#111E32] hover:bg-[#F6F5F1] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5AA70]"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums">
              <span className="text-[#667085]">
                Página <strong className="text-[#111E32] font-semibold">{progress.current_page}</strong>
                {totalPages ? ` de ${totalPages}` : ''}
              </span>
              <span className="font-semibold text-[#9A7D43]">{percent}%</span>
            </div>
            <ReadingProgressBar percent={percent} />
          </div>

          <Link
            to={readerHref}
            className="inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-3.5 rounded-full bg-[#111E32] hover:bg-[#192B45] text-white text-xs font-medium transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5 text-[#E5C784]" aria-hidden="true" />
            <span>Continuar lectura</span>
          </Link>
        </div>
      </div>
    </m.article>
  );
}
