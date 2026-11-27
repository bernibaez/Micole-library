import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, m } from 'motion/react';
import { BookPlus, FolderOpen, FolderPlus, Trash2 } from 'lucide-react';
import { useBooksQuery, usePersonalLibrary } from './useLibraryData';
import { CollectionModal } from './CollectionModal';
import { CollectionAddBooksModal } from './CollectionAddBooksModal';
import { BookCard } from '../books/BookCard';
import { QuickPreviewModal } from '../books/QuickPreviewModal';
import { Button } from '../../components/ui/Button';
import { LexNotFoundMascot } from '../../components/mascot/LexNotFoundMascot';
import { EASE_EDITORIAL } from '../../utils/motion';
import { cn } from '../../utils/cn';
import type { Book } from '../../types';

type LibraryTab = 'all' | 'reading' | 'favorites' | 'pending' | 'completed' | 'downloads';

const TABS: Array<{ id: LibraryTab; label: string }> = [
  { id: 'all', label: 'Todos mis libros' },
  { id: 'reading', label: 'Continuar leyendo' },
  { id: 'favorites', label: 'Favoritos' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'completed', label: 'Completados' },
  { id: 'downloads', label: 'Descargas recientes' },
];

export function LibraryPage() {
  const { data: books = [] } = useBooksQuery();
  const {
    snapshot,
    isInLibrary,
    isFavorite,
    getProgress,
    handleToggleLibrary,
    handleToggleFavorite,
    handleDownloadBook,
    createCollection,
    deleteCollection,
    toggleBookInCollection,
  } = usePersonalLibrary();

  const [activeTab, setActiveTab] = useState<LibraryTab>('all');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [manageBooksCollectionId, setManageBooksCollectionId] = useState<string | null>(null);
  const [previewBook, setPreviewBook] = useState<Book | null>(null);

  const booksById = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);

  const displayedBooks = useMemo(() => {
    if (selectedCollectionId) {
      const col = snapshot.collections.find((c) => c.id === selectedCollectionId);
      if (!col) return [];
      return col.book_ids
        .map((id) => booksById.get(id))
        .filter((b): b is Book => Boolean(b));
    }

    const resolveIds = (ids: string[]) =>
      Array.from(new Set(ids))
        .map((id) => booksById.get(id))
        .filter((b): b is Book => Boolean(b));

    switch (activeTab) {
      case 'all':
        return resolveIds([
          ...snapshot.library.map((i) => i.book_id),
          ...snapshot.progress.map((p) => p.book_id),
        ]);
      case 'reading':
        return resolveIds(
          snapshot.progress
            .filter((p) => p.progress_percent > 0 && p.progress_percent < 100)
            .map((p) => p.book_id)
        );
      case 'favorites':
        return resolveIds(snapshot.favorites.map((f) => f.book_id));
      case 'pending':
        return resolveIds(
          snapshot.library
            .filter((i) => i.status === 'pending')
            .map((i) => i.book_id)
        );
      case 'completed':
        return resolveIds([
          ...snapshot.progress.filter((p) => p.progress_percent >= 100).map((p) => p.book_id),
          ...snapshot.library.filter((i) => i.status === 'completed').map((i) => i.book_id),
        ]);
      case 'downloads':
        return resolveIds(snapshot.downloads.map((d) => d.book_id));
    }
  }, [activeTab, booksById, selectedCollectionId, snapshot]);

  const activeCollection = snapshot.collections.find((c) => c.id === selectedCollectionId);
  const manageBooksCollection =
    snapshot.collections.find((c) => c.id === manageBooksCollectionId) ?? null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark">
            Espacio personal
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-navy tracking-tight">
            Mi biblioteca
          </h1>
          <p className="text-sm text-ink-muted">
            Tus libros guardados, lecturas en curso y colecciones personalizadas sincronizadas.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={() => setCollectionModalOpen(true)}>
          <FolderPlus className="h-4 w-4" />
          Nueva colección
        </Button>
      </div>

      {/* Custom Collections Strip */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-subtle">
            Colecciones personalizadas
          </h2>
          {selectedCollectionId && (
            <button
              type="button"
              onClick={() => setSelectedCollectionId(null)}
              className="text-xs font-medium text-navy hover:text-gold-dark underline underline-offset-2"
            >
              Ver todas las secciones
            </button>
          )}
        </div>

        {snapshot.collections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong bg-surface-secondary/40 px-5 py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
            <span>
              Crea colecciones como <strong>Derecho Procesal Penal</strong>,{' '}
              <strong>Exámenes</strong> o <strong>Jurisprudencia</strong> para organizar tus
              lecturas.
            </span>
            <Button variant="secondary" size="sm" onClick={() => setCollectionModalOpen(true)}>
              Crear primera colección
            </Button>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {snapshot.collections.map((col) => {
              const selected = selectedCollectionId === col.id;
              return (
                <div
                  key={col.id}
                  className={cn(
                    'group shrink-0 min-w-[200px] max-w-[250px] rounded-xl border p-3.5 transition-all flex items-start justify-between gap-2',
                    selected
                      ? 'border-navy bg-navy text-white'
                      : 'border-line bg-white hover:border-line-strong hover:bg-surface-secondary/50'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedCollectionId(selected ? null : col.id)}
                    className="flex-1 min-w-0 text-left space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: selected ? '#C5A15B' : col.color }}
                      />
                      <span className="text-sm font-semibold truncate">{col.name}</span>
                    </div>
                    <p
                      className={cn(
                        'text-xs truncate',
                        selected ? 'text-slate-300' : 'text-ink-muted'
                      )}
                    >
                      {col.book_ids.length} {col.book_ids.length === 1 ? 'recurso' : 'recursos'}
                    </p>
                  </button>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setManageBooksCollectionId(col.id)}
                      aria-label={`Agregar libros a ${col.name}`}
                      title="Agregar libros a esta colección"
                      className={cn(
                        'p-1 rounded-md opacity-75 hover:opacity-100 transition-opacity',
                        selected
                          ? 'hover:bg-white/10 text-gold'
                          : 'hover:bg-gold-soft/70 text-gold-dark hover:text-navy'
                      )}
                    >
                      <BookPlus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (selected) setSelectedCollectionId(null);
                        void deleteCollection(col.id);
                      }}
                      aria-label={`Eliminar colección ${col.name}`}
                      className={cn(
                        'p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity',
                        selected ? 'hover:bg-white/10 text-white' : 'hover:bg-red-50 text-red-600'
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Tabs */}
      {!selectedCollectionId ? (
        <div
          role="tablist"
          aria-label="Secciones de mi biblioteca"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-line pb-3"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors',
                activeTab === tab.id
                  ? 'bg-navy text-white'
                  : 'bg-surface-secondary text-ink-muted hover:text-navy hover:bg-surface-tertiary'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
          <div className="flex items-center gap-2.5 min-w-0">
            <FolderOpen className="h-5 w-5 text-gold-dark shrink-0" />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-navy truncate">{activeCollection?.name}</h2>
              {activeCollection?.description && (
                <p className="text-xs text-ink-muted">{activeCollection.description}</p>
              )}
            </div>
          </div>
          {activeCollection && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setManageBooksCollectionId(activeCollection.id)}
            >
              <BookPlus className="h-4 w-4" />
              Agregar libros
            </Button>
          )}
        </div>
      )}

      {/* Books Grid */}
      <AnimatePresence mode="wait" initial={false}>
        {displayedBooks.length === 0 ? (
          <m.div
            key={`empty-${selectedCollectionId ?? activeTab}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASE_EDITORIAL }}
            className="flex flex-col items-center justify-center text-center py-12 sm:py-16 px-6 rounded-3xl border border-line bg-white shadow-subtle"
          >
            <LexNotFoundMascot className="mb-3" />
            <h2 className="font-editorial text-xl sm:text-2xl font-semibold text-navy">
              {selectedCollectionId
                ? 'Esta colección aún no tiene recursos'
                : 'Todavía no hay recursos en esta sección'}
            </h2>
            <p className="text-sm text-ink-muted max-w-md mt-1.5 leading-relaxed">
              Explora el catálogo y añade libros a tu biblioteca, favoritos o colecciones
              personalizadas.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {activeCollection && (
                <Button
                  variant="primary"
                  onClick={() => setManageBooksCollectionId(activeCollection.id)}
                >
                  <BookPlus className="h-4 w-4" />
                  Agregar libros
                </Button>
              )}
              <Link to="/explorar">
                <Button variant={activeCollection ? 'secondary' : 'primary'}>
                  Explorar catálogo
                </Button>
              </Link>
            </div>
          </m.div>
        ) : (
          <m.div
            key={`grid-${selectedCollectionId ?? activeTab}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: EASE_EDITORIAL }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-8"
          >
            {displayedBooks.map((book, idx) => (
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
        )}
      </AnimatePresence>

      <CollectionModal
        open={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        onCreate={createCollection}
      />

      <CollectionAddBooksModal
        collection={manageBooksCollection}
        onClose={() => setManageBooksCollectionId(null)}
        books={books}
        onToggleBook={toggleBookInCollection}
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
