import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, m, type PanInfo } from 'motion/react';
import {
  Bookmark,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  Pause,
  Play,
} from 'lucide-react';
import type { Book, ReadingProgress } from '../../types';
import { BookCover } from './BookCover';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { getDocumentTypeLabel } from '../../utils/format';
import { cn } from '../../utils/cn';
import { EASE_EDITORIAL } from '../../utils/motion';

const AUTOPLAY_INTERVAL_MS = 4800;

interface DiscoverBookCarouselProps {
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

export function DiscoverBookCarousel({
  title = 'Libros recomendados',
  subtitle,
  seeAllTo = '/explorar?orden=popular',
  books,
  isInLibrary,
  isFavorite,
  getProgress,
  onToggleLibrary,
  onToggleFavorite,
  onPreview,
}: DiscoverBookCarouselProps) {
  const reducedMotion = useReducedMotion();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(min-width: 640px)');

  const visibleCount = isDesktop ? 4 : isTablet ? 3 : 2;
  const total = books.length;
  const canSlide = total > visibleCount;

  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);

  const safeActiveIndex = total > 0 ? activeIndex % total : 0;

  const stepBy = useCallback(
    (delta: 1 | -1) => {
      if (!canSlide) return;
      setDirection(delta);
      setActiveIndex((prev) => ((prev % total) + delta + total) % total);
    },
    [canSlide, total]
  );

  const jumpTo = useCallback(
    (targetIdx: number) => {
      if (!canSlide || targetIdx === safeActiveIndex) return;
      const forwardDist = (targetIdx - safeActiveIndex + total) % total;
      const backwardDist = (safeActiveIndex - targetIdx + total) % total;
      setDirection(forwardDist <= backwardDist ? 1 : -1);
      setActiveIndex(targetIdx);
    },
    [canSlide, safeActiveIndex, total]
  );

  // Smooth auto-play timer (pauses on hover, manual pause, or reduced motion)
  const isAutoPlaying = canSlide && !paused && !hovered && !reducedMotion;

