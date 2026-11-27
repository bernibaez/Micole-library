import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useBooksQuery, usePersonalLibrary } from './useLibraryData';
import { BookCard } from '../books/BookCard';
import { QuickPreviewModal } from '../books/QuickPreviewModal';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/feedback/EmptyState';
import type { Book } from '../../types';

export function FavoritesPage() {
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

  const favoriteBooks = useMemo(() => {
    const byId = new Map(books.map((b) => [b.id, b]));
    return snapshot.favorites
      .map((f) => byId.get(f.book_id))
      .filter((b): b is Book => Boolean(b));
  }, [books, snapshot.favorites]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark">
          Selección personal
        </p>
        <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-navy tracking-tight">
          Favoritos
        </h1>
        <p className="text-sm text-ink-muted">
          Tus documentos jurídicos de referencia rápida.
        </p>
        {!isAuthenticated && (
          <p className="text-xs text-ink-muted bg-surface-secondary border border-line rounded-xl px-3.5 py-2 inline-flex items-center gap-2 mt-2">
            <Heart className="h-3.5 w-3.5 text-gold-dark shrink-0" />
            Guardados localmente en este navegador.{' '}
            <Link to="/iniciar-sesion" className="font-medium text-navy underline underline-offset-2">
              Inicia sesión
            </Link>{' '}
            para sincronizar tus favoritos en la nube.
          </p>
        )}
      </div>

      {favoriteBooks.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-5 w-5" />}
          title="Aún no tienes libros favoritos"
          description="Pulsa el corazón sobre cualquier libro del catálogo o en su página de detalles para tenerlo siempre a mano."
          action={
            <Link to="/explorar">
              <Button variant="primary">Descubrir recursos</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-8">
          {favoriteBooks.map((book, idx) => (
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
