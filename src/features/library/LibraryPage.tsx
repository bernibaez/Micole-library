import { useMemo, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { ArrowLeft, BookPlus, Pencil, Trash2 } from 'lucide-react';
import { useBooksQuery, usePersonalLibrary } from './useLibraryData';
import { CollectionAddBooksModal } from './CollectionAddBooksModal';
import { LibraryHeader } from './components/LibraryHeader';
import { CollectionsSection } from './components/CollectionsSection';
import { CollectionDialog, type CollectionFormPayload } from './components/CollectionDialog';
import { ContinueReadingSection } from './components/ContinueReadingSection';
import { LibraryTabs, type LibraryTabId, type LibraryTabItem } from './components/LibraryTabs';
import {
  LibraryToolbar,
  type LibrarySortOption,
  type LibraryViewMode,
} from './components/LibraryToolbar';
import { LibraryBookGrid } from './components/LibraryBookGrid';
import { LibraryBookList } from './components/LibraryBookList';
import { type LibraryBookEntry } from './components/LibraryBookCard';
import { BookContextMenu, type BookContextMenuState } from './components/BookContextMenu';
import { BookCollectionsPickerModal } from './components/BookCollectionsPickerModal';
import { LibraryEmptyState } from './components/LibraryEmptyState';
import { LibrarySkeleton } from './components/LibrarySkeleton';
import { CollectionIcon } from './components/CollectionIcon';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useDebounce } from '../../hooks/useDebounce';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { normalizeText } from '../../utils/format';
import { EASE_EDITORIAL } from '../../utils/motion';
import type { Book, LibraryStatus, UserCollection } from '../../types';

const VIEW_PREF_KEY = 'micole:v2:library-view';
const PAGE_SIZE = 36;

