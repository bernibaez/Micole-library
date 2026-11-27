import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, m } from 'motion/react';
import {
  Archive,
  ChevronRight,
  Folder,
  Home as HomeIcon,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  useBooksQuery,
  useCategoriesQuery,
  useFoldersQuery,
  usePersonalLibrary,
  usePreferencesQuery,
} from '../library/useLibraryData';
import { useDebounce } from '../../hooks/useDebounce';
import { saveRecentSearch } from './GlobalSearch';
import { FilterSheet } from './FilterSheet';
import { BookCard, BookListItem } from '../books/BookCard';
import { QuickPreviewModal } from '../books/QuickPreviewModal';
import { Button } from '../../components/ui/Button';
import { BookGridSkeleton } from '../../components/ui/Skeleton';
import { LexNotFoundMascot } from '../../components/mascot/LexNotFoundMascot';
import { ErrorState } from '../../components/feedback/ErrorState';
import {
  DOCUMENT_TYPE_LABELS,
  getDocumentTypeLabel,
  getValidityStatusLabel,
  normalizeText,
  VALIDITY_STATUS_LABELS,
} from '../../utils/format';
import { EASE_EDITORIAL, TRANSITION_MICRO } from '../../utils/motion';
import { cn } from '../../utils/cn';
import type { Book, LibraryFolder } from '../../types';

