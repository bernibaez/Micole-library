import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Compass, Sparkles } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useBooksQuery, usePersonalLibrary } from './useLibraryData';
import { BookCard } from '../books/BookCard';
import { QuickPreviewModal } from '../books/QuickPreviewModal';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/feedback/EmptyState';
import { formatRelativeDate } from '../../utils/format';
import type { Book } from '../../types';

export function RecentDocumentsPage() {
  const { isAuthenticated } = useAuth();
  const { data: books = [] } = useBooksQuery();
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

  const recentlyViewed = useMemo(() => {
    const byId = new Map(books.map((b) => [b.id, b]));
    return snapshot.recents
      .map((rec) => ({ rec, book: byId.get(rec.document_id) }))
      .filter((item): item is { rec: typeof item.rec; book: Book } => Boolean(item.book));
  }, [books, snapshot.recents]);

  const newlyAdded = useMemo(() => {
    return [...books]
      .sort((a, b) => {
        const dateA = new Date(a.added_at ?? a.created_at ?? 0).getTime();
        const dateB = new Date(b.added_at ?? b.created_at ?? 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 12);
  }, [books]);

  return (
    <div className="space-y-10">
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark">
          Actividad y novedades
        </p>
        <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-navy tracking-tight">
          Documentos recientes
        </h1>
        <p className="text-sm text-ink-muted">
          Retoma los textos que consultaste recientemente y descubre las últimas incorporaciones al
          catálogo jurídico.
        </p>
        {!isAuthenticated && (
          <p className="text-xs text-ink-muted bg-surface-secondary border border-line rounded-xl px-3.5 py-2 inline-flex items-center gap-2 mt-2">
            <Clock className="h-3.5 w-3.5 text-gold-dark shrink-0" />
            Tu historial reciente se guarda en este navegador.{' '}
            <Link to="/iniciar-sesion" className="font-medium text-navy underline underline-offset-2">
              Inicia sesión
            </Link>{' '}
            para sincronizarlo entre dispositivos.
          </p>
        )}
      </div>

      {/* Consultados recientemente */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gold-dark" />
          <h2 className="text-lg font-semibold text-navy">Consultados recientemente</h2>
        </div>

        {recentlyViewed.length === 0 ? (
          <EmptyState
            mascot="not-found"
            title="Aún no has consultado documentos"
            description="Cuando abras la ficha o el lector de un documento, aparecerá aquí para retomarlo rápidamente."
            action={
              <Link to="/explorar">
                <Button variant="primary" className="rounded-full">
                  <Compass className="h-4 w-4" />
                  Explorar catálogo
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-8">
            {recentlyViewed.map(({ book, rec }, idx) => (
              <div key={book.id} className="space-y-1">
                <BookCard
                  book={book}
                  index={idx}
                  inLibrary={isInLibrary(book.id)}
                  isFavorite={isFavorite(book.id)}
                  progress={getProgress(book.id)}
                  onToggleLibrary={handleToggleLibrary}
                  onToggleFavorite={handleToggleFavorite}
                  onPreview={setPreviewBook}
                />
                <p className="text-[11px] text-ink-subtle">
                  Visto {formatRelativeDate(rec.last_viewed_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Últimas incorporaciones al catálogo */}
      {newlyAdded.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-line">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold-dark" />
              <h2 className="text-lg font-semibold text-navy">Últimas incorporaciones</h2>
            </div>
            <Link
              to="/explorar?orden=recent"
              className="text-xs sm:text-sm font-medium text-navy hover:text-gold-dark"
            >
              Ver catálogo completo
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-8">
            {newlyAdded.map((book, idx) => (
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
          </div>
        </section>
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
