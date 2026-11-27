import { Link } from 'react-router-dom';
import { m } from 'motion/react';
import { Bookmark, BookOpen, MoreHorizontal } from 'lucide-react';
import { BookCover } from '../../books/BookCover';
import { ReadingStatusLine } from './ReadingProgress';
import type { LibraryBookEntry } from './LibraryBookCard';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { getDocumentTypeLabel } from '../../../utils/format';
import { EASE_EDITORIAL } from '../../../utils/motion';
import { cn } from '../../../utils/cn';
import type { Book } from '../../../types';

interface LibraryBookListProps {
  entries: LibraryBookEntry[];
  onOpenMenu: (book: Book, anchorRect: DOMRect | null) => void;
  onToggleFavorite: (bookId: string) => void;
}

export function LibraryBookList({
  entries,
  onOpenMenu,
  onToggleFavorite,
}: LibraryBookListProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="rounded-2xl border border-[#E5E3DD] bg-white divide-y divide-[#E5E3DD] overflow-hidden shadow-subtle">
      {entries.map((entry, idx) => {
        const { book, status, progress, isFavorite, isDownloaded } = entry;
        const isInProgress = Boolean(
          progress && progress.progress_percent > 0 && progress.progress_percent < 100
        );
        const canRead = Boolean((book.file_url || book.drive_file_id) && book.allow_preview !== false);
        const readHref = isInProgress
          ? `/leer/${book.id}?pagina=${progress?.current_page ?? 1}`
          : `/leer/${book.id}`;

        return (
          <m.article
            key={book.id}
            initial={reducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.2,
              delay: Math.min(idx, 10) * 0.02,
              ease: EASE_EDITORIAL,
            }}
            className="group flex items-center gap-3.5 sm:gap-5 px-4 sm:px-5 py-3.5 hover:bg-[#FAF9F6] transition-colors"
          >
            <Link
              to={`/libro/${book.id}`}
              className="w-[54px] sm:w-[62px] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5AA70] rounded-book"
            >
              <BookCover book={book} size="sm" />
            </Link>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="font-semibold uppercase tracking-[0.12em] text-[#9A7D43]">
                  {getDocumentTypeLabel(book.document_type)}
                </span>
                <span aria-hidden="true" className="text-[#D5D1C7]">
                  ·
                </span>
                <span className="text-[#667085] truncate">{book.category}</span>
                {book.year && (
                  <>
                    <span aria-hidden="true" className="text-[#D5D1C7]">
                      ·
                    </span>
                    <span className="text-[#667085] tabular-nums">{book.year}</span>
                  </>
                )}
              </div>

              <Link
                to={`/libro/${book.id}`}
                title={book.title}
                className="block font-editorial text-[15.5px] sm:text-[17px] font-semibold text-[#111E32] leading-snug line-clamp-1 hover:text-[#294C43] transition-colors"
              >
                {book.title}
              </Link>

              <p className="text-xs text-[#667085] truncate">{book.author}</p>

              <div className="max-w-[260px]">
                <ReadingStatusLine
                  status={status}
                  progress={progress}
                  isFavorite={false}
                  isDownloaded={isDownloaded}
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {canRead && (
                <Link
                  to={readHref}
                  className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[#111E32] hover:bg-[#192B45] text-white text-xs font-medium transition-colors"
                >
                  <BookOpen className="h-3.5 w-3.5 text-[#E5C784]" aria-hidden="true" />
                  <span>{isInProgress ? 'Continuar' : 'Abrir'}</span>
                </Link>
              )}

              <m.button
                type="button"
                whileTap={reducedMotion ? undefined : { scale: 0.9 }}
                onClick={() => onToggleFavorite(book.id)}
                aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                aria-pressed={isFavorite}
                title={isFavorite ? 'En favoritos' : 'Añadir a favoritos'}
                className={cn(
                  'h-10 w-10 sm:h-9 sm:w-9 rounded-full border inline-flex items-center justify-center transition-colors',
                  isFavorite
                    ? 'border-[#C5AA70]/50 bg-[#FBF6EA] text-[#9A7D43]'
                    : 'border-[#E5E3DD] bg-white text-[#667085] hover:text-[#111E32] hover:bg-[#F6F5F1]'
                )}
              >
                <Bookmark
                  className="h-4 w-4"
                  fill={isFavorite ? 'currentColor' : 'none'}
                  aria-hidden="true"
                />
              </m.button>

              <button
                type="button"
                onClick={(e) => onOpenMenu(book, e.currentTarget.getBoundingClientRect())}
                aria-label={`Opciones para ${book.title}`}
                className="h-10 w-10 sm:h-9 sm:w-9 rounded-full border border-[#E5E3DD] bg-white text-[#667085] hover:text-[#111E32] hover:bg-[#F6F5F1] inline-flex items-center justify-center transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </m.article>
        );
      })}
    </div>
  );
}
