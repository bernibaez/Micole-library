import { useCallback, useState } from 'react';
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
  subtitle = 'Tus últimos documentos abiertos en vitrina rápida.',
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
  const safeActiveIndex = total > 0 ? activeIndex % total : 0;

  const stepBy = useCallback(
    (delta: 1 | -1) => {
      if (total <= 1) return;
      setActiveIndex((prev) => ((prev % total) + delta + total) % total);
    },
    [total]
  );

  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (total <= 1) return;
    if (info.offset.x < -42 || info.velocity.x < -260) {
      stepBy(1);
    } else if (info.offset.x > 42 || info.velocity.x > 260) {
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

  const activeBook = books[safeActiveIndex];
  const activeInLib = isInLibrary(activeBook.id);
  const activeFav = isFavorite(activeBook.id);
  const activeProgress = getProgress(activeBook.id);

  // Compact & responsive horizontal spread (prevents clipping on 360px phones)
  const sideOffsetX = isDesktop ? 186 : isTablet ? 152 : 98;

  const slots: Array<{ book: Book; index: number; offset: -1 | 0 | 1 }> = [];
  if (total >= 3) {
    const prevIdx = (safeActiveIndex - 1 + total) % total;
    const nextIdx = (safeActiveIndex + 1) % total;
    slots.push({ book: books[prevIdx], index: prevIdx, offset: -1 });
    slots.push({ book: books[safeActiveIndex], index: safeActiveIndex, offset: 0 });
    slots.push({ book: books[nextIdx], index: nextIdx, offset: 1 });
  } else if (total === 2) {
    const otherIdx = (safeActiveIndex + 1) % 2;
    slots.push({ book: books[safeActiveIndex], index: safeActiveIndex, offset: 0 });
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
      className="space-y-3.5 outline-none"
      tabIndex={0}
      role="region"
      aria-roledescription="carrusel"
      aria-label={title}
      onKeyDown={handleKeyDown}
    >
      {/* Editorial Section Header */}
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
          {total > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => stepBy(-1)}
                aria-label="Documento anterior"
                className="h-7 w-7 rounded-full border border-line bg-white/85 text-navy hover:border-line-strong hover:bg-white active:scale-95 inline-flex items-center justify-center transition-all"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => stepBy(1)}
                aria-label="Siguiente documento"
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

      {/* Subdued, Compact 3D Focus Stage (secondary visual weight) */}
      <div className="relative rounded-2xl border border-line/80 bg-white/75 px-4 py-5 sm:px-7 sm:py-6 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] gap-5 lg:gap-8 items-center">
          {/* Draggable 3D Coverflow Stage */}
          <m.div
            drag={total > 1 && !reducedMotion ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.14}
            onDragEnd={handleDragEnd}
            className={cn(
              'relative mx-auto w-full flex items-center justify-center h-[212px] sm:h-[238px] lg:h-[252px] select-none',
              total > 1 && !reducedMotion && 'cursor-grab active:cursor-grabbing'
            )}
            style={{ perspective: '1000px' }}
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
                            x: offset * (sideOffsetX + 44),
                            scale: 0.68,
                            rotateY: offset * -14,
                          }
                    }
                    animate={{
                      opacity: isCenter ? 1 : 0.66,
                      x: offset * sideOffsetX,
                      y: isCenter ? -4 : 12,
                      scale: isCenter ? 1 : 0.76,
                      rotateY: reducedMotion ? 0 : offset * -13,
                      zIndex: isCenter ? 20 : 10,
                    }}
                    exit={
                      reducedMotion
                        ? { opacity: 0 }
                        : {
                            opacity: 0,
                            scale: 0.65,
                            x: offset * (sideOffsetX + 52),
                          }
                    }
                    whileHover={
                      reducedMotion
                        ? undefined
                        : isCenter
                          ? { y: -8, scale: 1.02 }
                          : { opacity: 0.9, scale: 0.8, y: 8 }
                    }
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 270, damping: 28, mass: 0.9 }
                    }
                    style={{ transformStyle: 'preserve-3d' }}
                    className={cn(
                      'group absolute w-[124px] sm:w-[144px] lg:w-[154px] will-change-transform',
                      !isCenter && 'cursor-pointer'
                    )}
                    onClick={() => {
                      if (!isCenter) setActiveIndex(index);
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
                          className="shadow-editorial-cover"
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
                          size="sm"
                          progressPercent={prog?.progress_percent}
                          className="shadow-cover"
                        />
                      </button>
                    )}

                    <div
                      aria-hidden="true"
                      className={cn(
                        'pointer-events-none mx-3 mt-1.5 rounded-full bg-navy/14 blur-md transition-opacity duration-300',
                        isCenter ? 'h-2.5 opacity-90' : 'h-2 opacity-45'
                      )}
                    />
                  </m.div>
                );
              })}
            </AnimatePresence>
          </m.div>

          {/* Compact Active Book Details & Controls */}
          <div className="relative z-20 text-center lg:text-left">
            <AnimatePresence mode="wait">
              <m.div
                key={activeBook.id}
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -5 }}
                transition={{ duration: reducedMotion ? 0 : 0.22, ease: EASE_EDITORIAL }}
                className="space-y-2"
              >
                <div className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
                  <span>{getDocumentTypeLabel(activeBook.document_type)}</span>
                  {activeBook.year && (
                    <>
                      <span aria-hidden="true" className="text-line-strong">·</span>
                      <span className="tabular-nums text-ink-subtle font-medium">
                        {activeBook.year}
                      </span>
                    </>
                  )}
                  {activeProgress && activeProgress.progress_percent > 0 && (
                    <>
                      <span aria-hidden="true" className="text-line-strong">·</span>
                      <span className="text-forest font-semibold">
                        {Math.round(activeProgress.progress_percent)}% leído
                      </span>
                    </>
                  )}
                </div>

                <Link
                  to={`/libro/${activeBook.id}`}
                  className="block font-editorial text-lg sm:text-xl font-semibold text-navy hover:text-forest leading-snug line-clamp-2 transition-colors"
                >
                  {activeBook.title}
                </Link>

                <p className="text-xs text-ink-muted truncate">
                  {activeBook.author}
                  {activeBook.category ? ` · ${activeBook.category}` : ''}
                </p>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-2">
                  <Link
                    to={
                      (activeBook.file_url || activeBook.drive_file_id) &&
                      activeBook.allow_preview !== false
                        ? `/leer/${activeBook.id}`
                        : `/libro/${activeBook.id}`
                    }
                    className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-navy text-white text-xs font-medium hover:bg-navy-secondary active:scale-[0.98] transition-all shadow-subtle"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-gold" />
                    {activeProgress && activeProgress.progress_percent > 0
                      ? 'Continuar'
                      : 'Abrir'}
                  </Link>

                  <button
                    type="button"
                    onClick={() => onPreview(activeBook)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-line bg-white text-navy text-xs font-medium hover:border-navy/25 hover:bg-paper-warm transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5 text-ink-muted" />
                    Previa
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleLibrary(activeBook.id)}
                    aria-label={activeInLib ? 'Quitar de mi biblioteca' : 'Guardar en mi biblioteca'}
                    aria-pressed={activeInLib}
                    className={cn(
                      'h-8 w-8 rounded-full border inline-flex items-center justify-center transition-colors',
                      activeInLib
                        ? 'border-navy bg-navy text-gold'
                        : 'border-line bg-white text-ink-muted hover:text-navy hover:bg-paper-warm'
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
                      'h-8 w-8 rounded-full border inline-flex items-center justify-center transition-colors',
                      activeFav
                        ? 'border-red-200 bg-red-50 text-red-600'
                        : 'border-line bg-white text-ink-muted hover:text-navy hover:bg-paper-warm'
                    )}
                  >
                    <Heart className="h-3.5 w-3.5" fill={activeFav ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {/* Compact pagination dots */}
                {total > 1 && (
                  <div
                    className="pt-3 flex items-center justify-center lg:justify-start gap-1.5"
                    role="tablist"
                    aria-label="Documentos consultados recientemente"
                  >
                    {books.map((b, idx) => {
                      const isActive = idx === safeActiveIndex;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          aria-label={`Ver ${b.title}`}
                          onClick={() => setActiveIndex(idx)}
                          className={cn(
                            'h-1.5 rounded-full transition-all duration-300',
                            isActive ? 'w-6 bg-gold' : 'w-1.5 bg-line-strong hover:bg-navy/40'
                          )}
                        />
                      );
                    })}
                  </div>
                )}
              </m.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </m.section>
  );
}
