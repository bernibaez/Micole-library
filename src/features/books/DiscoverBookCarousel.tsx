import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, m, type PanInfo } from 'motion/react';
import {
  Bookmark,
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

const AUTOPLAY_INTERVAL_MS = 5400;

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
  title = 'Recomendados para ti',
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
  const isWide = useMediaQuery('(min-width: 1280px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(min-width: 640px)');

  // 5–6 compact cards on desktop (~22–25% smaller than previous 4-column grid)
  const visibleCount = isWide ? 6 : isDesktop ? 5 : isTablet ? 4 : 2;
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
    if (info.offset.x < -50 || info.velocity.x < -300) {
      stepBy(1);
    } else if (info.offset.x > 50 || info.velocity.x > 300) {
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

  return (
    <section
      className="space-y-3.5 outline-none"
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
      {/* Editorial Shelf Header (seamless on #F7F6F2, no heavy box) */}
      <div className="flex items-end justify-between gap-3 border-b border-line/70 pb-2.5">
        <div className="min-w-0">
          <h2 className="font-editorial text-lg sm:text-[21px] font-semibold text-navy tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-ink-muted mt-0.5 line-clamp-1">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canSlide && (
            <div className="flex items-center gap-1">
              {!reducedMotion && (
                <button
                  type="button"
                  onClick={() => setPaused((v) => !v)}
                  aria-label={paused ? 'Reanudar rotación' : 'Pausar rotación'}
                  title={paused ? 'Reanudar' : 'Pausar'}
                  className="h-7 w-7 rounded-full border border-line bg-white/85 text-ink-muted hover:text-navy hover:border-line-strong inline-flex items-center justify-center transition-colors"
                >
                  {paused ? (
                    <Play className="h-3 w-3 translate-x-[0.5px]" />
                  ) : (
                    <Pause className="h-3 w-3" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => stepBy(-1)}
                aria-label="Libro anterior"
                className="h-7 w-7 rounded-full border border-line bg-white/85 text-navy hover:border-line-strong hover:bg-white active:scale-95 inline-flex items-center justify-center transition-all"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => stepBy(1)}
                aria-label="Siguiente libro"
                className="h-7 w-7 rounded-full border border-line bg-white/85 text-navy hover:border-line-strong hover:bg-white active:scale-95 inline-flex items-center justify-center transition-all"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

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

      {/* Interactive Draggable 5–6 Column Editorial Stage */}
      <m.div
        drag={canSlide && !reducedMotion ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        onDragEnd={handleDragEnd}
        className={cn(
          'relative overflow-hidden py-2 -my-1 px-1 -mx-1',
          canSlide && !reducedMotion && 'cursor-grab active:cursor-grabbing'
        )}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
          <AnimatePresence initial={false} mode="popLayout" custom={direction}>
            {visibleBooks.map(({ book }) => {
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
                      : { opacity: 0, x: direction > 0 ? 40 : -40, scale: 0.96 }
                  }
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={
                    reducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: direction > 0 ? -36 : 36, scale: 0.95 }
                  }
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : {
                          layout: { type: 'spring', stiffness: 320, damping: 32 },
                          opacity: { duration: 0.24, ease: EASE_EDITORIAL },
                          x: { type: 'spring', stiffness: 300, damping: 28 },
                        }
                  }
                  className="group flex flex-col min-w-0 will-change-transform select-none"
                >
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

                    <div
                      aria-hidden="true"
                      className="pointer-events-none mx-2.5 mt-1 h-1.5 rounded-full bg-navy/12 blur-[6px] opacity-65 transition-all duration-300 group-hover:opacity-95 group-hover:scale-x-95"
                    />

                    {/* Top-right discrete save button */}
                    <m.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onToggleLibrary(book.id)}
                      aria-label={inLib ? 'Quitar de mi biblioteca' : 'Añadir a mi biblioteca'}
                      aria-pressed={inLib}
                      className={cn(
                        'absolute top-2 right-2 z-30 h-7 w-7 rounded-full backdrop-blur-md shadow-subtle inline-flex items-center justify-center transition-all duration-200',
                        inLib
                          ? 'bg-navy text-gold opacity-100'
                          : 'bg-white/90 text-navy hover:bg-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                      )}
                    >
                      <Bookmark className="h-3.5 w-3.5" fill={inLib ? 'currentColor' : 'none'} />
                    </m.button>

                    {/* Clean bottom hover controls (max 2) */}
                    <div className="pointer-events-none absolute inset-x-2 bottom-4 flex items-center justify-between gap-1 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-200 ease-out z-30">
                      <m.button
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onPreview(book)}
                        aria-label={`Vista previa de ${book.title}`}
                        className="pointer-events-auto h-7 px-2.5 rounded-full bg-white/95 backdrop-blur-md text-navy text-[11px] font-semibold shadow-subtle hover:bg-white inline-flex items-center gap-1 transition-colors"
                      >
                        <Eye className="h-3 w-3 text-gold-dark" />
                        <span>Previa</span>
                      </m.button>
                      <m.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onToggleFavorite(book.id)}
                        aria-label={fav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                        aria-pressed={fav}
                        className={cn(
                          'pointer-events-auto h-7 w-7 rounded-full backdrop-blur-md shadow-subtle inline-flex items-center justify-center transition-colors',
                          fav ? 'bg-navy text-red-400' : 'bg-white/95 text-navy hover:bg-white'
                        )}
                      >
                        <Heart className="h-3 w-3" fill={fav ? 'currentColor' : 'none'} />
                      </m.button>
                    </div>
                  </div>

                  {/* Minimal Editorial Metadata */}
                  <div className="mt-2 space-y-0.5 px-0.5 min-w-0">
                    <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-gold-dark truncate">
                      {getDocumentTypeLabel(book.document_type)}
                      {book.year ? ` · ${book.year}` : ''}
                    </p>
                    <Link
                      to={`/libro/${book.id}`}
                      draggable={false}
                      className="block text-[13px] font-semibold text-navy leading-[1.3] line-clamp-2 group-hover:text-forest transition-colors"
                    >
                      {book.title}
                    </Link>
                    <p className="text-[11.5px] text-ink-muted truncate">{book.author}</p>
                  </div>
                </m.article>
              );
            })}
          </AnimatePresence>
        </div>
      </m.div>

      {/* Subtle Progress Indicator Dots */}
      {canSlide && (
        <div
          className="pt-1 flex items-center justify-center gap-1.5"
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
                  'relative h-1.5 rounded-full transition-all duration-300 overflow-hidden',
                  isActive ? 'w-7 bg-navy/15' : 'w-1.5 bg-line-strong hover:bg-navy/40'
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
    </section>
  );
}
