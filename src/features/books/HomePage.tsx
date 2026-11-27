import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { m } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Scale,
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
import { Badge } from '../../components/ui/Badge';
import { HomeDashboardSkeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { getDocumentTypeLabel, getGreeting } from '../../utils/format';
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
    return (flagged.length >= 4 ? flagged : books).slice(0, 10);
  }, [books]);

  const recommendedBooks = useMemo(() => {
    if (!isAuthenticated) {
      return [...books].sort((a, b) => b.downloads - a.downloads).slice(0, 10);
    }
    const favoriteCats = new Set(
      books
        .filter((b) => isFavorite(b.id) || isInLibrary(b.id))
        .map((b) => b.category)
    );
    if (favoriteCats.size === 0) {
      return [...books].slice(0, 10);
    }
    const matching = books.filter((b) => favoriteCats.has(b.category));
    const rest = books.filter((b) => !favoriteCats.has(b.category));
    return [...matching, ...rest].slice(0, 10);
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
      if (combined.length >= 12) break;
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
      .slice(0, 10);
  }, [books]);

  const mostConsulted = useMemo(
    () => [...books].sort((a, b) => b.downloads - a.downloads).slice(0, 10),
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
        mode: 'active' as const,
        book,
        to: hasFile ? `/leer/${book.id}` : `/libro/${book.id}`,
        percent: Math.min(100, Math.max(4, Math.round(progress.progress_percent))),
        pageLabel: progress.total_pages
          ? `Página ${progress.current_page} de ${progress.total_pages}`
          : `Página ${progress.current_page}`,
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
            : 16;
        return {
          mode: 'recent' as const,
          book,
          to: hasFile ? `/leer/${book.id}` : `/libro/${book.id}`,
          percent: computedPct,
          pageLabel: book.pages
            ? `Página ${recent.last_page} de ${book.pages}`
            : `Página ${recent.last_page}`,
        };
      }
    }

    const fallbackBook = heroRecommendations[0] ?? books[0] ?? null;
    if (!fallbackBook) return null;
    const hasFile =
      Boolean(fallbackBook.file_url || fallbackBook.drive_file_id) &&
      fallbackBook.allow_preview !== false;
    return {
      mode: 'suggested' as const,
      book: fallbackBook,
      to: hasFile ? `/leer/${fallbackBook.id}` : `/libro/${fallbackBook.id}`,
      percent: 0,
      pageLabel: fallbackBook.pages
        ? `${fallbackBook.pages} páginas · Lectura inmediata`
        : fallbackBook.category,
    };
  })();

  const secondaryReadingItems = continueReading.slice(1, 3);

  if (isLoading) {
    return (
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 pt-5 sm:pt-7">
        <HomeDashboardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 pt-10">
        <ErrorState onRetry={() => void refetch()} />
      </div>
    );
  }

  const firstName = profile?.first_name?.trim();

  return (
    <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 space-y-9 sm:space-y-11">
      {/* Editorial Top Header + Unified Search */}
      <m.section
        variants={HERO_CONTAINER_VARIANTS}
        initial="hidden"
        animate="visible"
        className="space-y-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <m.div variants={HERO_ITEM_VARIANTS} className="space-y-1 min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold-dark">
              <Scale className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {isAuthenticated && firstName
                  ? `${getGreeting()}, ${firstName} · Biblioteca Jurídica`
                  : 'Biblioteca Jurídica Digital · República Dominicana'}
              </span>
            </p>
            <h1 className="font-editorial text-3xl sm:text-[36px] font-semibold text-navy tracking-tight leading-[1.12]">
              {continueReading.length > 0 ? 'Leyendo ahora' : 'Descubrir'}
            </h1>
          </m.div>

          <m.div variants={HERO_ITEM_VARIANTS} className="w-full lg:max-w-[520px]">
            <DiscoverSearchBar categories={topCategories} className="max-w-none" />
          </m.div>
        </div>

        {/* Unified Editorial "Lectura actual" Hero Card + Micole Mascot */}
        {heroReadingCard && (
          <m.div
            variants={HERO_ITEM_VARIANTS}
            className="relative rounded-3xl bg-white border border-line/90 shadow-subtle overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] items-center gap-5 px-5 sm:px-7 lg:px-9 py-5 sm:py-6">
              {/* Left + Center: 3D Book + Editorial Reading Context */}
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5 sm:gap-7 min-w-0">
                <Link
                  to={heroReadingCard.to}
                  className="group relative w-[106px] sm:w-[118px] lg:w-[126px] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-book"
                  title={heroReadingCard.book.title}
                >
                  <BookCover
                    book={heroReadingCard.book}
                    size="md"
                    progressPercent={heroReadingCard.percent > 0 ? heroReadingCard.percent : undefined}
                    className="shadow-editorial-cover group-hover:shadow-cover-hover"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none mx-3 mt-1.5 h-2 rounded-full bg-navy/14 blur-md opacity-80"
                  />
                </Link>

                <div className="min-w-0 flex-1 text-center sm:text-left space-y-2.5">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold-dark">
                      {heroReadingCard.mode === 'active'
                        ? 'Lectura actual'
                        : heroReadingCard.mode === 'recent'
                          ? 'Última consulta'
                          : 'Lectura destacada'}
                    </span>
                    {heroReadingCard.book.validity_status === 'vigente' && (
                      <Badge variant="forest" className="text-[10px] px-2 py-0.5">
                        Vigente
                      </Badge>
                    )}
                    <span className="text-[11px] text-ink-subtle">
                      {getDocumentTypeLabel(heroReadingCard.book.document_type)}
                    </span>
                  </div>

                  <Link
                    to={`/libro/${heroReadingCard.book.id}`}
                    className="block font-editorial text-xl sm:text-2xl lg:text-[26px] font-semibold text-navy hover:text-forest leading-[1.2] line-clamp-2 transition-colors"
                  >
                    {heroReadingCard.book.title}
                  </Link>

                  <p className="text-xs sm:text-sm text-ink-muted truncate">
                    {heroReadingCard.book.author}
                    {heroReadingCard.book.category ? ` · ${heroReadingCard.book.category}` : ''}
                  </p>

                  {/* Reading Progress Track */}
                  <div className="max-w-md mx-auto sm:mx-0 space-y-1.5 pt-0.5">
                    {heroReadingCard.percent > 0 && (
                      <div className="h-1.5 w-full rounded-full bg-paper-warm overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gold transition-[width] duration-300"
                          style={{ width: `${heroReadingCard.percent}%` }}
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-center sm:justify-between gap-2 text-xs text-ink-muted tabular-nums">
                      <span>{heroReadingCard.pageLabel}</span>
                      {heroReadingCard.percent > 0 && (
                        <span className="font-semibold text-navy">
                          {heroReadingCard.percent}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Primary Action + Secondary Quick Switch */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
                    <Link
                      to={heroReadingCard.to}
                      className="inline-flex items-center gap-2 h-9 sm:h-10 px-5 rounded-full bg-navy text-white text-xs sm:text-[13px] font-semibold hover:bg-navy-secondary active:scale-[0.98] transition-all shadow-subtle"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-gold" />
                      {heroReadingCard.mode === 'suggested' ? 'Comenzar lectura' : 'Continuar lectura'}
                    </Link>

                    <Link
                      to={`/libro/${heroReadingCard.book.id}`}
                      className="inline-flex items-center gap-1 h-9 sm:h-10 px-4 rounded-full border border-line-strong bg-white text-navy text-xs sm:text-[13px] font-medium hover:bg-paper-warm transition-colors"
                    >
                      Ver ficha
                      <ArrowRight className="h-3.5 w-3.5 text-ink-muted" />
                    </Link>
                  </div>

                  {/* Additional in-progress books (keeps full multi-reading access without duplicating a whole section) */}
                  {secondaryReadingItems.length > 0 && (
                    <div className="pt-2.5 mt-2 border-t border-line/70 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className="text-[11px] font-medium text-ink-subtle">
                        También leyendo:
                      </span>
                      {secondaryReadingItems.map(({ book, progress }) => (
                        <Link
                          key={book.id}
                          to={`/leer/${book.id}`}
                          className="inline-flex items-center gap-1.5 max-w-[210px] rounded-full bg-paper px-2.5 py-1 text-[11px] font-medium text-navy border border-line hover:border-navy/25 hover:bg-paper-warm transition-colors"
                        >
                          <span className="truncate">{book.title}</span>
                          <span className="text-gold-dark font-semibold tabular-nums shrink-0">
                            {Math.round(progress.progress_percent)}%
                          </span>
                        </Link>
                      ))}
                      <Link
                        to="/mi-biblioteca"
                        className="text-[11px] font-semibold text-forest hover:underline underline-offset-2 ml-0.5"
                      >
                        Mi biblioteca →
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Custom Micole Mascot harmoniously integrated */}
              <div className="hidden md:flex items-end justify-end self-end -mb-6 pr-1 shrink-0">
                <LexMascot
                  isAuthenticated={isAuthenticated}
                  sessionKey={userId}
                  userName={firstName}
                  sizeClassName="h-[188px] lg:h-[214px] xl:h-[228px]"
                />
              </div>
            </div>
          </m.div>
        )}
      </m.section>

      {/* Recommended Books — Seamless 5–6 column editorial shelf */}
      <DiscoverBookCarousel
        title="Recomendados para ti"
        subtitle="Obras jurídicas seleccionadas listas para lectura inmediata."
        seeAllTo="/explorar?orden=popular"
        books={heroRecommendations}
        isInLibrary={isInLibrary}
        isFavorite={isFavorite}
        getProgress={getProgress}
        onToggleLibrary={handleToggleLibrary}
        onToggleFavorite={handleToggleFavorite}
        onPreview={setPreviewBook}
      />

      {/* Compact Editorial Categories Ribbon */}
      {categoryShowcases.length > 0 && (
        <m.section
          variants={SCROLL_REVEAL_VARIANTS}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          className="space-y-3.5"
        >
          <div className="flex items-end justify-between gap-4 border-b border-line/70 pb-2.5">
            <div>
              <h2 className="font-editorial text-lg sm:text-[21px] font-semibold text-navy tracking-tight">
                Categorías jurídicas
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Explora por área del Derecho y colecciones normativas.
              </p>
            </div>
            <Link
              to="/categorias"
              className="inline-flex items-center gap-0.5 text-xs font-semibold text-navy/85 hover:text-gold-dark transition-colors shrink-0"
            >
              <span>Ver todas</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            {categoryShowcases.map(({ category, count, coverBook }) => (
              <Link
                key={category.id}
                to={`/explorar?categoria=${encodeURIComponent(category.name)}`}
                className="group shrink-0 w-[196px] sm:w-[216px] flex items-center gap-3 rounded-2xl bg-white border border-line/85 hover:border-navy/25 hover:shadow-subtle p-2.5 transition-all"
              >
                <div className="w-10 shrink-0">
                  {coverBook ? (
                    <BookCover
                      book={coverBook}
                      size="sm"
                      className="rounded-[4px] shadow-sm"
                    />
                  ) : (
                    <div className="aspect-[2/3] w-full rounded-[4px] bg-navy text-gold flex items-center justify-center">
                      <Scale className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-navy group-hover:text-forest transition-colors line-clamp-2 leading-snug">
                    {category.name}
                  </p>
                  <p className="text-[11px] text-ink-subtle mt-0.5 tabular-nums">
                    {count === 1 ? '1 recurso' : `${count} recursos`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </m.section>
      )}

      {/* Dominican Legislation Shelf */}
      {legislationBooks.length > 0 && (
        <BookShelf
          title="Legislación dominicana"
          subtitle="Códigos, leyes orgánicas y normativa procesal vigente."
          seeAllTo="/explorar?categoria=Legislaci%C3%B3n%20dominicana"
          books={legislationBooks}
          isInLibrary={isInLibrary}
          isFavorite={isFavorite}
          getProgress={getProgress}
          onToggleLibrary={handleToggleLibrary}
          onToggleFavorite={handleToggleFavorite}
          onPreview={setPreviewBook}
        />
      )}

      {/* Subdued 3D Focus Carousel — Recently Consulted (lower protagonism) */}
      {recentlyConsulted.length > 0 && (
        <RecentFocusCarousel
          title="Consultados recientemente"
          subtitle="Tus últimos documentos abiertos en vitrina rápida."
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
        title="Incorporaciones recientes"
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
        title="Más consultados"
        seeAllTo="/explorar?orden=popular"
        books={mostConsulted}
        isInLibrary={isInLibrary}
        isFavorite={isFavorite}
        getProgress={getProgress}
        onToggleLibrary={handleToggleLibrary}
        onToggleFavorite={handleToggleFavorite}
        onPreview={setPreviewBook}
      />

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
