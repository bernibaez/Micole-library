import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, m, type PanInfo } from 'motion/react';
import {
  Bookmark,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
} from 'lucide-react';
import type { Book, ReadingProgress } from '../../types';
import { BookCover } from './BookCover';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { getDocumentTypeLabel } from '../../utils/format';
import { cn } from '../../utils/cn';
import { EASE_EDITORIAL, SCROLL_REVEAL_VARIANTS, VIEWPORT_ONCE } from '../../utils/motion';

interface RecentFocusCarouselProps {
  title?: string;
  subtitle?: string;
  seeAllTo?: string;
  books: Book[];
  isInLibrary: (bookId: string) => boolean;
  isFavorite: (bookId: string) => boolean;
  getProgress: (bookId: string) => ReadingProgress | undefined;
  onToggleLibrary: (bookId: string) => void;
  onToggleFavorite: (bookId: string) => void;
  onPreview: (book: Book) => void;
}

export function RecentFocusCarousel({
  title = 'Consultados recientemente',
  subtitle = 'Tus últimos documentos abiertos para retomar de inmediato.',
  seeAllTo = '/recientes',
  books,
  isInLibrary,
  isFavorite,
  getProgress,
  onToggleLibrary,
  onToggleFavorite,
  onPreview,
}: RecentFocusCarouselProps) {
  const reducedMotion = useReducedMotion();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(min-width: 640px)');

  const total = books.length;
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (total > 0 && activeIndex >= total) {
      setActiveIndex(0);
    }
  }, [activeIndex, total]);

  const stepBy = useCallback(
    (delta: 1 | -1) => {
      if (total <= 1) return;
      setActiveIndex((prev) => (prev + delta + total) % total);
    },
    [total]
  );

  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (total <= 1) return;
    if (info.offset.x < -45 || info.velocity.x < -280) {
      stepBy(1);
    } else if (info.offset.x > 45 || info.velocity.x > 280) {
      stepBy(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (total <= 1) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      stepBy(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stepBy(-1);
    }
  };

  if (total === 0) return null;

  const activeBook = books[activeIndex];
  const activeInLib = isInLibrary(activeBook.id);
  const activeFav = isFavorite(activeBook.id);
  const activeProgress = getProgress(activeBook.id);

  // Horizontal offset of side books relative to center stage
  const sideOffsetX = isDesktop ? 255 : isTablet ? 205 : 132;

  // Build visible slots: [-1, 0, +1] when >= 3 books, [0, +1] when 2 books, [0] when 1 book
  const slots: Array<{ book: Book; index: number; offset: -1 | 0 | 1 }> = [];
  if (total >= 3) {
    const prevIdx = (activeIndex - 1 + total) % total;
    const nextIdx = (activeIndex + 1) % total;
    slots.push({ book: books[prevIdx], index: prevIdx, offset: -1 });
    slots.push({ book: books[activeIndex], index: activeIndex, offset: 0 });
    slots.push({ book: books[nextIdx], index: nextIdx, offset: 1 });
  } else if (total === 2) {
    const otherIdx = (activeIndex + 1) % 2;
    slots.push({ book: books[activeIndex], index: activeIndex, offset: 0 });
    slots.push({ book: books[otherIdx], index: otherIdx, offset: 1 });
  } else {
    slots.push({ book: books[0], index: 0, offset: 0 });
  }

  return (
    <m.section
      variants={SCROLL_REVEAL_VARIANTS}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_ONCE}
      className="space-y-6 outline-none"
      tabIndex={0}
      role="region"
      aria-roledescription="carrusel"
      aria-label={title}
      onKeyDown={handleKeyDown}
    >
      {/* Section Header */}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold text-navy tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs sm:text-sm text-ink-muted mt-0.5">{subtitle}</p>}
        </div>

        {seeAllTo && (
          <Link
            to={seeAllTo}
            className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-navy hover:border-navy/25 hover:bg-sand-soft transition-all shrink-0"
          >
            Ver todos
            <ChevronRight className="h-3.5 w-3.5 text-ink-muted" />
          </Link>
        )}
      </div>

      {/* Center-Focus 3-Book Stage */}
      <div className="relative rounded-3xl border border-line/80 bg-gradient-to-b from-sand-soft/60 via-white to-white px-4 py-8 sm:px-8 sm:py-10 overflow-hidden">
        {/* Soft ambient spotlight behind the center book */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 sm:h-72 sm:w-72 rounded-full bg-gold/10 blur-3xl"
        />

        {/* Prev / Next Navigation Buttons */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => stepBy(-1)}
              aria-label="Documento anterior"
              className="absolute left-3 sm:left-6 top-[40%] -translate-y-1/2 z-30 h-10 w-10 rounded-full border border-line bg-white/95 backdrop-blur-sm text-navy hover:border-navy/30 hover:bg-sand-soft active:scale-95 inline-flex items-center justify-center shadow-subtle transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => stepBy(1)}
              aria-label="Siguiente documento"
              className="absolute right-3 sm:right-6 top-[40%] -translate-y-1/2 z-30 h-10 w-10 rounded-full border border-line bg-white/95 backdrop-blur-sm text-navy hover:border-navy/30 hover:bg-sand-soft active:scale-95 inline-flex items-center justify-center shadow-subtle transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Draggable 3D Coverflow Stage */}
        <m.div
          drag={total > 1 && !reducedMotion ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.14}
          onDragEnd={handleDragEnd}
          className={cn(
            'relative mx-auto flex items-center justify-center h-[280px] sm:h-[340px] lg:h-[372px] select-none',
            total > 1 && !reducedMotion && 'cursor-grab active:cursor-grabbing'
          )}
          style={{ perspective: '1100px' }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {slots.map(({ book, index, offset }) => {
              const isCenter = offset === 0;
              const prog = getProgress(book.id);

              return (
                <m.div
                  key={book.id}
                  layout={false}
                  initial={
                    reducedMotion
                      ? false
                      : {
                          opacity: 0,
                          x: offset * (sideOffsetX + 60),
                          scale: 0.65,
                          rotateY: offset * -16,
                        }
                  }
                  animate={{
                    opacity: isCenter ? 1 : 0.76,
                    x: offset * sideOffsetX,
                    y: isCenter ? -6 : 16,
                    scale: isCenter ? 1 : 0.74,
                    rotateY: reducedMotion ? 0 : offset * -14,
                    zIndex: isCenter ? 20 : 10,
                  }}
                  exit={
                    reducedMotion
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          scale: 0.62,
                          x: offset * (sideOffsetX + 70),
                        }
                  }
                  whileHover={
                    reducedMotion
                      ? undefined
                      : isCenter
                        ? { y: -12, scale: 1.02 }
                        : { opacity: 0.94, scale: 0.79, y: 10 }
                  }
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : {
                          type: 'spring',
                          stiffness: 260,
                          damping: 26,
                          mass: 0.9,
                        }
                  }
                  style={{ transformStyle: 'preserve-3d' }}
                  className={cn(
                    'group absolute w-[172px] sm:w-[206px] lg:w-[228px] will-change-transform',
                    !isCenter && 'cursor-pointer'
                  )}
                  onClick={() => {
                    if (!isCenter) {
                      setActiveIndex(index);
                    }
                  }}
                >
                  {isCenter ? (
                    <Link
                      to={`/libro/${book.id}`}
                      draggable={false}
                      className="block rounded-book focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      <BookCover
                        book={book}
                        size="md"
                        progressPercent={prog?.progress_percent}
                        className="shadow-cover-hover"
                      />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      tabIndex={0}
                      aria-label={`Enfocar ${book.title}`}
                      className="block w-full text-left rounded-book focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      <BookCover
                        book={book}
                        size="md"
                        progressPercent={prog?.progress_percent}
                        className="shadow-cover"
                      />
                    </button>
                  )}

                  {/* Grounded contact shadow scaled by elevation */}
                  <div
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none mx-4 mt-2 rounded-full bg-navy/15 blur-md transition-opacity duration-300',
                      isCenter ? 'h-3.5 opacity-95' : 'h-2.5 opacity-50'
                    )}
                  />
                </m.div>
              );
            })}
          </AnimatePresence>
        </m.div>

        {/* Active Center Book Info & Quick Actions */}
        <div className="relative z-20 mt-2 max-w-xl mx-auto text-center">
          <AnimatePresence mode="wait">
            <m.div
              key={activeBook.id}
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: reducedMotion ? 0 : 0.24, ease: EASE_EDITORIAL }}
              className="space-y-2.5"
            >
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
                <span>{getDocumentTypeLabel(activeBook.document_type)}</span>
                {activeBook.year && (
                  <>
                    <span aria-hidden="true" className="text-line-strong">
                      ·
                    </span>
                    <span className="tabular-nums text-ink-subtle font-medium">
                      {activeBook.year}
                    </span>
                  </>
                )}
                {activeProgress && activeProgress.progress_percent > 0 && (
                  <>
                    <span aria-hidden="true" className="text-line-strong">
                      ·
                    </span>
                    <span className="text-navy font-semibold">
                      {Math.round(activeProgress.progress_percent)}% leído
                    </span>
                  </>
                )}
              </div>

              <Link
                to={`/libro/${activeBook.id}`}
                className="block font-editorial text-xl sm:text-2xl font-semibold text-navy hover:text-navy-secondary leading-snug line-clamp-2 transition-colors"
              >
                {activeBook.title}
              </Link>

              <p className="text-xs sm:text-sm text-ink-muted truncate">
                {activeBook.author}
                {activeBook.category ? ` · ${activeBook.category}` : ''}
              </p>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Link
                  to={
                    (activeBook.file_url || activeBook.drive_file_id) &&
                    activeBook.allow_preview !== false
                      ? `/leer/${activeBook.id}`
                      : `/libro/${activeBook.id}`
                  }
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-navy text-white text-xs font-semibold hover:bg-navy-secondary active:scale-[0.98] transition-all shadow-sm"
                >
                  <BookOpen className="h-3.5 w-3.5 text-gold" />
                  {activeProgress && activeProgress.progress_percent > 0
                    ? 'Continuar lectura'
                    : 'Abrir documento'}
                </Link>

                <button
                  type="button"
                  onClick={() => onPreview(activeBook)}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-line bg-white text-navy text-xs font-semibold hover:border-navy/25 hover:bg-sand-soft transition-colors"
                >
                  <Eye className="h-3.5 w-3.5 text-ink-muted" />
                  Vista previa
                </button>

                <button
                  type="button"
                  onClick={() => onToggleLibrary(activeBook.id)}
                  aria-label={activeInLib ? 'Quitar de mi biblioteca' : 'Guardar en mi biblioteca'}
                  aria-pressed={activeInLib}
                  className={cn(
                    'h-9 w-9 rounded-full border inline-flex items-center justify-center transition-colors',
                    activeInLib
                      ? 'border-navy bg-navy text-gold'
                      : 'border-line bg-white text-ink-muted hover:text-navy hover:border-navy/25 hover:bg-sand-soft'
                  )}
                >
                  <Bookmark className="h-3.5 w-3.5" fill={activeInLib ? 'currentColor' : 'none'} />
                </button>

                <button
                  type="button"
                  onClick={() => onToggleFavorite(activeBook.id)}
                  aria-label={activeFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                  aria-pressed={activeFav}
                  className={cn(
                    'h-9 w-9 rounded-full border inline-flex items-center justify-center transition-colors',
                    activeFav
                      ? 'border-red-200 bg-red-50 text-red-600'
                      : 'border-line bg-white text-ink-muted hover:text-navy hover:border-navy/25 hover:bg-sand-soft'
                  )}
                >
                  <Heart className="h-3.5 w-3.5" fill={activeFav ? 'currentColor' : 'none'} />
                </button>
              </div>
            </m.div>
          </AnimatePresence>
        </div>

        {/* Pagination Dots */}
        {total > 1 && (
          <div
            className="mt-6 flex items-center justify-center gap-2"
            role="tablist"
            aria-label="Documentos consultados recientemente"
          >
            {books.map((b, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={b.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Ver ${b.title}`}
                  onClick={() => setActiveIndex(idx)}
                  className={cn(
                    'h-2 rounded-full transition-all duration-300',
                    isActive
                      ? 'w-7 bg-gold'
                      : 'w-2 bg-line-strong hover:bg-navy/40'
                  )}
                />
              );
            })}
          </div>
        )}
      </div>
    </m.section>
  );
}
