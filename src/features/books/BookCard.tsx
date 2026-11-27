import { Link } from 'react-router-dom';
import { m } from 'motion/react';
import { Bookmark, BookOpen, Eye, Heart } from 'lucide-react';
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
  const staggerDelay = Math.min(index, 8) * 0.035;

  return (
    <m.article
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_ONCE}
      transition={{
        opacity: { duration: 0.3, delay: staggerDelay, ease: EASE_EDITORIAL },
        y: { duration: 0.28, delay: staggerDelay, ease: EASE_EDITORIAL },
      }}
      className={cn('group flex flex-col min-w-0', className)}
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

        {/* Grounded soft contact shadow beneath physical book */}
        <div
          aria-hidden="true"
          className="pointer-events-none mx-2.5 mt-1 h-1.5 rounded-full bg-navy/12 blur-[6px] opacity-65 transition-all duration-300 group-hover:opacity-95 group-hover:scale-x-95"
        />

        {/* Top-right discrete save toggle (stays visible if already saved) */}
        {onToggleLibrary && (
          <m.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => onToggleLibrary(book.id)}
            aria-label={inLibrary ? 'Quitar de mi biblioteca' : 'Añadir a mi biblioteca'}
            aria-pressed={inLibrary}
            title={inLibrary ? 'En mi biblioteca' : 'Guardar en biblioteca'}
            className={cn(
              'absolute top-2 right-2 z-30 h-7 w-7 rounded-full backdrop-blur-md shadow-subtle inline-flex items-center justify-center transition-all duration-200',
              inLibrary
                ? 'bg-navy text-gold opacity-100'
                : 'bg-white/90 text-navy hover:bg-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
            )}
          >
            <Bookmark className="h-3.5 w-3.5" fill={inLibrary ? 'currentColor' : 'none'} />
          </m.button>
        )}

        {/* Simplified editorial hover actions (max 2 compact controls) */}
        {(onPreview || onToggleFavorite) && (
          <div className="pointer-events-none absolute inset-x-2 bottom-4 z-30 flex items-center justify-between gap-1 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-200 ease-out">
            {onPreview && (
              <m.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onPreview(book)}
                aria-label={`Vista previa de ${book.title}`}
                className="pointer-events-auto h-7 px-2.5 rounded-full bg-white/95 backdrop-blur-md text-navy text-[11px] font-semibold shadow-subtle hover:bg-white inline-flex items-center gap-1 transition-colors"
              >
                <Eye className="h-3 w-3 text-gold-dark" />
                <span>Previa</span>
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
                  'pointer-events-auto ml-auto h-7 w-7 rounded-full backdrop-blur-md shadow-subtle inline-flex items-center justify-center transition-colors',
                  isFavorite
                    ? 'bg-navy text-red-400'
                    : 'bg-white/95 text-navy hover:bg-white'
                )}
              >
                <Heart className="h-3 w-3" fill={isFavorite ? 'currentColor' : 'none'} />
              </m.button>
            )}
          </div>
        )}
      </div>

      {/* Editorial Metadata (clean 2-line title + quiet author + optional progress) */}
      <div className="mt-2 space-y-0.5 min-w-0 px-0.5">
        <Link
          to={`/libro/${book.id}`}
          className="block text-[13px] font-semibold text-navy leading-[1.3] line-clamp-2 group-hover:text-forest transition-colors"
        >
          {book.title}
        </Link>
        <p className="text-[11.5px] text-ink-muted truncate">{book.author}</p>
        {progress && progress.progress_percent > 0 ? (
          <p className="text-[10.5px] font-medium text-gold-dark pt-0.5 tabular-nums">
            {progress.progress_percent >= 100
              ? 'Completado'
              : `${Math.round(progress.progress_percent)}% · Pág. ${progress.current_page}`}
          </p>
        ) : (
          <p className="text-[10.5px] text-ink-subtle truncate">
            {book.year ? `${book.year} · ` : ''}
            {book.category}
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
  const staggerDelay = Math.min(index, 8) * 0.035;

  return (
    <m.article
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_ONCE}
      transition={{ duration: 0.28, delay: staggerDelay, ease: EASE_EDITORIAL }}
      className="group flex items-start gap-4 sm:gap-5 py-4 border-b border-line last:border-b-0"
    >
      <Link to={`/libro/${book.id}`} className="w-[74px] sm:w-[86px] shrink-0">
        <BookCover
          book={book}
          size="sm"
          progressPercent={progress?.progress_percent}
          className="transition-shadow duration-300 group-hover:shadow-cover-hover"
        />
      </Link>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
            {getDocumentTypeLabel(book.document_type)}
          </span>
          <span className="text-line-strong" aria-hidden="true">·</span>
          <span className="text-[11px] font-medium text-ink-muted">{book.category}</span>
          {book.year && (
            <>
              <span className="text-line-strong" aria-hidden="true">·</span>
              <span className="text-[11px] text-ink-subtle tabular-nums">{book.year}</span>
            </>
          )}
          {book.validity_status === 'vigente' && (
            <Badge variant="forest-soft" className="ml-0.5 text-[10px] py-0">
              Vigente
            </Badge>
          )}
        </div>

        <Link
          to={`/libro/${book.id}`}
          className="block font-editorial text-[17px] font-semibold text-navy hover:text-forest leading-snug transition-colors"
        >
          {book.title}
        </Link>
        <p className="text-xs font-medium text-ink-muted">{book.author}</p>
        {book.description && (
          <p className="text-xs sm:text-[13px] text-ink-muted line-clamp-2 leading-relaxed max-w-2xl">
            {book.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1.5">
          {(book.file_url || book.drive_file_id) && book.allow_preview !== false && (
            <Link
              to={`/leer/${book.id}`}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-navy text-white text-xs font-medium hover:bg-navy-secondary transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5 text-gold" />
              Leer ahora
            </Link>
          )}
          {onPreview && (
            <m.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onPreview(book)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-line-strong bg-white text-navy text-xs font-medium hover:bg-paper-warm transition-colors"
            >
              <Eye className="h-3.5 w-3.5 text-ink-muted" />
              Vista previa
            </m.button>
          )}
          {onToggleLibrary && (
            <m.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => onToggleLibrary(book.id)}
              aria-label={inLibrary ? 'Quitar de mi biblioteca' : 'Guardar en biblioteca'}
              className={cn(
                'inline-flex items-center justify-center h-8 w-8 rounded-full border transition-colors',
                inLibrary
                  ? 'border-navy bg-navy text-gold'
                  : 'border-line bg-white text-ink-muted hover:text-navy hover:bg-paper-warm'
              )}
            >
              <Bookmark className="h-3.5 w-3.5" fill={inLibrary ? 'currentColor' : 'none'} />
            </m.button>
          )}
          {onToggleFavorite && (
            <m.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => onToggleFavorite(book.id)}
              aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              className={cn(
                'inline-flex items-center justify-center h-8 w-8 rounded-full border transition-colors',
                isFavorite
                  ? 'border-red-200 bg-red-50 text-red-600'
                  : 'border-line bg-white text-ink-muted hover:text-navy hover:bg-paper-warm'
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
