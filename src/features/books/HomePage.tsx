import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { m } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  Scale,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import {
  useBooksQuery,
  useCategoriesQuery,
  usePersonalLibrary,
} from '../library/useLibraryData';
import { DiscoverSearchBar } from '../catalog/DiscoverSearchBar';
import { LexMascot } from '../../components/mascot/LexMascot';
import { DiscoverBookCarousel } from './DiscoverBookCarousel';
import { RecentFocusCarousel } from './RecentFocusCarousel';
import { BookShelf } from './BookShelf';
import { QuickPreviewModal } from './QuickPreviewModal';
import { BookCover } from './BookCover';
import { BookGridSkeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { getGreeting } from '../../utils/format';
import {
  HERO_CONTAINER_VARIANTS,
  HERO_ITEM_VARIANTS,
  SCROLL_REVEAL_VARIANTS,
  VIEWPORT_ONCE,
} from '../../utils/motion';
import type { Book } from '../../types';

export function HomePage() {
  const { isAuthenticated, profile, userId } = useAuth();
  const { data: books = [], isLoading, isError, refetch } = useBooksQuery();
  const { data: categories = [] } = useCategoriesQuery();
  const {
    snapshot,
    isInLibrary,
    isFavorite,
    getProgress,
    handleToggleLibrary,
    handleToggleFavorite,
    handleDownloadBook,
  } = usePersonalLibrary();

  const [previewBook, setPreviewBook] = useState<Book | null>(null);

  const continueReading = useMemo(() => {
    if (!isAuthenticated || snapshot.progress.length === 0) return [];
    const byId = new Map(books.map((b) => [b.id, b]));
    return snapshot.progress
      .filter((p) => p.progress_percent < 100)
      .map((p) => ({ progress: p, book: byId.get(p.book_id) }))
      .filter((item): item is { progress: typeof item.progress; book: Book } => Boolean(item.book))
      .slice(0, 6);
  }, [books, isAuthenticated, snapshot.progress]);

  const featuredBooks = useMemo(() => {
    const flagged = books.filter((b) => b.featured);
    return (flagged.length >= 4 ? flagged : books).slice(0, 8);
  }, [books]);

  const recommendedBooks = useMemo(() => {
    if (!isAuthenticated) {
      return [...books].sort((a, b) => b.downloads - a.downloads).slice(0, 8);
    }
    const favoriteCats = new Set(
      books
        .filter((b) => isFavorite(b.id) || isInLibrary(b.id))
        .map((b) => b.category)
    );
    if (favoriteCats.size === 0) {
      return [...books].slice(0, 8);
    }
    const matching = books.filter((b) => favoriteCats.has(b.category));
    const rest = books.filter((b) => !favoriteCats.has(b.category));
    return [...matching, ...rest].slice(0, 8);
  }, [books, isAuthenticated, isFavorite, isInLibrary]);

  const heroRecommendations = useMemo(() => {
    const source = recommendedBooks.length >= 4 ? recommendedBooks : featuredBooks;
    const seen = new Set<string>();
    const combined: Book[] = [];
    for (const b of [...source, ...featuredBooks, ...books]) {
      if (!seen.has(b.id)) {
        seen.add(b.id);
        combined.push(b);
      }
      if (combined.length >= 10) break;
    }
    return combined;
  }, [books, featuredBooks, recommendedBooks]);

  const recentBooks = useMemo(() => {
    return [...books]
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA;
        return (b.year ?? 0) - (a.year ?? 0);
      })
      .slice(0, 8);
  }, [books]);

  const mostConsulted = useMemo(
    () => [...books].sort((a, b) => b.downloads - a.downloads).slice(0, 8),
    [books]
  );

  const legislationBooks = useMemo(
    () =>
      books.filter(
        (b) =>
          b.document_type === 'ley' ||
          b.document_type === 'codigo' ||
          b.category.toLowerCase().includes('legislación') ||
          b.category.toLowerCase().includes('código')
      ),
    [books]
  );

  const topCategories = useMemo(
    () => categories.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order),
    [categories]
  );

  const categoryShowcases = useMemo(() => {
    return topCategories.slice(0, 8).map((cat) => {
      const catBooks = books.filter(
        (b) =>
          b.category_id === cat.id ||
          b.category.toLowerCase() === cat.name.toLowerCase()
      );
      return {
        category: cat,
        count: catBooks.length,
        coverBook: catBooks[0] ?? null,
      };
    });
  }, [books, topCategories]);

  const recentlyConsulted = useMemo(() => {
    if (snapshot.recents.length === 0) return [];
    const byId = new Map(books.map((b) => [b.id, b]));
    return snapshot.recents
      .map((r) => byId.get(r.document_id))
      .filter((b): b is Book => Boolean(b))
      .slice(0, 8);
  }, [books, snapshot.recents]);

  const heroReadingCard = (() => {
    if (continueReading.length > 0) {
      const { book, progress } = continueReading[0];
      const hasFile =
        Boolean(book.file_url || book.drive_file_id) && book.allow_preview !== false;
      return {
        book,
        to: hasFile ? `/leer/${book.id}` : `/libro/${book.id}`,
        percent: Math.min(100, Math.max(4, Math.round(progress.progress_percent))),
        pageLabel: progress.total_pages
          ? `Pág. ${progress.current_page} de ${progress.total_pages}`
          : `Pág. ${progress.current_page}`,
      };
    }

    if (snapshot.recents.length > 0) {
      for (const recent of snapshot.recents) {
        const book = books.find((b) => b.id === recent.document_id);
        if (!book) continue;
        const hasFile =
          Boolean(book.file_url || book.drive_file_id) && book.allow_preview !== false;
        const computedPct =
          book.pages && book.pages > 0
            ? Math.min(98, Math.max(8, Math.round((recent.last_page / book.pages) * 100)))
            : 18;
        return {
          book,
          to: hasFile ? `/leer/${book.id}` : `/libro/${book.id}`,
          percent: computedPct,
          pageLabel: book.pages
            ? `Pág. ${recent.last_page} de ${book.pages}`
            : `Pág. ${recent.last_page}`,
        };
      }
    }

    const fallbackBook = heroRecommendations[0] ?? books[0] ?? null;
    if (!fallbackBook) return null;
    const hasFile =
      Boolean(fallbackBook.file_url || fallbackBook.drive_file_id) &&
      fallbackBook.allow_preview !== false;
    return {
      book: fallbackBook,
      to: hasFile ? `/leer/${fallbackBook.id}` : `/libro/${fallbackBook.id}`,
      percent: 12,
      pageLabel: fallbackBook.pages ? `Pág. 1 de ${fallbackBook.pages}` : fallbackBook.category,
    };
  })();

  const jurisprudenceBooks = useMemo(
    () =>
      books.filter(
        (b) =>
          b.document_type === 'jurisprudencia' ||
          b.document_type === 'sentencia' ||
          b.category.toLowerCase().includes('jurisprudencia')
      ),
    [books]
  );

  if (isLoading) {
    return (
      <div className="pt-20 px-5 sm:px-8 lg:px-12 max-w-[1320px] mx-auto space-y-8">
        <div className="h-64 rounded-3xl bg-sand animate-pulse" />
        <BookGridSkeleton count={4} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="pt-24 px-5 sm:px-8 lg:px-12 max-w-[1320px] mx-auto">
        <ErrorState onRetry={() => void refetch()} />
      </div>
    );
  }

  const firstName = profile?.first_name?.trim();

  return (
    <div className="w-full">
      {/* Clean Editorial Discover Zone */}
      <section className="relative bg-white">
        {/* Foreground Content */}
        <div className="relative z-10 max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-12 pt-16 sm:pt-[76px]">
          {/* Top Discover Header + Search + Continue-Reading Book + 3D Legal Avatar */}
          <div className="flex flex-col lg:flex-row lg:items-end gap-5 lg:gap-5 xl:gap-7">
            <m.div
              variants={HERO_CONTAINER_VARIANTS}
              initial="hidden"
              animate="visible"
              className="w-full lg:flex-1 max-w-[560px] min-w-0 space-y-3 pb-1 lg:pb-6"
            >
              <m.div
                variants={HERO_ITEM_VARIANTS}
                className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark"
              >
                <Scale className="h-3.5 w-3.5" />
                {isAuthenticated && firstName
                  ? `${getGreeting()}, ${firstName} · Biblioteca Jurídica Virtual`
                  : 'Biblioteca Jurídica Virtual · República Dominicana'}
              </m.div>

              <m.h1
                variants={HERO_ITEM_VARIANTS}
                className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-navy tracking-tight leading-[1.1]"
              >
                Descubrir
              </m.h1>

              <m.p
                variants={HERO_ITEM_VARIANTS}
                className="text-sm sm:text-[15px] text-ink-muted max-w-xl leading-relaxed"
              >
                Legislación, jurisprudencia, doctrina y formación jurídica en MICOLE LIBRARY.
              </m.p>

              <m.div variants={HERO_ITEM_VARIANTS} className="pt-1.5">
                <DiscoverSearchBar categories={topCategories} />
              </m.div>
            </m.div>

            {/* Right Visual Group: Lowered "Seguir leyendo" Book + Avatar closely paired beside it */}
            <div className="flex items-end justify-center lg:flex-1 lg:justify-start gap-4 sm:gap-6 lg:gap-3 xl:gap-5 lg:pl-2 xl:pl-4 pb-1">
              {heroReadingCard && (
                <m.div
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="shrink-0 -mb-2 lg:-mb-3"
                >
                  <Link
                    to={heroReadingCard.to}
                    className="group flex flex-col items-center w-[98px] sm:w-[108px] lg:w-[112px] xl:w-[122px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-2xl"
                    title={`Seguir leyendo: ${heroReadingCard.book.title}`}
                  >
                    {/* Editorial "Seguir leyendo" pill above the book */}
                    <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-sand-soft border border-gold/45 px-2.5 py-0.5 text-[10.5px] font-semibold text-navy shadow-subtle group-hover:bg-navy group-hover:text-white group-hover:border-navy transition-colors whitespace-nowrap">
                      <BookOpen className="h-3 w-3 text-gold-dark group-hover:text-gold shrink-0 transition-colors" />
                      <span>Seguir leyendo</span>
                    </span>

                    {/* 3D Hardcover Book */}
                    <div className="w-full transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
                      <BookCover
                        book={heroReadingCard.book}
                        size="sm"
                        progressPercent={heroReadingCard.percent}
                        className="transition-shadow duration-300 group-hover:shadow-cover-hover"
                      />
                    </div>

                    {/* Soft grounded shadow beneath the physical book */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none mx-3 mt-1 h-1.5 w-[80%] rounded-full bg-navy/12 blur-md opacity-80 group-hover:opacity-100 transition-opacity"
                    />

                    {/* Reading Progress Bar + Page/Percent */}
                    <div className="mt-1.5 w-full px-0.5 space-y-1">
                      <div className="h-1.5 w-full rounded-full bg-surface-tertiary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gold transition-[width] duration-300"
                          style={{ width: `${heroReadingCard.percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="text-ink-muted truncate tabular-nums">
                          {heroReadingCard.pageLabel}
                        </span>
                        <span className="font-bold text-navy tabular-nums shrink-0 inline-flex items-center gap-0.5">
                          {heroReadingCard.percent}%
                          <ArrowRight className="h-2.5 w-2.5 text-gold-dark group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </m.div>
              )}

              {/* Animated LexLibrary Mascot anchored on the right */}
              <div className="flex items-end justify-end shrink-0 relative">
                <LexMascot
                  isAuthenticated={isAuthenticated}
                  sessionKey={userId}
                  userName={firstName}
                  sizeClassName="h-[220px] sm:h-[246px] lg:h-[264px] xl:h-[298px]"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Animated Discover Book Carousel (exclusive to Discover page) */}
          <DiscoverBookCarousel
            title="Libros recomendados"
            subtitle="Obras jurídicas destacadas listas para lectura inmediata en línea."
            seeAllTo="/explorar?orden=popular"
            books={heroRecommendations}
            isInLibrary={isInLibrary}
            isFavorite={isFavorite}
            getProgress={getProgress}
            onToggleLibrary={handleToggleLibrary}
            onToggleFavorite={handleToggleFavorite}
            onPreview={setPreviewBook}
          />
        </div>
      </section>

      {/* Pure White Editorial Lower Canvas */}
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-12 mt-11 sm:mt-14 space-y-12 sm:space-y-14">
        {/* Book Category Pedestal Cards (Inspired by reference Book Category row) */}
        {categoryShowcases.length > 0 && (
          <m.section
            variants={SCROLL_REVEAL_VARIANTS}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_ONCE}
            className="space-y-5"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-navy tracking-tight">
                  Categorías jurídicas
                </h2>
                <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
                  Explora la colección según tu materia de estudio o investigación.
                </p>
              </div>
              <Link
                to="/categorias"
                aria-label="Ver todas las categorías"
                title="Ver todas las categorías"
                className="h-9 w-9 rounded-xl border border-line bg-white text-navy hover:bg-sand-soft hover:border-navy/25 inline-flex items-center justify-center transition-colors shadow-subtle shrink-0"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-9 pt-5">
              {categoryShowcases.map(({ category, count, coverBook }) => (
                <Link
                  key={category.id}
                  to={`/explorar?categoria=${encodeURIComponent(category.name)}`}
                  className="group block text-center"
                >
                  {/* Soft Pedestal Tray with Floating Book Cover */}
                  <div className="relative h-24 sm:h-28 rounded-2xl bg-[#F4F5F7] group-hover:bg-sand-soft border border-transparent group-hover:border-sand-deep/50 transition-colors duration-200 flex items-end justify-center pb-3">
                    <div className="w-[68px] sm:w-[78px] -mt-7 transition-transform duration-200 ease-out group-hover:-translate-y-1.5">
                      {coverBook ? (
                        <BookCover
                          book={coverBook}
                          size="sm"
                          className="rounded-[6px] shadow-cover group-hover:shadow-cover-hover"
                        />
                      ) : (
                        <div className="aspect-[2/3] w-full rounded-[6px] bg-gradient-to-br from-navy to-navy-secondary shadow-cover flex flex-col items-center justify-center p-2 text-gold">
                          <Scale className="h-5 w-5" strokeWidth={1.6} />
                          <span className="mt-1.5 text-[7.5px] font-semibold uppercase tracking-widest text-white/80 line-clamp-1">
                            MICOLE
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Centered Category Label */}
                  <p className="mt-3 text-xs sm:text-sm font-semibold text-navy group-hover:text-gold-dark transition-colors line-clamp-1 px-1">
                    {category.name}
                  </p>
                  <p className="text-[11px] text-ink-subtle mt-0.5 tabular-nums">
                    {count === 1 ? '1 recurso' : `${count} recursos`}
                  </p>
                </Link>
              ))}
            </div>
          </m.section>
        )}

        {/* Continue Reading */}
        {continueReading.length > 0 && (
          <m.section
            variants={SCROLL_REVEAL_VARIANTS}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_ONCE}
            className="space-y-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-navy tracking-tight">
                  Continuar leyendo
                </h2>
                <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
                  Retoma exactamente en la página donde dejaste tu estudio.
                </p>
              </div>
              <Link
                to="/mi-biblioteca"
                className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-navy hover:border-navy/25 hover:bg-sand-soft transition-all"
              >
                Ver todos <ArrowRight className="h-3.5 w-3.5 text-ink-muted" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {continueReading.slice(0, 3).map(({ book, progress }) => (
                <Link
                  key={book.id}
                  to={`/leer/${book.id}`}
                  className="group flex items-center gap-4 p-3.5 rounded-2xl border border-line bg-white hover:border-sand-deep hover:bg-sand-soft/50 transition-all"
                >
                  <div className="w-16 shrink-0">
                    <BookCover book={book} size="sm" progressPercent={progress.progress_percent} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-sm font-semibold text-navy line-clamp-2 group-hover:text-navy-secondary">
                      {book.title}
                    </p>
                    <p className="text-xs text-ink-muted truncate">{book.author}</p>
                    <div className="space-y-1 pt-0.5">
                      <div className="flex items-center justify-between text-[11px] text-ink-muted">
                        <span>
                          Página {progress.current_page}
                          {progress.total_pages ? ` de ${progress.total_pages}` : ''}
                        </span>
                        <span className="font-semibold text-navy">
                          {Math.round(progress.progress_percent)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-surface-tertiary overflow-hidden">
                        <div
                          className="h-full bg-gold rounded-full"
                          style={{ width: `${Math.min(100, Math.max(4, progress.progress_percent))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <BookOpen className="h-4 w-4 text-ink-subtle group-hover:text-navy shrink-0" />
                </Link>
              ))}
            </div>
          </m.section>
        )}

        {/* Recently Consulted — 3-book center-focus carousel */}
        {recentlyConsulted.length > 0 && (
          <RecentFocusCarousel
            title="Consultados recientemente"
            subtitle="Tus últimos documentos abiertos para retomar de inmediato."
            seeAllTo="/recientes"
            books={recentlyConsulted}
            isInLibrary={isInLibrary}
            isFavorite={isFavorite}
            getProgress={getProgress}
            onToggleLibrary={handleToggleLibrary}
            onToggleFavorite={handleToggleFavorite}
            onPreview={setPreviewBook}
          />
        )}

        {/* Recently Added */}
        <BookShelf
          title="Recursos recientemente agregados"
          seeAllTo="/explorar?orden=recent"
          books={recentBooks}
          isInLibrary={isInLibrary}
          isFavorite={isFavorite}
          getProgress={getProgress}
          onToggleLibrary={handleToggleLibrary}
          onToggleFavorite={handleToggleFavorite}
          onPreview={setPreviewBook}
        />

        {/* Most Consulted */}
        <BookShelf
          title="Libros más consultados"
          seeAllTo="/explorar?orden=popular"
          books={mostConsulted}
          isInLibrary={isInLibrary}
          isFavorite={isFavorite}
          getProgress={getProgress}
          onToggleLibrary={handleToggleLibrary}
          onToggleFavorite={handleToggleFavorite}
          onPreview={setPreviewBook}
        />

        {/* Dominican Legislation */}
        {legislationBooks.length > 0 && (
          <BookShelf
            title="Legislación dominicana"
            subtitle="Códigos, leyes orgánicas y normativa procesal vigente."
            seeAllTo="/explorar?categoria=Legislaci%C3%B3n%20Dominicana"
            books={legislationBooks}
            isInLibrary={isInLibrary}
            isFavorite={isFavorite}
            getProgress={getProgress}
            onToggleLibrary={handleToggleLibrary}
            onToggleFavorite={handleToggleFavorite}
            onPreview={setPreviewBook}
          />
        )}

        {/* Featured Jurisprudence */}
        {jurisprudenceBooks.length > 0 && (
          <BookShelf
            title="Jurisprudencia destacada"
            subtitle="Criterios relevantes en materia procesal penal y constitucional."
            seeAllTo="/explorar?categoria=Jurisprudencia"
            books={jurisprudenceBooks}
            isInLibrary={isInLibrary}
            isFavorite={isFavorite}
            getProgress={getProgress}
            onToggleLibrary={handleToggleLibrary}
            onToggleFavorite={handleToggleFavorite}
            onPreview={setPreviewBook}
          />
        )}
      </div>

      <QuickPreviewModal
        book={previewBook}
        onClose={() => setPreviewBook(null)}
        inLibrary={previewBook ? isInLibrary(previewBook.id) : false}
        isFavorite={previewBook ? isFavorite(previewBook.id) : false}
        onToggleLibrary={handleToggleLibrary}
        onToggleFavorite={handleToggleFavorite}
        onDownload={(b) => handleDownloadBook(b)}
      />
    </div>
  );
}
