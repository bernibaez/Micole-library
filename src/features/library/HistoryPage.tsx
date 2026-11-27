import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { m } from 'motion/react';
import { BookOpen, History } from 'lucide-react';
import { useBooksQuery, usePersonalLibrary } from './useLibraryData';
import { BookCover } from '../books/BookCover';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/feedback/EmptyState';
import { formatRelativeDate } from '../../utils/format';
import {
  STAGGER_CONTAINER_VARIANTS,
  STAGGER_ITEM_VARIANTS,
  VIEWPORT_ONCE,
} from '../../utils/motion';
import type { Book } from '../../types';

export function HistoryPage() {
  const { data: books = [] } = useBooksQuery();
  const { snapshot, getProgress } = usePersonalLibrary();

  const entries = useMemo(() => {
    const byId = new Map(books.map((b) => [b.id, b]));
    return snapshot.history
      .map((item) => ({ item, book: byId.get(item.book_id) }))
      .filter((entry): entry is { item: typeof entry.item; book: Book } => Boolean(entry.book));
  }, [books, snapshot.history]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark">
          Actividad de estudio
        </p>
        <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-navy tracking-tight">
          Historial de lectura
        </h1>
        <p className="text-sm text-ink-muted">
          Documentos abiertos recientemente con acceso directo a tu última página.
        </p>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={<History className="h-5 w-5" />}
          title="Tu historial está vacío"
          description="Cuando abras un documento en el lector PDF de MICOLE LIBRARY, aparecerá registrado aquí."
          action={
            <Link to="/explorar">
              <Button variant="primary">Explorar catálogo</Button>
            </Link>
          }
        />
      ) : (
        <m.div
          variants={STAGGER_CONTAINER_VARIANTS}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          className="rounded-2xl border border-line bg-white divide-y divide-line"
        >
          {entries.map(({ item, book }) => {
            const progress = getProgress(book.id);
            return (
              <m.div
                key={item.id}
                variants={STAGGER_ITEM_VARIANTS}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-surface-secondary/40 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <Link to={`/libro/${book.id}`} className="w-14 shrink-0">
                    <BookCover book={book} size="sm" progressPercent={progress?.progress_percent} />
                  </Link>
                  <div className="min-w-0 space-y-1">
                    <Link
                      to={`/libro/${book.id}`}
                      className="block text-sm sm:text-base font-semibold text-navy hover:text-navy-secondary truncate"
                    >
                      {book.title}
                    </Link>
                    <p className="text-xs text-ink-muted truncate">{book.author}</p>
                    <p className="text-[11px] text-ink-subtle">
                      Abierto {formatRelativeDate(item.opened_at)}
                      {progress ? ` · Página ${progress.current_page}` : ''}
                    </p>
                  </div>
                </div>
                <Link to={`/leer/${book.id}`} className="shrink-0">
                  <Button variant="secondary" size="sm">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Continuar</span>
                  </Button>
                </Link>
              </m.div>
            );
          })}
        </m.div>
      )}
    </div>
  );
}
