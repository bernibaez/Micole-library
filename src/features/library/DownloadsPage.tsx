import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, m } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { useBooksQuery, usePersonalLibrary } from './useLibraryData';
import { BookCover } from '../books/BookCover';
import { Button } from '../../components/ui/Button';
import { DownloadActionButton } from '../../components/ui/DownloadActionButton';
import { LexNotFoundMascot } from '../../components/mascot/LexNotFoundMascot';
import { formatRelativeDate } from '../../utils/format';
import { EASE_EDITORIAL } from '../../utils/motion';
import type { Book } from '../../types';

export function DownloadsPage() {
  const { data: books = [] } = useBooksQuery();
  const { snapshot, handleDownloadBook, deleteDownload, clearDownloads } = usePersonalLibrary();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  const entries = useMemo(() => {
    const byId = new Map(books.map((b) => [b.id, b]));
    return snapshot.downloads
      .map((item) => ({ item, book: byId.get(item.book_id) }))
      .filter((entry): entry is { item: typeof entry.item; book: Book } => Boolean(entry.book));
  }, [books, snapshot.downloads]);

  const handleRemoveOne = async (downloadId: string) => {
    setRemovingId(downloadId);
    try {
      await deleteDownload(downloadId);
    } finally {
      setRemovingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('¿Eliminar todo el historial de descargas?')) return;
    setClearingAll(true);
    try {
      await clearDownloads();
    } finally {
      setClearingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark">
            Archivos descargados
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-navy tracking-tight">
            Descargas
          </h1>
          <p className="text-sm text-ink-muted">
            Registro de los documentos PDF que has descargado desde tu cuenta.
          </p>
        </div>

        {entries.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            loading={clearingAll}
            onClick={() => void handleClearAll()}
            className="self-start sm:self-auto text-red-700 hover:bg-red-50 hover:border-red-200 hover:text-red-800"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Limpiar historial
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {entries.length === 0 ? (
          <m.div
            key="empty-downloads"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.24, ease: EASE_EDITORIAL }}
            className="flex flex-col items-center justify-center text-center py-12 sm:py-16 px-6 rounded-3xl border border-line bg-white shadow-subtle"
          >
            <LexNotFoundMascot className="mb-3" />
            <h2 className="font-editorial text-xl sm:text-2xl font-semibold text-navy">
              Todavía no tienes descargas registradas
            </h2>
            <p className="text-sm text-ink-muted max-w-md mt-1.5 leading-relaxed">
              Los PDFs que descargues desde la biblioteca aparecerán listados aquí para volver a
              obtenerlos cuando quieras.
            </p>
            <div className="mt-5">
              <Link to="/explorar">
                <Button variant="primary">Explorar catálogo</Button>
              </Link>
            </div>
          </m.div>
        ) : (
          <m.div
            key="downloads-list"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASE_EDITORIAL }}
            className="rounded-2xl border border-line bg-white divide-y divide-line overflow-hidden"
          >
            <AnimatePresence initial={false}>
              {entries.map(({ item, book }) => (
                <m.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16, height: 0, paddingTop: 0, paddingBottom: 0 }}
                  transition={{ duration: 0.22, ease: EASE_EDITORIAL }}
                  className="p-4 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 hover:bg-surface-secondary/40 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <Link to={`/libro/${book.id}`} className="w-14 shrink-0">
                      <BookCover book={book} size="sm" />
                    </Link>
                    <div className="min-w-0 space-y-1">
                      <Link
                        to={`/libro/${book.id}`}
                        className="block text-sm sm:text-base font-semibold text-navy hover:text-navy-secondary truncate"
                      >
                        {book.title}
                      </Link>
                      <p className="text-xs text-ink-muted truncate">
                        {book.author} · {book.size_label}
                      </p>
                      <p className="text-[11px] text-ink-subtle">
                        Descargado {formatRelativeDate(item.downloaded_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <DownloadActionButton
                      variant="secondary"
                      size="sm"
                      idleLabel="Descargar de nuevo"
                      successLabel="Descargado"
                      compactLabelOnMobile
                      className="shrink-0"
                      onDownload={() => handleDownloadBook(book)}
                    />
                    <button
                      type="button"
                      disabled={removingId === item.id}
                      onClick={() => void handleRemoveOne(item.id)}
                      aria-label={`Eliminar descarga de ${book.title}`}
                      title="Eliminar descarga"
                      className="h-9 w-9 rounded-xl border border-line bg-white text-ink-muted hover:text-red-600 hover:bg-red-50 hover:border-red-200 active:scale-95 disabled:opacity-50 inline-flex items-center justify-center transition-all shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </m.div>
              ))}
            </AnimatePresence>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
