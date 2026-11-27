import { Link } from 'react-router-dom';
import { m } from 'motion/react';
import { Bookmark, BookOpen, Eye, FileText, Heart } from 'lucide-react';
import type { Book, ReadingProgress } from '../../types';
import { BookCover } from './BookCover';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../utils/cn';
import { getDocumentTypeLabel } from '../../utils/format';
import { EASE_EDITORIAL, VIEWPORT_ONCE } from '../../utils/motion';

interface BookCardProps {
  book: Book;
  index?: number;
  inLibrary?: boolean;
  isFavorite?: boolean;
  progress?: ReadingProgress;
  onToggleLibrary?: (bookId: string) => void;
  onToggleFavorite?: (bookId: string) => void;
  onPreview?: (book: Book) => void;
  className?: string;
}

export function BookCard({
  book,
  index = 0,
  inLibrary = false,
  isFavorite = false,
  progress,
  onToggleLibrary,
  onToggleFavorite,
  onPreview,
  className,
}: BookCardProps) {
  const staggerDelay = Math.min(index, 8) * 0.045;

  return (
    <m.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_ONCE}
      whileHover={{ y: -6 }}
      transition={{
        opacity: { duration: 0.34, delay: staggerDelay, ease: EASE_EDITORIAL },
        y: { duration: 0.24, ease: EASE_EDITORIAL },
      }}
      className={cn('group flex flex-col min-w-0 will-change-transform', className)}
    >
      <div className="relative">
        <Link
          to={`/libro/${book.id}`}
          className="block rounded-book focus-visible:ring-2 focus-visible:ring-gold"
        >
          <BookCover
            book={book}
            progressPercent={progress?.progress_percent}
            className="transition-shadow duration-300 group-hover:shadow-cover-hover"
          />
        </Link>

        {/* Subtle grounded shadow beneath physical book */}
        <div
          aria-hidden="true"
          className="pointer-events-none mx-2.5 mt-1 h-2 rounded-full bg-navy/10 blur-md opacity-70 transition-all duration-300 group-hover:opacity-100"
        />

        {/* Discrete hover quick actions */}
        <div className="pointer-events-none absolute inset-x-2 bottom-5 z-30 flex items-center justify-between gap-1.5 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-200 ease-out">
          {onPreview && (
            <m.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => onPreview(book)}
              aria-label={`Vista previa de ${book.title}`}
              className="pointer-events-auto h-8 px-2.5 rounded-lg bg-white/95 backdrop-blur-sm text-navy text-[11px] font-semibold shadow-sm hover:bg-white inline-flex items-center gap-1 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              Vista previa
            </m.button>
          )}
          <div className="pointer-events-auto flex items-center gap-1 ml-auto">
            {onToggleLibrary && (
              <m.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => onToggleLibrary(book.id)}
                aria-label={inLibrary ? 'Quitar de mi biblioteca' : 'Añadir a mi biblioteca'}
                aria-pressed={inLibrary}
                className={cn(
                  'h-8 w-8 rounded-lg backdrop-blur-sm shadow-sm inline-flex items-center justify-center transition-colors',
                  inLibrary
                    ? 'bg-navy text-gold'
                    : 'bg-white/95 text-navy hover:bg-white'
                )}
              >
                <Bookmark className="h-3.5 w-3.5" fill={inLibrary ? 'currentColor' : 'none'} />
              </m.button>
            )}
            {onToggleFavorite && (
              <m.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => onToggleFavorite(book.id)}
                aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                aria-pressed={isFavorite}
                className={cn(
                  'h-8 w-8 rounded-lg backdrop-blur-sm shadow-sm inline-flex items-center justify-center transition-colors',
                  isFavorite
                    ? 'bg-navy text-red-400'
                    : 'bg-white/95 text-navy hover:bg-white'
                )}
              >
                <Heart className="h-3.5 w-3.5" fill={isFavorite ? 'currentColor' : 'none'} />
              </m.button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1 min-w-0">
        <Link
          to={`/libro/${book.id}`}
          className="block text-[14px] font-semibold text-navy leading-snug line-clamp-2 group-hover:text-navy-secondary transition-colors"
        >
          {book.title}
        </Link>
        <p className="text-xs text-ink-muted truncate">{book.author}</p>
        <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[11px] text-ink-subtle pt-0.5">
          {book.year && <span>{book.year}</span>}
          {book.year && <span aria-hidden="true">·</span>}
          <span className="truncate max-w-[120px]">{book.category}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-0.5 font-medium text-navy/80">
            <FileText className="h-3 w-3 text-gold-dark" aria-hidden="true" />
            {(book.file_extension || 'PDF').toUpperCase()}
          </span>
        </div>
        {progress && progress.progress_percent > 0 && (
          <p className="text-[11px] font-medium text-gold-dark pt-0.5">
            {progress.progress_percent >= 100
              ? 'Completado'
              : `Pág. ${progress.current_page}${progress.total_pages ? ` de ${progress.total_pages}` : ''} · ${Math.round(progress.progress_percent)}%`}
          </p>
        )}
      </div>
    </m.article>
  );
}

