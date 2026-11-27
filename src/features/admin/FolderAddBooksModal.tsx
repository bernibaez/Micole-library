import { useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  Cloud,
  Folder,
  FolderMinus,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { getDocumentTypeLabel, normalizeText } from '../../utils/format';
import { cn } from '../../utils/cn';
import type { Book, CategoryInfo, LibraryFolder } from '../../types';

interface FolderAddBooksModalProps {
  folder: LibraryFolder | null;
  onClose: () => void;
  books: Book[];
  folders: LibraryFolder[];
  categories: CategoryInfo[];
  onAssignBooks: (bookIds: string[], folder: LibraryFolder) => Promise<void>;
  onRemoveBook: (bookId: string) => Promise<void>;
  onCreateNewInFolder: (folder: LibraryFolder) => void;
  onImportDriveInFolder: (folder: LibraryFolder) => void;
}

type FilterMode = 'available' | 'unfiled' | 'in_folder' | 'all';

function FolderAddBooksContent({
  folder,
  onClose,
  books,
  folders,
  categories,
  onAssignBooks,
  onRemoveBook,
  onCreateNewInFolder,
  onImportDriveInFolder,
}: Omit<FolderAddBooksModalProps, 'folder'> & { folder: LibraryFolder }) {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('available');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);
  const categoryName = useMemo(() => {
    if (!folder.category_id) return null;
    return categories.find((c) => c.id === folder.category_id)?.name ?? null;
  }, [categories, folder.category_id]);

  const counts = useMemo(() => {
    let inFolder = 0;
    let unfiled = 0;
    for (const b of books) {
      if (b.folder_id === folder.id) inFolder += 1;
      else if (!b.folder_id) unfiled += 1;
    }
    return {
      all: books.length,
      inFolder,
      available: books.length - inFolder,
      unfiled,
    };
  }, [books, folder.id]);

  const filteredBooks = useMemo(() => {
    const q = normalizeText(search);
    return books.filter((b) => {
      if (filterMode === 'available' && b.folder_id === folder.id) return false;
      if (filterMode === 'unfiled' && Boolean(b.folder_id)) return false;
      if (filterMode === 'in_folder' && b.folder_id !== folder.id) return false;

      if (!q) return true;
      const hay = normalizeText(
        [b.title, b.author, b.category, b.subject ?? '', b.year ? String(b.year) : ''].join(' ')
      );
      return hay.includes(q);
    });
  }, [books, filterMode, folder.id, search]);

  const selectableVisibleIds = useMemo(
    () => filteredBooks.filter((b) => b.folder_id !== folder.id).map((b) => b.id),
    [filteredBooks, folder.id]
  );

  const toggleSelect = (bookId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of selectableVisibleIds) next.add(id);
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleConfirmAssign = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setSaving(true);
    try {
      await onAssignBooks(ids, folder);
      setSelectedIds(new Set());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (bookId: string) => {
    setRemovingId(bookId);
    try {
      await onRemoveBook(bookId);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="flex flex-col max-h-[78vh]">
      {/* Contextual Actions Banner */}
      <div className="px-6 py-3.5 bg-sand-soft/60 border-b border-line flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted min-w-0">
          <span className="inline-flex items-center gap-1.5 font-semibold text-navy">
            <Folder className="h-3.5 w-3.5 text-gold-dark shrink-0" />
            <span className="truncate max-w-[200px]">{folder.name}</span>
          </span>
          {categoryName && (
            <Badge variant="gold" className="text-[10px]">
              {categoryName}
            </Badge>
          )}
          <span className="tabular-nums">
            · {counts.inFolder} {counts.inFolder === 1 ? 'libro actual' : 'libros actuales'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              onClose();
              onImportDriveInFolder(folder);
            }}
          >
            <Cloud className="h-3.5 w-3.5" />
            Importar de Drive
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onClose();
              onCreateNewInFolder(folder);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Crear libro aquí
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="px-6 pt-4 pb-3 space-y-3 border-b border-line">
        <div className="flex items-center gap-2 h-10 rounded-xl border border-line-strong bg-white px-3 focus-within:border-navy">
          <Search className="h-4 w-4 text-ink-muted shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar libros existentes por título, autor o categoría..."
            className="w-full min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-subtle focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Limpiar búsqueda"
              className="text-ink-subtle hover:text-navy"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'available', label: `Disponibles (${counts.available})` },
                { id: 'unfiled', label: `Sin carpeta (${counts.unfiled})` },
                { id: 'in_folder', label: `En esta carpeta (${counts.inFolder})` },
                { id: 'all', label: `Todos (${counts.all})` },
              ] as const
            ).map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setFilterMode(pill.id)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  filterMode === pill.id
                    ? 'bg-navy text-white'
                    : 'bg-surface-secondary text-ink-muted hover:text-navy hover:bg-surface-tertiary'
                )}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {selectableVisibleIds.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="font-medium text-navy hover:text-gold-dark underline underline-offset-2"
              >
                Seleccionar visibles
              </button>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-ink-muted hover:text-navy"
                >
                  Limpiar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Book List */}
      <div className="flex-1 overflow-y-auto px-6 py-3">
        {filteredBooks.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <BookOpen className="h-7 w-7 text-ink-subtle mx-auto" />
            <p className="text-sm font-semibold text-navy">
              {filterMode === 'in_folder'
                ? 'Esta carpeta aún no tiene libros'
                : 'No hay libros que coincidan con este filtro'}
            </p>
            <p className="text-xs text-ink-muted max-w-sm mx-auto">
              {filterMode === 'in_folder'
                ? 'Selecciona libros en la pestaña "Disponibles" o crea uno nuevo directamente aquí.'
                : 'Prueba limpiando la búsqueda o registra un libro nuevo directamente en esta carpeta.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredBooks.map((book) => {
              const alreadyHere = book.folder_id === folder.id;
              const isSelected = selectedIds.has(book.id);
              const otherFolder =
                book.folder_id && !alreadyHere ? folderById.get(book.folder_id) : null;

              return (
                <li key={book.id}>
                  <div
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition-colors',
                      alreadyHere
                        ? 'border-gold/40 bg-gold-soft/30'
                        : isSelected
                          ? 'border-navy bg-navy/[0.04]'
                          : 'border-line bg-white hover:bg-surface-secondary/50'
                    )}
                  >
                    <button
                      type="button"
                      disabled={alreadyHere}
                      onClick={() => toggleSelect(book.id)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left disabled:cursor-default"
                    >
                      <span
                        className={cn(
                          'h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                          alreadyHere
                            ? 'bg-gold border-gold text-navy'
                            : isSelected
                              ? 'bg-navy border-navy text-white'
                              : 'border-line-strong bg-white'
                        )}
                      >
                        {(alreadyHere || isSelected) && <Check className="h-3.5 w-3.5" />}
                      </span>

                      <span
                        className="h-9 w-6 rounded-[4px] shrink-0 shadow-xs border border-black/10"
                        style={{ backgroundColor: book.color || '#101D35' }}
                        aria-hidden="true"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-navy truncate">{book.title}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
                          <span className="truncate max-w-[180px]">{book.author}</span>
                          {book.year && <span>· {book.year}</span>}
                          <span>· {getDocumentTypeLabel(book.document_type)}</span>
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      {otherFolder && (
                        <span
                          title={`Actualmente en "${otherFolder.name}". Al agregarlo se moverá aquí.`}
                        >
                          <Badge
                            variant="neutral"
                            className="text-[10px] max-w-[140px] truncate"
                          >
                            En: {otherFolder.name}
                          </Badge>
                        </span>
                      )}
                      {alreadyHere && (
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={removingId === book.id}
                          onClick={() => void handleRemove(book.id)}
                          className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <FolderMinus className="h-3.5 w-3.5" />
                          Quitar
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-line bg-surface-secondary/40 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">
          {selectedIds.size > 0 ? (
            <>
              <strong className="text-navy">{selectedIds.size}</strong>{' '}
              {selectedIds.size === 1 ? 'libro seleccionado' : 'libros seleccionados'} para agregar a{' '}
              <strong className="text-navy">{folder.name}</strong>
              {categoryName ? ` (${categoryName})` : ''}.
            </>
          ) : (
            'Marca los libros existentes que deseas incluir en esta carpeta.'
          )}
        </p>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={saving}
            disabled={selectedIds.size === 0}
            onClick={() => void handleConfirmAssign()}
          >
            <Plus className="h-4 w-4" />
            {selectedIds.size > 0
              ? `Agregar ${selectedIds.size} ${selectedIds.size === 1 ? 'libro' : 'libros'}`
              : 'Agregar seleccionados'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FolderAddBooksModal({
  folder,
  onClose,
  books,
  folders,
  categories,
  onAssignBooks,
  onRemoveBook,
  onCreateNewInFolder,
  onImportDriveInFolder,
}: FolderAddBooksModalProps) {
  return (
    <Modal
      open={Boolean(folder)}
      onClose={onClose}
      size="xl"
      title={folder ? `Agregar libros a "${folder.name}"` : 'Agregar libros a la carpeta'}
      description="Asigna libros del catálogo a esta carpeta, crea un registro nuevo o importa directamente desde Google Drive."
    >
      {folder && (
        <FolderAddBooksContent
          key={folder.id}
          folder={folder}
          onClose={onClose}
          books={books}
          folders={folders}
          categories={categories}
          onAssignBooks={onAssignBooks}
          onRemoveBook={onRemoveBook}
          onCreateNewInFolder={onCreateNewInFolder}
          onImportDriveInFolder={onImportDriveInFolder}
        />
      )}
    </Modal>
  );
}
