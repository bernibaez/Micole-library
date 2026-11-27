import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Document, Page } from 'react-pdf';
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Heart,
  X,
} from 'lucide-react';
import type { Book } from '../../types';
import { ensurePdfWorker } from '../reader/pdfWorker';
import { useAuth } from '../auth/AuthContext';
import { resolveDocumentSource, type ResolvedDocumentSource } from '../../services/booksService';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { Modal } from '../../components/ui/Modal';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { DownloadActionButton } from '../../components/ui/DownloadActionButton';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { BookCover } from './BookCover';
import { getBookAvailability, getDocumentTypeLabel, isPdfDocument } from '../../utils/format';

ensurePdfWorker();

interface QuickPreviewModalProps {
  book: Book | null;
  onClose: () => void;
  inLibrary?: boolean;
  isFavorite?: boolean;
  onToggleLibrary?: (bookId: string) => void;
  onToggleFavorite?: (bookId: string) => void;
  onDownload?: (book: Book) => Promise<void> | void;
}

const MAX_PREVIEW_PAGES = 3;

export function QuickPreviewModal({
  book,
  onClose,
  inLibrary = false,
  isFavorite = false,
  onToggleLibrary,
  onToggleFavorite,
  onDownload,
}: QuickPreviewModalProps) {
  const { isAuthenticated } = useAuth();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [pdfState, setPdfState] = useState<{
    bookId: string | null;
    source: ResolvedDocumentSource;
  }>({
    bookId: null,
    source: null,
  });
  const [numPages, setNumPages] = useState<number>(0);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [pdfError, setPdfError] = useState(false);

  const activeSource = book && pdfState.bookId === book.id ? pdfState.source : null;
  const pdfFileInput =
    activeSource && book && isPdfDocument(book.mime_type, book.file_extension)
      ? activeSource.kind === 'proxy'
        ? { url: activeSource.url, httpHeaders: activeSource.httpHeaders }
        : activeSource.url
      : null;

  useEffect(() => {
    let mounted = true;
    if (!book || book.allow_preview === false) return;

    resolveDocumentSource(book, 'view').then((source) => {
      if (!mounted) return;
      setPreviewPage(1);
      setNumPages(0);
      setPdfError(false);
      setPdfState({ bookId: book.id, source });
    });

    return () => {
      mounted = false;
    };
  }, [book]);

  const maxAllowed = numPages > 0 ? Math.min(numPages, MAX_PREVIEW_PAGES) : MAX_PREVIEW_PAGES;
  const availability = book ? getBookAvailability(book, isAuthenticated) : null;

  const content = book && availability ? (
    <div className="grid grid-cols-1 md:grid-cols-[270px_minmax(0,1fr)] min-h-[420px]">
      {/* Summary column */}
      <div className="p-5 sm:p-6 bg-surface-secondary/60 border-b md:border-b-0 md:border-r border-line flex flex-col justify-between gap-5">
        <div className="space-y-4">
          <div className="flex md:flex-col gap-4 items-start">
            <div className="w-24 md:w-36 shrink-0 md:mx-auto">
              <BookCover book={book} />
            </div>
            <div className="min-w-0 space-y-1.5 md:text-center md:w-full">
              <div className="flex flex-wrap md:justify-center gap-1.5">
                <Badge variant="gold">{getDocumentTypeLabel(book.document_type)}</Badge>
                {book.year && <Badge variant="outline">{book.year}</Badge>}
              </div>
              <h3 className="font-editorial text-lg font-semibold text-navy leading-snug">
                {book.title}
              </h3>
              <p className="text-xs text-ink-muted">{book.author}</p>
            </div>
          </div>

          <p className="text-xs text-ink-muted leading-relaxed line-clamp-4">
            {book.description?.trim() || 'Sin descripción registrada.'}
          </p>

          <dl className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-line text-xs">
            <div>
              <dt className="text-ink-subtle">Editorial</dt>
              <dd className="font-medium text-navy truncate">
                {book.publisher || 'No especificada'}
              </dd>
            </div>
            <div>
              <dt className="text-ink-subtle">Año</dt>
              <dd className="font-medium text-navy">{book.year ?? 'No especificado'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-ink-subtle">Disponibilidad</dt>
              <dd className="font-medium text-navy flex items-center gap-1.5 mt-0.5">
                <span
                  className={
                    availability.status === 'available'
                      ? 'h-2 w-2 rounded-full bg-emerald-500 shrink-0'
                      : availability.status === 'login_required'
                        ? 'h-2 w-2 rounded-full bg-amber-500 shrink-0'
                        : 'h-2 w-2 rounded-full bg-ink-subtle shrink-0'
                  }
                />
                <span className="truncate">{availability.label}</span>
              </dd>
            </div>
            <div>
              <dt className="text-ink-subtle">Categoría</dt>
              <dd className="font-medium text-navy truncate">{book.category}</dd>
            </div>
            <div>
              <dt className="text-ink-subtle">Formato</dt>
              <dd className="font-medium text-navy">{book.size_label || 'PDF'}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-2">
          {availability.canRead && (
            <Link to={`/leer/${book.id}`} onClick={onClose} className="block">
              <Button variant="primary" className="w-full">
                <BookOpen className="h-4 w-4" />
                Leer documento completo
              </Button>
            </Link>
          )}
          <div className="grid grid-cols-2 gap-2">
            {onDownload && availability.canDownload && (
              <DownloadActionButton
                variant="secondary"
                size="sm"
                idleLabel="Descargar"
                successLabel="Listo"
                onDownload={() => onDownload(book)}
              />
            )}
            <Link
              to={`/libro/${book.id}`}
              onClick={onClose}
              className={!onDownload || !availability.canDownload ? 'col-span-2 block' : 'block'}
            >
              <Button variant="secondary" size="sm" className="w-full">
                Ver ficha detallada
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {onToggleLibrary && (
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 border border-line"
                onClick={() => onToggleLibrary(book.id)}
              >
                <Bookmark className="h-3.5 w-3.5" fill={inLibrary ? 'currentColor' : 'none'} />
                {inLibrary ? 'En biblioteca' : 'Biblioteca'}
              </Button>
            )}
            {onToggleFavorite && (
              <Button
                variant="ghost"
                size="icon"
                className="border border-line h-9 w-9"
                aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                onClick={() => onToggleFavorite(book.id)}
              >
                <Heart
                  className="h-4 w-4"
                  fill={isFavorite ? '#DC2626' : 'none'}
                  color={isFavorite ? '#DC2626' : 'currentColor'}
                />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* PDF First-Pages Preview column */}
      <div className="flex flex-col bg-surface-secondary/30 min-h-[360px]">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-line bg-white">
          <div className="text-xs font-medium text-ink-muted">
            Vista previa rápida · Página {previewPage} de {maxAllowed}
            {numPages > MAX_PREVIEW_PAGES ? ` (documento de ${numPages} págs.)` : ''}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={previewPage <= 1}
              onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
              aria-label="Página anterior de vista previa"
              className="h-8 w-8 rounded-lg border border-line inline-flex items-center justify-center text-navy disabled:opacity-40 hover:bg-surface-secondary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={previewPage >= maxAllowed}
              onClick={() => setPreviewPage((p) => Math.min(maxAllowed, p + 1))}
              aria-label="Página siguiente de vista previa"
              className="h-8 w-8 rounded-lg border border-line inline-flex items-center justify-center text-navy disabled:opacity-40 hover:bg-surface-secondary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {!isMobile && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar vista previa"
                className="ml-1 h-8 w-8 rounded-lg inline-flex items-center justify-center text-ink-muted hover:text-navy hover:bg-surface-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-start justify-center">
          {!pdfFileInput || pdfError ? (
            <div className="my-auto text-center max-w-xs space-y-2 py-10">
              <p className="text-sm font-medium text-navy">Vista previa PDF no disponible</p>
              <p className="text-xs text-ink-muted">
                Puedes consultar la ficha bibliográfica, descargar el archivo o abrir el visor
                completo.
              </p>
            </div>
          ) : (
            <Document
              file={pdfFileInput}
              onLoadSuccess={({ numPages: total }) => setNumPages(total)}
              onLoadError={() => setPdfError(true)}
              loading={
                <div className="w-[320px] sm:w-[440px] space-y-3">
                  <Skeleton className="h-[520px] w-full rounded-lg" />
                </div>
              }
            >
              <div className="rounded-lg overflow-hidden shadow-cover border border-line bg-white">
                <Page
                  pageNumber={previewPage}
                  width={isMobile ? Math.min(340, window.innerWidth - 48) : 460}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </div>
            </Document>
          )}
        </div>
      </div>
    </div>
  ) : null;

  if (isMobile) {
    return (
      <BottomSheet open={Boolean(book)} onClose={onClose} title="Vista previa del recurso">
        {content}
      </BottomSheet>
    );
  }

  return (
    <Modal open={Boolean(book)} onClose={onClose} size="xl" hideHeader title={book?.title}>
      {content}
    </Modal>
  );
}