export function BookListItem({
  book,
  index = 0,
  inLibrary = false,
  isFavorite = false,
  progress,
  onToggleLibrary,
  onToggleFavorite,
  onPreview,
}: BookCardProps) {
  const staggerDelay = Math.min(index, 8) * 0.04;

  return (
    <m.article
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_ONCE}
      transition={{ duration: 0.3, delay: staggerDelay, ease: EASE_EDITORIAL }}
      className="group flex items-start gap-4 sm:gap-5 py-4 border-b border-line last:border-b-0"
    >
      <Link to={`/libro/${book.id}`} className="w-20 sm:w-24 shrink-0">
        <BookCover
          book={book}
          size="sm"
          progressPercent={progress?.progress_percent}
          className="transition-shadow duration-300 group-hover:shadow-cover-hover"
        />
      </Link>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="neutral">{book.category}</Badge>
          <Badge variant="outline">{getDocumentTypeLabel(book.document_type)}</Badge>
          <Badge variant="gold">{(book.file_extension || 'PDF').toUpperCase()}</Badge>
          {book.year && <span className="text-xs text-ink-subtle">{book.year}</span>}
        </div>

        <Link
          to={`/libro/${book.id}`}
          className="block text-base font-semibold text-navy hover:text-navy-secondary leading-snug transition-colors"
        >
          {book.title}
        </Link>
        <p className="text-xs font-medium text-ink-muted">{book.author}</p>
        {book.description && (
          <p className="text-xs sm:text-sm text-ink-muted line-clamp-2 leading-relaxed max-w-2xl">
            {book.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          {(book.file_url || book.drive_file_id) && book.allow_preview !== false && (
            <Link
              to={`/leer/${book.id}`}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#101D35] text-white text-xs font-medium hover:bg-[#1C3152] transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Leer ahora
            </Link>
          )}
          {onPreview && (
            <m.button
              type="button"
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onPreview(book)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-line-strong text-navy text-xs font-medium hover:bg-surface-secondary transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              Vista previa
            </m.button>
          )}
          {onToggleLibrary && (
            <m.button
              type="button"
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onToggleLibrary(book.id)}
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-colors',
                inLibrary
                  ? 'border-navy bg-navy/5 text-navy'
                  : 'border-line text-ink-muted hover:text-navy hover:bg-surface-secondary'
              )}
            >
              <Bookmark className="h-3.5 w-3.5" fill={inLibrary ? 'currentColor' : 'none'} />
              {inLibrary ? 'En biblioteca' : 'Guardar'}
            </m.button>
          )}
          {onToggleFavorite && (
            <m.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => onToggleFavorite(book.id)}
              aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              className={cn(
                'inline-flex items-center justify-center h-8 w-8 rounded-lg border transition-colors',
                isFavorite
                  ? 'border-red-200 bg-red-50 text-red-600'
                  : 'border-line text-ink-muted hover:text-navy hover:bg-surface-secondary'
              )}
            >
              <Heart className="h-3.5 w-3.5" fill={isFavorite ? 'currentColor' : 'none'} />
            </m.button>
          )}
        </div>
      </div>
    </m.article>
  );
}
