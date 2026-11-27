import { useMemo, useState } from 'react';
import { BookOpen, Check, FolderOpen, Search, X } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { getDocumentTypeLabel, normalizeText } from '../../utils/format';
import { cn } from '../../utils/cn';
import type { Book, UserCollection } from '../../types';

interface CollectionAddBooksModalProps {
  collection: UserCollection | null;
  onClose: () => void;
  books: Book[];
  onToggleBook: (params: {
    collectionId: string;
    bookId: string;
    inCollection: boolean;
  }) => Promise<unknown>;
}

type CollectionFilter = 'all' | 'available' | 'included';

function CollectionAddBooksContent({
  collection,
  onClose,
  books,
  onToggleBook,
}: Omit<CollectionAddBooksModalProps, 'collection'> & { collection: UserCollection }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CollectionFilter>('all');
  const [busyBookId, setBusyBookId] = useState<string | null>(null);

  const includedSet = useMemo(() => new Set(collection.book_ids), [collection.book_ids]);

  const filteredBooks = useMemo(() => {
    const q = normalizeText(search);
    return books.filter((b) => {
      const included = includedSet.has(b.id);
      if (filter === 'included' && !included) return false;
      if (filter === 'available' && included) return false;
      if (!q) return true;
      const hay = normalizeText([b.title, b.author, b.category, b.subject ?? ''].join(' '));
      return hay.includes(q);
    });
  }, [books, filter, includedSet, search]);

  const handleToggle = async (bookId: string) => {
    setBusyBookId(bookId);
    try {
      await onToggleBook({
        collectionId: collection.id,
        bookId,
        inCollection: includedSet.has(bookId),
      });
    } finally {
      setBusyBookId(null);
    }
  };

  return (
    <div className="flex flex-col max-h-[75vh]">
      <div className="px-6 pt-4 pb-3 space-y-3 border-b border-line">
        <div className="flex items-center gap-2 h-10 rounded-xl border border-line-strong bg-white px-3 focus-within:border-navy">
          <Search className="h-4 w-4 text-ink-muted shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, autor o categoría..."
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

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: `Todos (${books.length})` },
              { id: 'available', label: `Disponibles (${books.length - includedSet.size})` },
              { id: 'included', label: `En esta colección (${includedSet.size})` },
            ] as const
          ).map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setFilter(pill.id)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                filter === pill.id
                  ? 'bg-navy text-white'
                  : 'bg-surface-secondary text-ink-muted hover:text-navy hover:bg-surface-tertiary'
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-3">
        {filteredBooks.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <BookOpen className="h-7 w-7 text-ink-subtle mx-auto" />
            <p className="text-sm font-semibold text-navy">No se encontraron libros</p>
            <p className="text-xs text-ink-muted">
              Intenta con otro término de búsqueda o cambia el filtro.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredBooks.map((book) => {
              const included = includedSet.has(book.id);
              const isBusy = busyBookId === book.id;
              return (
                <li key={book.id}>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleToggle(book.id)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors disabled:opacity-60',
                      included
                        ? 'border-navy/40 bg-navy/[0.04]'
                        : 'border-line bg-white hover:bg-surface-secondary/50'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className="h-9 w-6 rounded-[4px] shrink-0 border border-black/10"
                        style={{ backgroundColor: book.color || '#101D35' }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-navy truncate">{book.title}</p>
                        <p className="text-xs text-ink-muted truncate">
                          {book.author} · {book.category} · {getDocumentTypeLabel(book.document_type)}
                        </p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        'h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                        included
                          ? 'bg-navy border-navy text-white'
                          : 'border-line-strong bg-white'
                      )}
                    >
                      {included && <Check className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="px-6 py-3.5 border-t border-line bg-surface-secondary/40 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
          <FolderOpen className="h-3.5 w-3.5 text-gold-dark" />
          <strong className="text-navy">{includedSet.size}</strong>{' '}
          {includedSet.size === 1 ? 'libro en' : 'libros en'} {collection.name}
        </span>
        <Button variant="primary" size="sm" onClick={onClose}>
          Listo
        </Button>
      </div>
    </div>
  );
}

export function CollectionAddBooksModal({
  collection,
  onClose,
  books,
  onToggleBook,
}: CollectionAddBooksModalProps) {
  return (
    <Modal
      open={Boolean(collection)}
      onClose={onClose}
      size="lg"
      title={collection ? `Agregar libros a "${collection.name}"` : 'Agregar libros'}
      description="Marca o desmarca los recursos del catálogo que deseas guardar en esta carpeta personal."
    >
      {collection && (
        <CollectionAddBooksContent
          key={collection.id}
          collection={collection}
          onClose={onClose}
          books={books}
          onToggleBook={onToggleBook}
        />
      )}
    </Modal>
  );
}