const PAGE_SIZE = 12;

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: books = [], isLoading, isError, refetch } = useBooksQuery();
  const { data: categories = [] } = useCategoriesQuery();
  const { data: folders = [] } = useFoldersQuery();
  const {
    isInLibrary,
    isFavorite,
    getProgress,
    handleToggleLibrary,
    handleToggleFavorite,
    handleDownloadBook,
  } = usePersonalLibrary();
  const { preferences } = usePreferencesQuery();

  const urlQuery = searchParams.get('q') ?? '';
  const category = searchParams.get('categoria') ?? '';
  const subcategoryId = searchParams.get('subcategoria') ?? '';
  const folderId = searchParams.get('carpeta') ?? '';
  const author = searchParams.get('autor') ?? '';
  const year = searchParams.get('anio') ?? '';
  const type = searchParams.get('tipo') ?? '';
  const validity = searchParams.get('vigencia') ?? '';
  const subject = searchParams.get('materia') ?? '';
  const sort = searchParams.get('orden') ?? 'relevance';

  const [draftQuery, setDraftQuery] = useState<{ base: string; value: string }>({
    base: urlQuery,
    value: urlQuery,
  });
  const inputQuery = draftQuery.base === urlQuery ? draftQuery.value : urlQuery;
  const setInputQuery = useCallback(
    (value: string) => setDraftQuery({ base: urlQuery, value }),
    [urlQuery]
  );

  const debouncedQuery = useDebounce(inputQuery, 240);
  const [viewModeOverride, setViewModeOverride] = useState<'grid' | 'list' | null>(null);
  const viewMode = viewModeOverride ?? preferences.catalog_view;
  const setViewMode = setViewModeOverride;
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(false);
  const [paginationState, setPaginationState] = useState<{ key: string; count: number }>({
    key: searchParams.toString(),
    count: PAGE_SIZE,
  });
  const currentFilterKey = searchParams.toString();
  const visibleCount = paginationState.key === currentFilterKey ? paginationState.count : PAGE_SIZE;
  const [previewBook, setPreviewBook] = useState<Book | null>(null);

  useEffect(() => {
    if (debouncedQuery === urlQuery) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedQuery.trim()) {
      next.set('q', debouncedQuery.trim());
      saveRecentSearch(debouncedQuery.trim());
    } else {
      next.delete('q');
    }
    setSearchParams(next, { replace: true });
  }, [debouncedQuery, searchParams, setSearchParams, urlQuery]);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value) next.set(key, value);
      else next.delete(key);

      if (key === 'categoria') {
        next.delete('subcategoria');
        next.delete('carpeta');
      } else if (key === 'subcategoria') {
        next.delete('carpeta');
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const clearAllFilters = useCallback(() => {
    setDraftQuery({ base: '', value: '' });
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const topLevelCategories = useMemo(
    () => categories.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order),
    [categories]
  );

  const activeCategoryObj = useMemo(
    () =>
      topLevelCategories.find(
        (c) => c.name.toLowerCase() === category.toLowerCase() || c.id === category
      ) ?? null,
    [category, topLevelCategories]
  );

  const subcategoriesForActive = useMemo(() => {
    if (!activeCategoryObj) return [];
    return categories
      .filter((c) => c.parent_id === activeCategoryObj.id)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [activeCategoryObj, categories]);

  const activeSubcategoryObj = useMemo(
    () => categories.find((c) => c.id === subcategoryId) ?? null,
    [categories, subcategoryId]
  );

  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  const activeFolderObj = folderId ? (folderById.get(folderId) ?? null) : null;

  // Breadcrumb trail for folder navigation
  const folderBreadcrumbs = useMemo(() => {
    const trail: LibraryFolder[] = [];
    let cursor = activeFolderObj;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      trail.unshift(cursor);
      cursor = cursor.parent_id ? (folderById.get(cursor.parent_id) ?? null) : null;
    }
    return trail;
  }, [activeFolderObj, folderById]);

  // Visible child folders for current navigation level
  const childFolders = useMemo(() => {
    if (activeFolderObj) {
      return folders.filter((f) => f.parent_id === activeFolderObj.id && f.published);
    }
    if (activeSubcategoryObj) {
      return folders.filter(
        (f) => f.subcategory_id === activeSubcategoryObj.id && !f.parent_id && f.published
      );
    }
    if (activeCategoryObj) {
      return folders.filter(
        (f) =>
          f.category_id === activeCategoryObj.id &&
          !f.subcategory_id &&
          !f.parent_id &&
          f.published
      );
    }
    return [];
  }, [activeCategoryObj, activeFolderObj, activeSubcategoryObj, folders]);

  // Descendant folder IDs so selecting a parent folder includes nested subfolders' documents
  const activeFolderTreeIds = useMemo(() => {
    if (!activeFolderObj) return null;
    const ids = new Set<string>([activeFolderObj.id]);
    let added = true;
    while (added) {
      added = false;
      for (const f of folders) {
        if (f.parent_id && ids.has(f.parent_id) && !ids.has(f.id)) {
          ids.add(f.id);
          added = true;
        }
      }
    }
    return ids;
  }, [activeFolderObj, folders]);

  const categoryNames = useMemo(
    () => topLevelCategories.map((c) => c.name),
    [topLevelCategories]
  );

  const authors = useMemo(
    () => Array.from(new Set(books.map((b) => b.author))).sort((a, b) => a.localeCompare(b)),
    [books]
  );

  const subjects = useMemo(
    () =>
      Array.from(
        new Set(books.map((b) => b.subject).filter((s): s is string => Boolean(s?.trim())))
      ).sort((a, b) => a.localeCompare(b)),
    [books]
  );

  const years = useMemo(
    () =>
      Array.from(
        new Set(books.map((b) => b.year).filter((y): y is number => typeof y === 'number'))
      ).sort((a, b) => b - a),
    [books]
  );

  const filteredBooks = useMemo(() => {
    const term = normalizeText(debouncedQuery);

    const scored = books
      .filter((b) => {
        if (activeCategoryObj) {
          const matchesCat =
            b.category_id === activeCategoryObj.id ||
            b.category.toLowerCase() === activeCategoryObj.name.toLowerCase();
          if (!matchesCat) return false;
        } else if (category && b.category.toLowerCase() !== category.toLowerCase()) {
          return false;
        }

        if (subcategoryId && b.subcategory_id !== subcategoryId) return false;
        if (activeFolderTreeIds && (!b.folder_id || !activeFolderTreeIds.has(b.folder_id))) {
          return false;
        }
        if (author && b.author !== author) return false;
        if (year && String(b.year ?? '') !== year) return false;
        if (type && b.document_type !== type) return false;
        if (validity && (b.validity_status ?? 'no_aplica') !== validity) return false;
        if (subject && (b.subject ?? '') !== subject) return false;

        if (!term) return true;
        const haystack = normalizeText(
          [
            b.title,
            b.name ?? '',
            b.author,
            b.category,
            b.subject ?? '',
            b.court ?? '',
            b.judgment_number ?? '',
            b.country ?? '',
            b.description,
            ...(b.keywords ?? []),
          ].join(' ')
        );
        return haystack.includes(term);
      })
      .map((book) => {
        let score = 0;
        if (term) {
          const titleNorm = normalizeText(book.title);
          const authorNorm = normalizeText(book.author);
          if (titleNorm.startsWith(term)) score += 6;
          else if (titleNorm.includes(term)) score += 4;
          if (authorNorm.includes(term)) score += 3;
          if (book.judgment_number && normalizeText(book.judgment_number).includes(term)) score += 5;
          if ((book.keywords ?? []).some((k) => normalizeText(k).includes(term))) score += 2;
        }
        return { book, score };
      });

    scored.sort((a, b) => {
      if (sort === 'title') return a.book.title.localeCompare(b.book.title, 'es');
      if (sort === 'popular') return b.book.downloads - a.book.downloads;
      if (sort === 'recent') {
        const dA = new Date(a.book.added_at ?? a.book.created_at ?? 0).getTime();
        const dB = new Date(b.book.added_at ?? b.book.created_at ?? 0).getTime();
        if (dB !== dA) return dB - dA;
        return (b.book.year ?? 0) - (a.book.year ?? 0);
      }
      if (b.score !== a.score) return b.score - a.score;
      return b.book.downloads - a.book.downloads;
    });

    return scored.map((item) => item.book);
  }, [
    activeCategoryObj,
    activeFolderTreeIds,
    author,
    books,
    category,
    debouncedQuery,
    sort,
    subcategoryId,
    subject,
    type,
    validity,
    year,
  ]);

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = [];
    if (urlQuery) {
      chips.push({
        key: 'q',
        label: `Búsqueda: "${urlQuery}"`,
        clear: () => {
          setInputQuery('');
          updateParam('q', '');
        },
      });
    }
    if (category) {
      chips.push({
        key: 'categoria',
        label: `Categoría: ${activeCategoryObj?.name ?? category}`,
        clear: () => updateParam('categoria', ''),
      });
    }
    if (activeSubcategoryObj) {
      chips.push({
        key: 'subcategoria',
        label: `Subcategoría: ${activeSubcategoryObj.name}`,
        clear: () => updateParam('subcategoria', ''),
      });
    }
    if (activeFolderObj) {
      chips.push({
        key: 'carpeta',
        label: `Carpeta: ${activeFolderObj.name}`,
        clear: () => updateParam('carpeta', ''),
      });
    }
    if (type) {
      chips.push({
        key: 'tipo',
        label: `Tipo: ${getDocumentTypeLabel(type)}`,
        clear: () => updateParam('tipo', ''),
      });
    }
    if (validity) {
      chips.push({
        key: 'vigencia',
        label: `Vigencia: ${getValidityStatusLabel(validity)}`,
        clear: () => updateParam('vigencia', ''),
      });
    }
    if (subject) {
      chips.push({
        key: 'materia',
        label: `Materia: ${subject}`,
        clear: () => updateParam('materia', ''),
      });
    }
    if (author) {
      chips.push({
        key: 'autor',
        label: `Autor: ${author}`,
        clear: () => updateParam('autor', ''),
      });
    }
    if (year) {
      chips.push({
        key: 'anio',
        label: `Año: ${year}`,
        clear: () => updateParam('anio', ''),
      });
    }
    return chips;
  }, [
    activeCategoryObj?.name,
    activeFolderObj,
    activeSubcategoryObj,
    author,
    category,
    setInputQuery,
    subject,
    type,
    updateParam,
    urlQuery,
    validity,
    year,
  ]);

  const visibleBooks = filteredBooks.slice(0, visibleCount);
  const hasMore = visibleCount < filteredBooks.length;
  const resultsTransitionKey = `${viewMode}-${category}-${subcategoryId}-${folderId}-${type}-${validity}-${subject}-${author}-${year}-${sort}-${debouncedQuery}`;

  const showBreadcrumbs = Boolean(activeCategoryObj || activeSubcategoryObj || activeFolderObj);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark">
          Catálogo jurídico
        </p>
        <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-navy tracking-tight">
          {activeFolderObj?.name ||
            activeSubcategoryObj?.name ||
            activeCategoryObj?.name ||
            'Explorar biblioteca'}
        </h1>
        <p className="text-sm text-ink-muted">
          Filtra por categoría, carpeta, materia, vigencia, autor, año o tipo de documento.
        </p>
      </div>

      {/* Folder & Category Breadcrumbs */}
      {showBreadcrumbs && (
        <nav
          aria-label="Ruta de carpetas"
          className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted bg-surface-secondary/70 border border-line rounded-xl px-3.5 py-2"
        >
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 font-medium text-navy hover:text-gold-dark"
          >
            <HomeIcon className="h-3.5 w-3.5" />
            Catálogo
          </button>

          {activeCategoryObj && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-ink-subtle" />
              <button
                type="button"
                onClick={() => updateParam('categoria', activeCategoryObj.name)}
                className={cn(
                  'hover:text-navy transition-colors',
                  !activeSubcategoryObj && !activeFolderObj && 'font-semibold text-navy'
                )}
              >
                {activeCategoryObj.name}
              </button>
            </>
          )}

          {activeSubcategoryObj && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-ink-subtle" />
              <button
                type="button"
                onClick={() => updateParam('subcategoria', activeSubcategoryObj.id)}
                className={cn(
                  'hover:text-navy transition-colors',
                  !activeFolderObj && 'font-semibold text-navy'
                )}
              >
                {activeSubcategoryObj.name}
              </button>
            </>
          )}

          {folderBreadcrumbs.map((fld, idx) => (
            <span key={fld.id} className="inline-flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-ink-subtle" />
              <button
                type="button"
                onClick={() => updateParam('carpeta', fld.id)}
                className={cn(
                  'inline-flex items-center gap-1 hover:text-navy transition-colors',
                  idx === folderBreadcrumbs.length - 1 && 'font-semibold text-navy'
                )}
              >
                <Folder className="h-3.5 w-3.5 text-gold-dark" />
                {fld.name}
              </button>
            </span>
          ))}
        </nav>
      )}

      {/* Subcategories strip when inside a parent category (e.g. Legislación dominicana -> Legislación derogada o histórica) */}
      {subcategoriesForActive.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => updateParam('subcategoria', '')}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors',
              !subcategoryId
                ? 'bg-navy text-white border-navy'
                : 'bg-white text-navy border-line-strong hover:bg-surface-secondary'
            )}
          >
            Todo en {activeCategoryObj?.name}
          </button>
          {subcategoriesForActive.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => updateParam('subcategoria', sub.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors',
                subcategoryId === sub.id
                  ? 'bg-navy text-white border-navy'
                  : 'bg-gold-soft/70 text-navy border-gold/40 hover:bg-gold-soft'
              )}
            >
              <Archive className="h-3.5 w-3.5 text-gold-dark" />
              {sub.name}
            </button>
          ))}
        </div>
      )}

      {/* Nested Folders Grid */}
      {childFolders.length > 0 && (
        <section className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
            Carpetas disponibles
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {childFolders.map((fld) => {
              const directCount = books.filter((b) => b.folder_id === fld.id).length;
              return (
                <button
                  key={fld.id}
                  type="button"
                  onClick={() => updateParam('carpeta', fld.id)}
                  className="group flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-left hover:border-navy/30 hover:bg-surface-secondary/60 transition-all"
                >
                  <span className="h-9 w-9 rounded-lg bg-gold-soft text-gold-dark inline-flex items-center justify-center shrink-0 group-hover:bg-navy group-hover:text-gold transition-colors">
                    <Folder className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy truncate">{fld.name}</p>
                    <p className="text-[11px] text-ink-muted">
                      {directCount} {directCount === 1 ? 'documento' : 'documentos'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-subtle group-hover:text-navy shrink-0" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Editorial Category Filter Pills */}
      {categoryNames.length > 0 && (
        <div
          role="region"
          aria-label="Filtrar por categoría"
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1"
        >
          <button
            type="button"
            onClick={() => updateParam('categoria', '')}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors',
              !category
                ? 'bg-navy text-white border-navy shadow-subtle'
                : 'bg-white text-ink-muted border-line hover:text-navy hover:border-line-strong'
            )}
          >
            Todas
          </button>
          {categoryNames.map((catName) => {
            const isActive =
              (activeCategoryObj?.name ?? category).toLowerCase() === catName.toLowerCase();
            return (
              <button
                key={catName}
                type="button"
                onClick={() => updateParam('categoria', isActive ? '' : catName)}
                className={cn(
                  'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-navy text-white border-navy shadow-subtle'
                    : 'bg-white text-ink-muted border-line hover:text-navy hover:border-line-strong'
                )}
              >
                {catName}
              </button>
            );
          })}
        </div>
      )}

      {/* Clean Curatorial Search & Controls Bar */}
      <div className="space-y-3 pb-4 border-b border-line/85">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex-1 min-w-[220px] flex items-center gap-2 h-10 rounded-full border border-line bg-white px-4 shadow-subtle focus-within:border-navy/40 focus-within:ring-2 focus-within:ring-navy/10 transition-all">
            <Search className="h-4 w-4 text-ink-subtle shrink-0" />
            <input
              type="search"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Buscar por título, autor, materia, tribunal o n.º de sentencia..."
              aria-label="Filtrar catálogo"
              className="w-full min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-subtle focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {inputQuery && (
              <button
                type="button"
                onClick={() => {
                  setInputQuery('');
                  updateParam('q', '');
                }}
                aria-label="Limpiar texto de búsqueda"
                className="text-ink-muted hover:text-navy"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Sort Pill */}
          <select
            aria-label="Ordenar resultados"
            value={sort}
            onChange={(e) => updateParam('orden', e.target.value)}
            className="hidden sm:block h-10 rounded-full border border-line bg-white px-3.5 text-xs font-medium text-navy shadow-subtle focus:border-navy/40 focus:outline-none cursor-pointer"
          >
            <option value="relevance">Orden: Relevancia</option>
            <option value="recent">Orden: Más recientes</option>
            <option value="popular">Orden: Popularidad</option>
            <option value="title">Orden: Título (A-Z)</option>
          </select>

          {/* Mobile Filters Sheet Trigger */}
          <Button
            variant="secondary"
            size="md"
            className="lg:hidden rounded-full"
            onClick={() => setFilterSheetOpen(true)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros
            {activeChips.length > 0 && (
              <span className="ml-0.5 h-5 min-w-5 px-1 rounded-full bg-forest text-white text-[11px] inline-flex items-center justify-center">
                {activeChips.length}
              </span>
            )}
          </Button>

          {/* Desktop Collapsible Advanced Filters Trigger */}
          <Button
            variant={desktopFiltersOpen ? 'primary' : 'secondary'}
            size="md"
            className="hidden lg:inline-flex rounded-full"
            aria-expanded={desktopFiltersOpen}
            onClick={() => setDesktopFiltersOpen((v) => !v)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros avanzados
            {activeChips.filter((c) => c.key !== 'q' && c.key !== 'categoria').length > 0 && (
              <span
                className={cn(
                  'ml-0.5 h-5 min-w-5 px-1 rounded-full text-[11px] inline-flex items-center justify-center',
                  desktopFiltersOpen ? 'bg-gold text-navy font-semibold' : 'bg-forest text-white'
                )}
              >
                {activeChips.filter((c) => c.key !== 'q' && c.key !== 'categoria').length}
              </span>
            )}
          </Button>

          <div
            role="group"
            aria-label="Modo de visualización"
            className="inline-flex items-center rounded-full border border-line bg-white p-1 shadow-subtle"
          >
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Vista en cuadrícula"
              aria-pressed={viewMode === 'grid'}
              className={cn(
                'h-8 w-8 rounded-full inline-flex items-center justify-center transition-colors',
                viewMode === 'grid'
                  ? 'bg-navy text-white shadow-xs'
                  : 'text-ink-muted hover:text-navy'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="Vista en lista"
              aria-pressed={viewMode === 'list'}
              className={cn(
                'h-8 w-8 rounded-full inline-flex items-center justify-center transition-colors',
                viewMode === 'list'
                  ? 'bg-navy text-white shadow-xs'
                  : 'text-ink-muted hover:text-navy'
              )}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Collapsible Desktop Advanced Filters Panel */}
        <AnimatePresence initial={false}>
          {desktopFiltersOpen && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: EASE_EDITORIAL }}
              className="hidden lg:block overflow-hidden"
            >
              <div className="grid grid-cols-5 gap-3 rounded-2xl border border-line bg-white p-4 shadow-subtle">
                <label className="space-y-1 text-xs">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-subtle">
                    Tipo de documento
                  </span>
                  <select
                    aria-label="Filtrar por tipo de documento"
                    value={type}
                    onChange={(e) => updateParam('tipo', e.target.value)}
                    className="w-full h-9 rounded-xl border border-line bg-paper/60 px-2.5 text-xs font-medium text-navy focus:border-navy/40 focus:outline-none"
                  >
                    <option value="">Todos los tipos</option>
                    {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-xs">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-subtle">
                    Estado de vigencia
                  </span>
                  <select
                    aria-label="Filtrar por vigencia"
                    value={validity}
                    onChange={(e) => updateParam('vigencia', e.target.value)}
                    className="w-full h-9 rounded-xl border border-line bg-paper/60 px-2.5 text-xs font-medium text-navy focus:border-navy/40 focus:outline-none"
                  >
                    <option value="">Cualquier vigencia</option>
                    {Object.entries(VALIDITY_STATUS_LABELS)
                      .filter(([k]) => k !== 'no_aplica')
                      .map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="space-y-1 text-xs">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-subtle">
                    Materia
                  </span>
                  <select
                    aria-label="Filtrar por materia"
                    value={subject}
                    onChange={(e) => updateParam('materia', e.target.value)}
                    className="w-full h-9 rounded-xl border border-line bg-paper/60 px-2.5 text-xs font-medium text-navy focus:border-navy/40 focus:outline-none"
                  >
                    <option value="">Todas las materias</option>
                    {subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-xs">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-subtle">
                    Autor
                  </span>
                  <select
                    aria-label="Filtrar por autor"
                    value={author}
                    onChange={(e) => updateParam('autor', e.target.value)}
                    className="w-full h-9 rounded-xl border border-line bg-paper/60 px-2.5 text-xs font-medium text-navy focus:border-navy/40 focus:outline-none"
                  >
                    <option value="">Todos los autores</option>
                    {authors.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-xs">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-subtle">
                    Año de publicación
                  </span>
                  <select
                    aria-label="Filtrar por año"
                    value={year}
                    onChange={(e) => updateParam('anio', e.target.value)}
                    className="w-full h-9 rounded-xl border border-line bg-paper/60 px-2.5 text-xs font-medium text-navy focus:border-navy/40 focus:outline-none"
                  >
                    <option value="">Cualquier año</option>
                    {years.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* Active Filter Chips */}
        <AnimatePresence>
          {activeChips.length > 0 && (
            <m.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={TRANSITION_MICRO}
              className="flex flex-wrap items-center gap-2 pt-1"
            >
              <AnimatePresence initial={false}>
                {activeChips.map((chip) => (
                  <m.button
                    key={chip.key}
                    type="button"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    whileTap={{ scale: 0.96 }}
                    transition={TRANSITION_MICRO}
                    onClick={chip.clear}
                    className="inline-flex items-center gap-1.5 rounded-full bg-forest-soft border border-forest/20 px-3 py-1 text-xs font-medium text-forest hover:bg-forest/15 transition-colors"
                  >
                    <span>{chip.label}</span>
                    <X className="h-3 w-3" />
                  </m.button>
                ))}
              </AnimatePresence>
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-medium text-ink-muted hover:text-navy underline underline-offset-2 px-1"
              >
                Limpiar todo
              </button>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Result Count */}
      {!isLoading && !isError && (
        <p className="text-xs font-medium text-ink-muted">
          Mostrando {visibleBooks.length} de {filteredBooks.length}{' '}
          {filteredBooks.length === 1 ? 'documento' : 'documentos'}
        </p>
      )}

      {/* Content */}
      {isLoading ? (
        <BookGridSkeleton count={12} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          {filteredBooks.length === 0 ? (
            <m.div
              key={`empty-${urlQuery}-${category}-${type}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.24, ease: EASE_EDITORIAL }}
              className="flex flex-col items-center justify-center text-center py-12 sm:py-16 px-6 rounded-3xl border border-line bg-white shadow-subtle"
            >
              <LexNotFoundMascot className="mb-3" />
              <h2 className="font-editorial text-xl sm:text-2xl font-semibold text-navy">
                {urlQuery
                  ? `No encontramos resultados para "${urlQuery}"`
                  : 'No encontramos documentos con esos criterios'}
              </h2>
              <p className="text-sm text-ink-muted max-w-md mt-1.5 leading-relaxed">
                Verifica la ortografía, prueba con otro título o autor, o limpia los filtros activos
                para explorar todo el catálogo jurídico.
              </p>
              <div className="mt-5">
                <Button variant="primary" onClick={clearAllFilters}>
                  Restablecer filtros
                </Button>
              </div>
            </m.div>
          ) : viewMode === 'grid' ? (
            <m.div
              key={resultsTransitionKey}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: EASE_EDITORIAL }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-8"
            >
              {visibleBooks.map((book, idx) => (
                <BookCard
                  key={book.id}
                  book={book}
                  index={idx}
                  inLibrary={isInLibrary(book.id)}
                  isFavorite={isFavorite(book.id)}
                  progress={getProgress(book.id)}
                  onToggleLibrary={handleToggleLibrary}
                  onToggleFavorite={handleToggleFavorite}
                  onPreview={setPreviewBook}
                />
              ))}
            </m.div>
          ) : (
            <m.div
              key={resultsTransitionKey}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: EASE_EDITORIAL }}
              className="rounded-2xl border border-line bg-white px-4 sm:px-6 divide-y divide-line"
            >
              {visibleBooks.map((book, idx) => (
                <BookListItem
                  key={book.id}
                  book={book}
                  index={idx}
                  inLibrary={isInLibrary(book.id)}
                  isFavorite={isFavorite(book.id)}
                  progress={getProgress(book.id)}
                  onToggleLibrary={handleToggleLibrary}
                  onToggleFavorite={handleToggleFavorite}
                  onPreview={setPreviewBook}
                />
              ))}
            </m.div>
          )}
        </AnimatePresence>
      )}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="secondary"
            size="lg"
            onClick={() =>
              setPaginationState({ key: currentFilterKey, count: visibleCount + PAGE_SIZE })
            }
          >
            Cargar más documentos ({filteredBooks.length - visibleCount} restantes)
          </Button>
        </div>
      )}

      <FilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        category={activeCategoryObj?.name ?? category}
        author={author}
        year={year}
        type={type}
        validity={validity}
        subject={subject}
        sort={sort}
        categories={categoryNames}
        authors={authors}
        years={years}
        subjects={subjects}
        onChange={updateParam}
        onClearAll={clearAllFilters}
      />

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