function readViewPref(): LibraryViewMode {
  try {
    return localStorage.getItem(VIEW_PREF_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

export function LibraryPage() {
  const reducedMotion = useReducedMotion();
  const { data: books = [], isLoading: loadingBooks } = useBooksQuery();
  const {
    snapshot,
    isLoading: loadingPersonal,
    isInLibrary,
    isFavorite,
    getProgress,
    handleToggleLibrary,
    handleToggleFavorite,
    handleDownloadBook,
    updateStatus,
    createCollection,
    updateCollection,
    deleteCollection,
    toggleBookInCollection,
  } = usePersonalLibrary();

  const [activeTab, setActiveTab] = useState<LibraryTabId>('all');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 180);
  const [sort, setSort] = useState<LibrarySortOption>('recent');
  const [viewMode, setViewModeState] = useState<LibraryViewMode>(readViewPref);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);

  // Modals & contextual menus
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<UserCollection | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<UserCollection | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [manageBooksCollectionId, setManageBooksCollectionId] = useState<string | null>(null);
  const [bookPickerTarget, setBookPickerTarget] = useState<Book | null>(null);
  const [contextMenu, setContextMenu] = useState<BookContextMenuState | null>(null);

  const handleSetViewMode = (mode: LibraryViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(VIEW_PREF_KEY, mode);
    } catch {
      // ignore storage errors
    }
  };

  const booksById = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);
  const libraryByBookId = useMemo(
    () => new Map(snapshot.library.map((item) => [item.book_id, item])),
    [snapshot.library]
  );
  const progressByBookId = useMemo(
    () => new Map(snapshot.progress.map((p) => [p.book_id, p])),
    [snapshot.progress]
  );
  const favoriteSet = useMemo(
    () => new Set(snapshot.favorites.map((f) => f.book_id)),
    [snapshot.favorites]
  );
  const downloadSet = useMemo(
    () => new Set(snapshot.downloads.map((d) => d.book_id)),
    [snapshot.downloads]
  );

  // Build normalized LibraryBookEntry for any book ID
  const buildEntry = useMemo(() => {
    return (book: Book): LibraryBookEntry => {
      const libItem = libraryByBookId.get(book.id);
      const prog = progressByBookId.get(book.id);
      const percent = prog ? Math.round(prog.progress_percent) : 0;

      let status: LibraryStatus = libItem?.status ?? 'pending';
      if (percent >= 100 || libItem?.status === 'completed') {
        status = 'completed';
      } else if (percent > 0 && libItem?.status !== 'pending') {
        status = 'reading';
      }

      return {
        book,
        status,
        progress: prog,
        inLibrary: Boolean(libItem),
        isFavorite: favoriteSet.has(book.id),
        isDownloaded: downloadSet.has(book.id),
        addedAt: libItem?.added_at ?? prog?.last_read_at ?? book.added_at ?? '',
        lastReadAt: prog?.last_read_at ?? '',
      };
    };
  }, [downloadSet, favoriteSet, libraryByBookId, progressByBookId]);

  // Continue reading items (active in-progress readings sorted by most recent)
  const continueReadingItems = useMemo(() => {
    return snapshot.progress
      .filter((p) => p.progress_percent > 0 && p.progress_percent < 100)
      .sort((a, b) => new Date(b.last_read_at).getTime() - new Date(a.last_read_at).getTime())
      .map((progress) => {
        const book = booksById.get(progress.book_id);
        return book ? { book, progress } : null;
      })
      .filter((item): item is { book: Book; progress: NonNullable<typeof item>['progress'] } =>
        Boolean(item)
      );
  }, [booksById, snapshot.progress]);

  // Compute unique book pools for each tab
  const tabPools = useMemo(() => {
    const resolveUnique = (ids: string[]) =>
      Array.from(new Set(ids))
        .map((id) => booksById.get(id))
        .filter((b): b is Book => Boolean(b))
        .map(buildEntry);

    const allIds = [
      ...snapshot.library.map((i) => i.book_id),
      ...snapshot.progress.map((p) => p.book_id),
      ...snapshot.favorites.map((f) => f.book_id),
    ];

    const all = resolveUnique(allIds);
    const reading = all.filter(
      (e) => e.status === 'reading' || (e.progress && e.progress.progress_percent > 0 && e.progress.progress_percent < 100)
    );
    const favorites = resolveUnique(snapshot.favorites.map((f) => f.book_id));
    const pending = all.filter((e) => e.status === 'pending');
    const completed = all.filter((e) => e.status === 'completed');
    const downloads = resolveUnique(snapshot.downloads.map((d) => d.book_id));

    return { all, reading, favorites, pending, completed, downloads };
  }, [booksById, buildEntry, snapshot]);

  const tabs: LibraryTabItem[] = useMemo(
    () => [
      { id: 'all', label: 'Todos mis libros', count: tabPools.all.length },
      { id: 'reading', label: 'En lectura', count: tabPools.reading.length },
      { id: 'favorites', label: 'Favoritos', count: tabPools.favorites.length },
      { id: 'pending', label: 'Pendientes', count: tabPools.pending.length },
      { id: 'completed', label: 'Completados', count: tabPools.completed.length },
      { id: 'downloads', label: 'Descargas', count: tabPools.downloads.length },
    ],
    [tabPools]
  );

  const activeCollection = useMemo(
    () => snapshot.collections.find((c) => c.id === selectedCollectionId) ?? null,
    [selectedCollectionId, snapshot.collections]
  );

  const manageBooksCollection = useMemo(
    () => snapshot.collections.find((c) => c.id === manageBooksCollectionId) ?? null,
    [manageBooksCollectionId, snapshot.collections]
  );

  // Active pool (either selected collection or active tab)
  const baseEntries = useMemo(() => {
    if (activeCollection) {
      return Array.from(new Set(activeCollection.book_ids))
        .map((id) => booksById.get(id))
        .filter((b): b is Book => Boolean(b))
        .map(buildEntry);
    }
    return tabPools[activeTab];
  }, [activeCollection, activeTab, booksById, buildEntry, tabPools]);

  // Apply search & sorting
  const filteredEntries = useMemo(() => {
    const q = normalizeText(debouncedSearch);
    const matches = q
      ? baseEntries.filter(({ book }) => {
          const hay = normalizeText(
            [
              book.title,
              book.author,
              book.category,
              book.subject ?? '',
              ...(book.keywords ?? []),
            ].join(' ')
          );
          return hay.includes(q);
        })
      : baseEntries;

    const sorted = [...matches];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'recent':
          return new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime();
        case 'oldest':
          return new Date(a.addedAt || 0).getTime() - new Date(b.addedAt || 0).getTime();
        case 'title_asc':
          return a.book.title.localeCompare(b.book.title, 'es', { sensitivity: 'base' });
        case 'title_desc':
          return b.book.title.localeCompare(a.book.title, 'es', { sensitivity: 'base' });
        case 'last_read':
          return new Date(b.lastReadAt || 0).getTime() - new Date(a.lastReadAt || 0).getTime();
        case 'progress':
          return (b.progress?.progress_percent ?? 0) - (a.progress?.progress_percent ?? 0);
      }
    });
    return sorted;
  }, [baseEntries, debouncedSearch, sort]);

  const visibleEntries = useMemo(
    () => filteredEntries.slice(0, visibleLimit),
    [filteredEntries, visibleLimit]
  );

  const handleOpenCreateCollection = () => {
    setEditingCollection(null);
    setCollectionDialogOpen(true);
  };

  const handleOpenEditCollection = (col: UserCollection) => {
    setEditingCollection(col);
    setCollectionDialogOpen(true);
  };

  const handleSubmitCollection = async (payload: CollectionFormPayload) => {
    if (editingCollection) {
      await updateCollection({
        collectionId: editingCollection.id,
        ...payload,
      });
    } else {
      await createCollection(payload);
    }
  };

  const handleConfirmDeleteCollection = async () => {
    if (!deletingCollection || deletingBusy) return;
    setDeletingBusy(true);
    try {
      const id = deletingCollection.id;
      if (selectedCollectionId === id) {
        setSelectedCollectionId(null);
      }
      await deleteCollection(id);
      setDeletingCollection(null);
    } finally {
      setDeletingBusy(false);
    }
  };

  const handleSafeDownload = (book: Book) => {
    void handleDownloadBook(book).catch(() => {
      // Error toast already shown inside handleDownloadBook
    });
  };

  if (loadingBooks && loadingPersonal) {
    return <LibrarySkeleton />;
  }

  const contextEntry = contextMenu ? buildEntry(contextMenu.book) : null;

  return (
    <div className="space-y-7 sm:space-y-8 pb-6">
      {/* 1. Compact Editorial Header */}
      <LibraryHeader onCreateCollection={handleOpenCreateCollection} />

      {/* 2. Custom Collections Row */}
      <CollectionsSection
        collections={snapshot.collections}
        selectedCollectionId={selectedCollectionId}
        onSelectCollection={(id) => {
          setSelectedCollectionId(id);
          setVisibleLimit(PAGE_SIZE);
        }}
        onCreateCollection={handleOpenCreateCollection}
        onEditCollection={handleOpenEditCollection}
        onManageBooks={(col) => setManageBooksCollectionId(col.id)}
        onDeleteCollection={(col) => setDeletingCollection(col)}
      />

      {/* 3. Continue Where You Left Off (hidden cleanly when viewing a specific collection or when empty) */}
      {!activeCollection && (
        <ContinueReadingSection
          items={continueReadingItems}
          onOpenMenu={(book, anchorRect) => setContextMenu({ book, anchorRect })}
        />
      )}

      {/* 4. Navigation Tabs OR Active Collection Banner */}
      <section aria-label="Documentos de mi biblioteca" className="space-y-4">
        {!activeCollection ? (
          <LibraryTabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(tab) => {
              setActiveTab(tab);
              setVisibleLimit(PAGE_SIZE);
            }}
          />
        ) : (
          <div className="rounded-2xl border border-[#E5E3DD] bg-white px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-subtle">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setSelectedCollectionId(null)}
                aria-label="Volver a todas las secciones"
                className="h-9 w-9 rounded-xl border border-[#E5E3DD] bg-[#F6F5F1] text-[#111E32] hover:bg-[#ECE9E1] inline-flex items-center justify-center shrink-0 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <span
                className="h-10 w-10 rounded-xl text-white inline-flex items-center justify-center shrink-0"
                style={{ backgroundColor: activeCollection.color || '#111E32' }}
                aria-hidden="true"
              >
                <CollectionIcon iconId={activeCollection.icon} className="h-4.5 w-4.5" />
              </span>

              <div className="min-w-0">
                <h2 className="font-editorial text-lg sm:text-xl font-semibold text-[#111E32] truncate leading-tight">
                  {activeCollection.name}
                </h2>
                <p className="text-xs text-[#667085] truncate">
                  {activeCollection.description ||
                    `${activeCollection.book_ids.length} ${
                      activeCollection.book_ids.length === 1 ? 'documento' : 'documentos'
                    }`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleOpenEditCollection(activeCollection)}
                className="rounded-full"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setManageBooksCollectionId(activeCollection.id)}
                className="rounded-full bg-[#111E32] hover:bg-[#192B45]"
              >
                <BookPlus className="h-3.5 w-3.5 text-[#E5C784]" />
                Añadir documentos
              </Button>
            </div>
          </div>
        )}

        {/* 5. Compact Toolbar (Search + Sort + Grid/List Toggle) */}
        <LibraryToolbar
          search={search}
          onSearchChange={(val) => {
            setSearch(val);
            setVisibleLimit(PAGE_SIZE);
          }}
          sort={sort}
          onSortChange={setSort}
          viewMode={viewMode}
          onViewModeChange={handleSetViewMode}
          placeholder={
            activeCollection
              ? `Buscar en "${activeCollection.name}"...`
              : 'Buscar en mi biblioteca...'
          }
          totalResults={filteredEntries.length}
        />

        {/* 6. Books Collection Content (Grid / List / Empty State) */}
        <AnimatePresence mode="wait" initial={false}>
          {filteredEntries.length === 0 ? (
            <m.div
              key={`empty-${activeCollection?.id ?? activeTab}-${debouncedSearch ? 'q' : 'base'}`}
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: EASE_EDITORIAL }}
            >
              <LibraryEmptyState
                variant={
                  debouncedSearch.trim()
                    ? 'search'
                    : activeCollection
                      ? 'collection'
                      : activeTab
                }
                collectionName={activeCollection?.name}
                searchQuery={debouncedSearch.trim()}
                onClearSearch={() => setSearch('')}
                onManageCollectionBooks={
                  activeCollection
                    ? () => setManageBooksCollectionId(activeCollection.id)
                    : undefined
                }
              />
            </m.div>
          ) : (
            <m.div
              key={`${viewMode}-${activeCollection?.id ?? activeTab}`}
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: EASE_EDITORIAL }}
              className="space-y-6 pt-1"
            >
              {viewMode === 'grid' ? (
                <LibraryBookGrid
                  entries={visibleEntries}
                  onOpenMenu={(book, anchorRect) => setContextMenu({ book, anchorRect })}
                />
              ) : (
                <LibraryBookList
                  entries={visibleEntries}
                  onOpenMenu={(book, anchorRect) => setContextMenu({ book, anchorRect })}
                  onToggleFavorite={handleToggleFavorite}
                />
              )}

              {filteredEntries.length > visibleEntries.length && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setVisibleLimit((prev) => prev + PAGE_SIZE)}
                    className="rounded-full px-6"
                  >
                    Mostrar más ({filteredEntries.length - visibleEntries.length} restantes)
                  </Button>
                </div>
              )}
            </m.div>
          )}
        </AnimatePresence>
      </section>

      {/* Book Contextual Menu (Floating dropdown on desktop / BottomSheet on mobile) */}
      <BookContextMenu
        state={contextMenu}
        onClose={() => setContextMenu(null)}
        status={contextEntry?.status ?? 'pending'}
        progress={contextMenu ? getProgress(contextMenu.book.id) : undefined}
        inLibrary={contextMenu ? isInLibrary(contextMenu.book.id) : false}
        isFavorite={contextMenu ? isFavorite(contextMenu.book.id) : false}
        activeCollectionName={activeCollection?.name ?? null}
        onAddToCollection={(book) => setBookPickerTarget(book)}
        onRemoveFromCollection={
          activeCollection
            ? (book) => {
                void toggleBookInCollection({
                  collectionId: activeCollection.id,
                  bookId: book.id,
                  inCollection: true,
                });
              }
            : undefined
        }
        onUpdateStatus={(book, nextStatus) =>
          updateStatus(book.id, nextStatus, book.pages ?? getProgress(book.id)?.total_pages ?? null)
        }
        onToggleFavorite={handleToggleFavorite}
        onToggleLibrary={handleToggleLibrary}
        onDownload={handleSafeDownload}
      />

      {/* Create / Edit Collection Dialog */}
      <CollectionDialog
        open={collectionDialogOpen}
        editingCollection={editingCollection}
        onClose={() => {
          setCollectionDialogOpen(false);
          setEditingCollection(null);
        }}
        onSubmit={handleSubmitCollection}
      />

      {/* Add / Remove Books for a Collection */}
      <CollectionAddBooksModal
        collection={manageBooksCollection}
        onClose={() => setManageBooksCollectionId(null)}
        books={books}
        onToggleBook={toggleBookInCollection}
      />

      {/* Quick Picker: Add a single Book to Collections */}
      <BookCollectionsPickerModal
        book={bookPickerTarget}
        collections={snapshot.collections}
        onClose={() => setBookPickerTarget(null)}
        onToggleBookInCollection={toggleBookInCollection}
        onCreateNewCollection={handleOpenCreateCollection}
      />

      {/* Delete Collection Confirmation Modal */}
      <Modal
        open={Boolean(deletingCollection)}
        onClose={() => setDeletingCollection(null)}
        size="sm"
        title="Eliminar colección"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-[#667085] leading-relaxed">
            ¿Seguro que deseas eliminar la colección{' '}
            <strong className="text-[#111E32]">«{deletingCollection?.name}»</strong>? Los
            documentos seguirán disponibles en tu biblioteca y en el catálogo.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeletingCollection(null)}
              className="rounded-full"
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deletingBusy}
              onClick={() => void handleConfirmDeleteCollection()}
              className="rounded-full"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