  useEffect(() => {
    if (!isAutoPlaying) return;
    const id = window.setInterval(() => {
      setDirection(1);
      setActiveIndex((prev) => (prev + 1) % total);
    }, AUTOPLAY_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isAutoPlaying, total]);

  const visibleBooks = useMemo(() => {
    if (total === 0) return [];
    const count = Math.min(visibleCount, total);
    const items: Array<{ book: Book; originalIndex: number }> = [];
    for (let i = 0; i < count; i += 1) {
      const idx = (safeActiveIndex + i) % total;
      items.push({ book: books[idx], originalIndex: idx });
    }
    return items;
  }, [books, safeActiveIndex, total, visibleCount]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!canSlide) return;
    if (info.offset.x < -55 || info.velocity.x < -320) {
      stepBy(1);
    } else if (info.offset.x > 55 || info.velocity.x > 320) {
      stepBy(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!canSlide) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      stepBy(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stepBy(-1);
    }
  };

  if (total === 0) return null;

  const formattedIndex = String(safeActiveIndex + 1).padStart(2, '0');
  const formattedTotal = String(total).padStart(2, '0');

  return (
    <div
      className="mt-3 sm:mt-4 rounded-3xl bg-gradient-to-b from-sand-soft/65 via-sand-soft/25 to-white border border-line/80 px-4 sm:px-6 lg:px-7 py-5 sm:py-6 shadow-subtle outline-none"
      tabIndex={0}
      role="region"
      aria-roledescription="carrusel"
      aria-label={title}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {/* Header Row with Dynamic Counter & Controls */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5 sm:mb-6">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="font-editorial text-xl sm:text-2xl font-semibold text-navy tracking-tight">
              {title}
            </h2>
            {canSlide && (
              <span className="inline-flex items-center rounded-full bg-white border border-line/90 px-2.5 py-0.5 text-[11px] font-semibold text-navy/80 tabular-nums shadow-xs">
                {formattedIndex}
                <span className="mx-1 text-ink-subtle">/</span>
                <span className="text-ink-muted">{formattedTotal}</span>
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-ink-muted">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canSlide && (
            <div className="flex items-center gap-1.5 mr-1">
              {!reducedMotion && (
                <button
                  type="button"
                  onClick={() => setPaused((v) => !v)}
                  aria-label={paused ? 'Reanudar carrusel automático' : 'Pausar carrusel automático'}
                  title={paused ? 'Reanudar' : 'Pausar'}
                  className="h-8 w-8 rounded-full border border-line bg-white text-ink-muted hover:text-navy hover:border-navy/25 hover:bg-sand-soft inline-flex items-center justify-center transition-all shadow-subtle"
                >
                  {paused ? (
                    <Play className="h-3.5 w-3.5 translate-x-[0.5px]" />
                  ) : (
                    <Pause className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => stepBy(-1)}
                aria-label="Libro anterior"
                className="h-8 w-8 rounded-full border border-line bg-white text-navy hover:border-navy/30 hover:bg-sand-soft active:scale-95 inline-flex items-center justify-center transition-all shadow-subtle"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => stepBy(1)}
                aria-label="Siguiente libro"
                className="h-8 w-8 rounded-full border border-line bg-white text-navy hover:border-navy/30 hover:bg-sand-soft active:scale-95 inline-flex items-center justify-center transition-all shadow-subtle"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {seeAllTo && (
            <Link
              to={seeAllTo}
              className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-navy shadow-subtle border border-line hover:border-navy/25 hover:bg-sand-soft transition-all"
            >
              Ver todos
              <ChevronRight className="h-3.5 w-3.5 text-ink-muted" />
            </Link>
          )}
        </div>
      </div>

      {/* Interactive Draggable 3D Carousel Stage */}
      <m.div
        drag={canSlide && !reducedMotion ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.14}
        onDragEnd={handleDragEnd}
        className={cn(
          'relative overflow-hidden py-3 -my-3 px-1.5 -mx-1.5',
          canSlide && !reducedMotion && 'cursor-grab active:cursor-grabbing'
        )}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6 lg:gap-8">
          <AnimatePresence initial={false} mode="popLayout" custom={direction}>
            {visibleBooks.map(({ book }, slotIndex) => {
              const inLib = isInLibrary(book.id);
              const fav = isFavorite(book.id);
              const prog = getProgress(book.id);

              return (
                <m.article
                  key={book.id}
                  layout={!reducedMotion}
                  custom={direction}
                  initial={
                    reducedMotion
                      ? false
                      : {
                          opacity: 0,
                          x: direction > 0 ? 52 : -52,
                          scale: 0.94,
                        }
                  }
                  animate={{
                    opacity: 1,
                    x: 0,
                    scale: 1,
                  }}
                  exit={
                    reducedMotion
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          x: direction > 0 ? -44 : 44,
                          scale: 0.92,
                        }
                  }
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : {
                          layout: { type: 'spring', stiffness: 320, damping: 30 },
                          opacity: { duration: 0.28, ease: EASE_EDITORIAL },
                          x: { type: 'spring', stiffness: 300, damping: 28 },
                          scale: { duration: 0.3, ease: EASE_EDITORIAL },
                        }
                  }
                  className="group flex flex-col min-w-0 will-change-transform select-none"
                >
                  {/* 3D Hardcover Book Container + Grounded Contact Shadow */}
                  <div className="relative">
                    <Link
                      to={`/libro/${book.id}`}
                      draggable={false}
                      className="block rounded-book focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      <BookCover
                        book={book}
                        progressPercent={prog?.progress_percent}
                        className="shadow-editorial-cover group-hover:shadow-cover-hover"
                      />
                    </Link>

                    {/* Soft grounded shadow beneath the physical book */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none mx-3 mt-1 h-2.5 rounded-full bg-navy/12 blur-md opacity-75 transition-all duration-300 group-hover:opacity-100 group-hover:scale-x-95"
                    />

                    {/* Subtle Floating Quick Actions on Hover */}
                    <div className="pointer-events-none absolute inset-x-2.5 bottom-6 flex items-center justify-between gap-1.5 opacity-0 translate-y-1.5 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-200 ease-out z-30">
                      <div className="pointer-events-auto flex items-center gap-1">
                        {(book.file_url || book.drive_file_id) && book.allow_preview !== false && (
                          <Link
                            to={`/leer/${book.id}`}
                            draggable={false}
                            aria-label={`Leer ${book.title}`}
                            className="h-8 px-2.5 rounded-lg bg-navy text-white text-[11px] font-semibold shadow-sm hover:bg-navy-secondary inline-flex items-center gap-1 transition-colors"
                          >
                            <BookOpen className="h-3.5 w-3.5 text-gold" />
                            <span>Leer</span>
                          </Link>
                        )}
                        <m.button
                          type="button"
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onPreview(book)}
                          aria-label={`Vista previa de ${book.title}`}
                          title="Vista previa"
                          className="h-8 w-8 sm:w-auto sm:px-2.5 rounded-lg bg-white/95 backdrop-blur-sm text-navy text-[11px] font-semibold shadow-sm hover:bg-white inline-flex items-center justify-center gap-1 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span className="hidden xl:inline">Previa</span>
                        </m.button>
                      </div>

                      <div className="pointer-events-auto flex items-center gap-1 ml-auto">
                        <m.button
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onToggleLibrary(book.id)}
                          aria-label={inLib ? 'Quitar de mi biblioteca' : 'Añadir a mi biblioteca'}
                          aria-pressed={inLib}
                          className={cn(
                            'h-8 w-8 rounded-lg backdrop-blur-sm shadow-sm inline-flex items-center justify-center transition-colors',
                            inLib
                              ? 'bg-navy text-gold'
                              : 'bg-white/95 text-navy hover:bg-white'
                          )}
                        >
                          <Bookmark className="h-3.5 w-3.5" fill={inLib ? 'currentColor' : 'none'} />
                        </m.button>
                        <m.button
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onToggleFavorite(book.id)}
                          aria-label={fav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                          aria-pressed={fav}
                          className={cn(
                            'h-8 w-8 rounded-lg backdrop-blur-sm shadow-sm inline-flex items-center justify-center transition-colors',
                            fav
                              ? 'bg-navy text-red-400'
                              : 'bg-white/95 text-navy hover:bg-white'
                          )}
                        >
                          <Heart className="h-3.5 w-3.5" fill={fav ? 'currentColor' : 'none'} />
                        </m.button>
                      </div>
                    </div>
                  </div>

                  {/* Book Metadata */}
                  <div className="mt-2.5 space-y-0.5 px-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
                      <span className="truncate">{getDocumentTypeLabel(book.document_type)}</span>
                      {book.year && (
                        <>
                          <span aria-hidden="true" className="text-line-strong">
                            ·
                          </span>
                          <span className="tabular-nums text-ink-subtle font-medium">
                            {book.year}
                          </span>
                        </>
                      )}
                      {slotIndex === 0 && canSlide && (
                        <span className="ml-auto hidden sm:inline-block h-1.5 w-1.5 rounded-full bg-gold" />
                      )}
                    </div>
                    <Link
                      to={`/libro/${book.id}`}
                      draggable={false}
                      className="block text-sm font-semibold text-navy truncate group-hover:text-navy-secondary transition-colors"
                    >
                      {book.title}
                    </Link>
                    <p className="text-xs text-ink-muted truncate">
                      {book.author}
                      {book.category ? ` · ${book.category}` : ''}
                    </p>
                  </div>
                </m.article>
              );
            })}
          </AnimatePresence>
        </div>
      </m.div>

      {/* Bottom Animated Progress Indicator Dots */}
      {canSlide && (
        <div
          className="mt-6 flex items-center justify-center gap-2"
          role="tablist"
          aria-label="Diapositivas de libros recomendados"
        >
          {books.map((b, idx) => {
            const isActive = idx === safeActiveIndex;
            return (
              <button
                key={b.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Ir al libro ${idx + 1}: ${b.title}`}
                onClick={() => jumpTo(idx)}
                className={cn(
                  'relative h-2 rounded-full transition-all duration-300 overflow-hidden',
                  isActive
                    ? 'w-9 bg-navy/12'
                    : 'w-2 bg-line-strong hover:bg-navy/40'
                )}
              >
                {isActive && (
                  <m.span
                    key={`${safeActiveIndex}-${isAutoPlaying ? 'play' : 'pause'}`}
                    initial={{ scaleX: isAutoPlaying ? 0 : 1 }}
                    animate={{ scaleX: 1 }}
                    transition={
                      isAutoPlaying
                        ? { duration: AUTOPLAY_INTERVAL_MS / 1000, ease: 'linear' }
                        : { duration: 0.2 }
                    }
                    className="absolute inset-0 origin-left rounded-full bg-gold"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
