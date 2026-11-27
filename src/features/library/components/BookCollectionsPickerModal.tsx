import { useState } from 'react';
import { Check, FolderPlus } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { CollectionIcon } from './CollectionIcon';
import { cn } from '../../../utils/cn';
import type { Book, UserCollection } from '../../../types';

interface BookCollectionsPickerModalProps {
  book: Book | null;
  collections: UserCollection[];
  onClose: () => void;
  onToggleBookInCollection: (params: {
    collectionId: string;
    bookId: string;
    inCollection: boolean;
  }) => Promise<unknown>;
  onCreateNewCollection: () => void;
}

export function BookCollectionsPickerModal({
  book,
  collections,
  onClose,
  onToggleBookInCollection,
  onCreateNewCollection,
}: BookCollectionsPickerModalProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!book) return null;

  const handleToggle = async (col: UserCollection) => {
    const inCollection = col.book_ids.includes(book.id);
    setBusyId(col.id);
    try {
      await onToggleBookInCollection({
        collectionId: col.id,
        bookId: book.id,
        inCollection,
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal
      open={Boolean(book)}
      onClose={onClose}
      size="sm"
      title="Añadir a una colección"
      description={book.title}
    >
      <div className="p-5 space-y-4">
        {collections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D8D4C9] bg-[#F6F5F1]/60 p-5 text-center space-y-2.5">
            <p className="text-sm font-semibold text-[#111E32]">Aún no tienes colecciones</p>
            <p className="text-xs text-[#667085]">
              Crea tu primera colección para organizar este documento por asignatura o caso.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="rounded-full bg-[#111E32]"
              onClick={() => {
                onClose();
                onCreateNewCollection();
              }}
            >
              <FolderPlus className="h-3.5 w-3.5 text-[#E5C784]" />
              Crear colección
            </Button>
          </div>
        ) : (
          <ul className="space-y-2 max-h-[50vh] overflow-y-auto pr-0.5">
            {collections.map((col) => {
              const included = col.book_ids.includes(book.id);
              const isBusy = busyId === col.id;
              return (
                <li key={col.id}>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleToggle(col)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors disabled:opacity-60',
                      included
                        ? 'border-[#111E32]/40 bg-[#111E32]/[0.04]'
                        : 'border-[#E5E3DD] bg-white hover:bg-[#F6F5F1]'
                    )}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span
                        className="h-8 w-8 rounded-lg text-white inline-flex items-center justify-center shrink-0"
                        style={{ backgroundColor: col.color || '#111E32' }}
                        aria-hidden="true"
                      >
                        <CollectionIcon iconId={col.icon} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#111E32] truncate">
                          {col.name}
                        </span>
                        <span className="block text-[11px] text-[#667085] tabular-nums">
                          {col.book_ids.length}{' '}
                          {col.book_ids.length === 1 ? 'documento' : 'documentos'}
                        </span>
                      </span>
                    </span>

                    <span
                      className={cn(
                        'h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                        included
                          ? 'bg-[#111E32] border-[#111E32] text-[#E5C784]'
                          : 'border-[#D5D1C7] bg-white'
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

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#E5E3DD]">
          {collections.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onCreateNewCollection();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9A7D43] hover:text-[#111E32] transition-colors"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              Nueva colección
            </button>
          ) : (
            <span />
          )}
          <Button variant="primary" size="sm" onClick={onClose} className="rounded-full px-5">
            Listo
          </Button>
        </div>
      </div>
    </Modal>
  );
}
