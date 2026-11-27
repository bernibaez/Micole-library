import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { m } from 'motion/react';
import {
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  Download,
  Eye,
  FolderPlus,
  Headphones,
  Heart,
  Lock,
  Share2,
} from 'lucide-react';
import {
  useBookQuery,
  useBooksQuery,
  useCategoriesQuery,
  useFoldersQuery,
  usePersonalLibrary,
} from '../library/useLibraryData';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/feedback/ToastProvider';
import { BookCover } from './BookCover';
import { BookShelf } from './BookShelf';
import { QuickPreviewModal } from './QuickPreviewModal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { BookDetailSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/feedback/EmptyState';
import {
  formatFullDate,
  getBookAvailability,
  getDocumentTypeLabel,
  getValidityStatusLabel,
} from '../../utils/format';
import {
  DETAIL_COVER_VARIANTS,
  DETAIL_ITEM_VARIANTS,
  DETAIL_STAGGER_VARIANTS,
} from '../../utils/motion';
import { cn } from '../../utils/cn';
import type { Book } from '../../types';

export function BookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { notify } = useToast();
  const { data: book, isLoading } = useBookQuery(id);
  const { data: allBooks = [] } = useBooksQuery();
  const { data: categories = [] } = useCategoriesQuery();
  const { data: folders = [] } = useFoldersQuery();
  const {
    snapshot,
    isInLibrary,
    isFavorite,
    getProgress,
    handleToggleLibrary,
    handleToggleFavorite,
    handleDownloadBook,
    logHistory,
    toggleBookInCollection,
    createCollection,
  } = usePersonalLibrary();

  const loggedViewRef = useRef<string | null>(null);
  useEffect(() => {
    if (!book || loggedViewRef.current === book.id) return;
    loggedViewRef.current = book.id;
    void logHistory(book.id, 1);
  }, [book, logHistory]);

  const [previewTarget, setPreviewTarget] = useState<Book | null>(null);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [downloading, setDownloading] = useState(false);

  const relatedBooks = useMemo(() => {
    if (!book) return [];
    const sameCategory = allBooks.filter((b) => b.id !== book.id && b.category === book.category);
    const others = allBooks.filter((b) => b.id !== book.id && b.category !== book.category);
    return [...sameCategory, ...others].slice(0, 10);
  }, [allBooks, book]);

  if (isLoading) {
    return <BookDetailSkeleton />;
  }

  if (!book) {
    return (
      <EmptyState
        mascot="not-found"
        title="Recurso no encontrado"
        description="El documento que buscas no existe, no está disponible o fue retirado del catálogo."
        action={
          <Link to="/explorar">
            <Button variant="primary" className="rounded-full">
              Volver al catálogo
            </Button>
          </Link>
        }
      />
    );
  }

  const inLib = isInLibrary(book.id);
  const fav = isFavorite(book.id);
  const progress = getProgress(book.id);
  const subcategoryObj = book.subcategory_id
    ? categories.find((c) => c.id === book.subcategory_id)
    : null;
  const folderObj = book.folder_id ? folders.find((f) => f.id === book.folder_id) : null;
  const validityLabel = getValidityStatusLabel(book.validity_status);
  const formatExt = (book.file_extension || 'PDF').toUpperCase();
  const availability = getBookAvailability(book, isAuthenticated);
  const publicationYearLabel = book.publication_date
    ? formatFullDate(book.publication_date)
    : book.year
      ? String(book.year)
      : 'No especificado';

  const bibliographicItems: Array<{ label: string; value: string }> = [
    { label: 'Editorial', value: book.publisher || 'No especificada' },
    { label: 'Año', value: publicationYearLabel },
    ...(book.pages ? [{ label: 'Extensión', value: `${book.pages} páginas` }] : []),
    { label: 'Categoría', value: book.category },
    ...(subcategoryObj ? [{ label: 'Subcategoría', value: subcategoryObj.name }] : []),
    ...(folderObj ? [{ label: 'Carpeta', value: folderObj.name }] : []),
    ...(book.subject ? [{ label: 'Materia', value: book.subject }] : []),
    ...(book.country ? [{ label: 'Jurisdicción', value: book.country }] : []),
    ...(book.court ? [{ label: 'Tribunal', value: book.court }] : []),
    ...(book.judgment_number ? [{ label: 'N.º de sentencia', value: book.judgment_number }] : []),
    { label: 'Formato', value: book.size_label || formatExt },
    ...(book.isbn ? [{ label: 'ISBN', value: book.isbn }] : []),
    ...(book.language ? [{ label: 'Idioma', value: book.language }] : []),
    ...(book.source ? [{ label: 'Fuente', value: book.source }] : []),
    ...(book.added_at
      ? [{ label: 'Incorporado', value: formatFullDate(book.added_at) }]
      : []),
  ];

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: book.title,
          text: `${book.title} — ${book.author} en MICOLE LIBRARY`,
          url: shareUrl,
        });
        return;
      } catch {
        // User canceled native share
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      notify('Enlace copiado al portapapeles');
    } catch {
      notify('No se pudo copiar el enlace.', 'error');
    }
  };

  const handleDirectDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await handleDownloadBook(book);
    } finally {
      setDownloading(false);
    }
  };

  const handleQuickCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    const created = await createCollection({ name: newCollectionName.trim() });
    await toggleBookInCollection({
      collectionId: created.id,
      bookId: book.id,
      inCollection: false,
    });
    setNewCollectionName('');
  };

  return (
    <div className="space-y-10 sm:space-y-12">
      {/* Quiet Editorial Back Link */}
      <div>
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/explorar');
            }
          }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-navy transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Catálogo
        </button>
      </div>

      {/* Main Editorial Hero Split */}
      <section className="grid grid-cols-1 md:grid-cols-[210px_minmax(0,1fr)] lg:grid-cols-[248px_minmax(0,1fr)] gap-8 lg:gap-12 items-start">
        {/* Tactile 3D Vertical Book Cover */}
        <m.div
          variants={DETAIL_COVER_VARIANTS}
          initial="hidden"
          animate="visible"
          className="w-44 sm:w-52 md:w-full mx-auto md:mx-0 space-y-3"
        >
          <div className="group">
            <BookCover
              book={book}
              size="lg"
              progressPercent={progress?.progress_percent}
              className="shadow-editorial-cover"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none mx-4 mt-2 h-2.5 rounded-full bg-navy/15 blur-md opacity-85"
            />
          </div>

          {progress && progress.progress_percent > 0 && (
            <div className="rounded-2xl bg-white border border-line/85 px-3.5 py-2.5 text-xs space-y-1.5 shadow-subtle">
              <div className="flex items-center justify-between text-navy font-semibold tabular-nums">
                <span>Tu progreso</span>
                <span>{Math.round(progress.progress_percent)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-paper-warm overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full"
                  style={{ width: `${Math.min(100, Math.max(4, progress.progress_percent))}%` }}
                />
              </div>
              <p className="text-[11px] text-ink-muted tabular-nums">
                Página {progress.current_page}
                {progress.total_pages ? ` de ${progress.total_pages}` : ''}
              </p>
            </div>
          )}
        </m.div>

        {/* Editorial Details, Simplified Action Bar & Hairline Metadata */}
        <m.div
          variants={DETAIL_STAGGER_VARIANTS}
          initial="hidden"
          animate="visible"
          className="min-w-0 space-y-6"
        >
          {/* Header Block */}
          <m.div variants={DETAIL_ITEM_VARIANTS} className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark">
              <Link
                to={`/explorar?categoria=${encodeURIComponent(book.category)}`}
                className="hover:text-navy transition-colors"
              >
                {book.category}
              </Link>
              <span aria-hidden="true" className="text-line-strong">·</span>
              <span>{getDocumentTypeLabel(book.document_type)}</span>
              {book.year && (
                <>
                  <span aria-hidden="true" className="text-line-strong">·</span>
                  <span className="tabular-nums text-ink-subtle font-medium">{book.year}</span>
                </>
              )}
            </div>

            <h1 className="font-editorial text-3xl sm:text-4xl lg:text-[42px] font-semibold text-navy leading-[1.12] tracking-tight">
              {book.title}
            </h1>

            <p className="text-base text-ink-muted font-medium">
              {book.author}
              {book.publisher ? ` · ${book.publisher}` : ''}
            </p>

            {/* Single Calm Status Indicator */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {availability.status === 'available' ? (
                <Badge variant="forest" className="gap-1.5 px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#C1A15C]" aria-hidden="true" />
                  {validityLabel ? `${validityLabel} · ` : ''}
                  {availability.shortLabel}
                </Badge>
              ) : availability.status === 'login_required' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-0.5 text-[11px] font-semibold text-amber-800">
                  <Lock className="h-3 w-3" />
                  {availability.shortLabel}
                </span>
              ) : (
                <Badge variant="outline">{availability.shortLabel}</Badge>
              )}

              {book.validity_status && book.validity_status !== 'vigente' && validityLabel && (
                <Badge variant="outline">{validityLabel}</Badge>
              )}
            </div>
          </m.div>

          {/* Simplified Single-Row Apple Books Action Bar */}
          <m.div
            variants={DETAIL_ITEM_VARIANTS}
            className="flex flex-wrap items-center gap-2.5 pt-1"
          >
            {availability.canRead && (
              <Link to={`/leer/${book.id}`}>
                <Button variant="primary" size="lg" className="rounded-full px-6">
                  <BookOpen className="h-4 w-4 text-gold" />
                  {progress && progress.current_page > 1 ? 'Continuar lectura' : 'Leer ahora'}
                </Button>
              </Link>
            )}

            {availability.canRead && (
              <Link to={`/leer/${book.id}?audio=1`}>
                <Button variant="gold" size="lg" className="rounded-full px-5">
                  <Headphones className="h-4 w-4" />
                  Escuchar
                </Button>
              </Link>
            )}

            {availability.canRead && (
              <Button
                variant="secondary"
                size="lg"
                className="rounded-full px-5"
                onClick={() => setPreviewTarget(book)}
              >
                <Eye className="h-4 w-4 text-ink-muted" />
                Vista previa
              </Button>
            )}

            {availability.status === 'login_required' && (
              <Link to={`/iniciar-sesion?redirect=${encodeURIComponent(`/libro/${book.id}`)}`}>
                <Button variant="primary" size="lg" className="rounded-full px-6">
                  <Lock className="h-4 w-4 text-gold" />
                  Iniciar sesión para acceder
                </Button>
              </Link>
            )}

            {/* Compact Circular Secondary Actions */}
            <div className="flex items-center gap-2 sm:pl-1">
              <button
                type="button"
                onClick={() => handleToggleLibrary(book.id)}
                aria-label={inLib ? 'Quitar de mi biblioteca' : 'Añadir a mi biblioteca'}
                aria-pressed={inLib}
                title={inLib ? 'En mi biblioteca' : 'Guardar en biblioteca'}
                className={cn(
                  'h-10 w-10 rounded-full border inline-flex items-center justify-center transition-all',
                  inLib
                    ? 'border-navy bg-navy text-gold shadow-subtle'
                    : 'border-line-strong bg-white text-navy hover:bg-paper-warm'
                )}
              >
                <Bookmark className="h-4 w-4" fill={inLib ? 'currentColor' : 'none'} />
              </button>

              <button
                type="button"
                onClick={() => handleToggleFavorite(book.id)}
                aria-label={fav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                aria-pressed={fav}
                title={fav ? 'Favorito' : 'Añadir a favoritos'}
                className={cn(
                  'h-10 w-10 rounded-full border inline-flex items-center justify-center transition-all',
                  fav
                    ? 'border-red-200 bg-red-50 text-red-600'
                    : 'border-line-strong bg-white text-navy hover:bg-paper-warm'
                )}
              >
                <Heart className="h-4 w-4" fill={fav ? 'currentColor' : 'none'} />
              </button>

              {availability.canDownload && (
                <button
                  type="button"
                  disabled={downloading}
                  onClick={() => void handleDirectDownload()}
                  aria-label={`Descargar ${formatExt}`}
                  title={`Descargar ${formatExt}`}
                  className="h-10 w-10 rounded-full border border-line-strong bg-white text-navy hover:bg-paper-warm disabled:opacity-50 inline-flex items-center justify-center transition-all"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}

              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => setCollectionModalOpen(true)}
                  aria-label="Añadir a colección"
                  title="Guardar en colección"
                  className="h-10 w-10 rounded-full border border-line-strong bg-white text-navy hover:bg-paper-warm inline-flex items-center justify-center transition-all"
                >
                  <FolderPlus className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={handleShare}
                aria-label="Compartir enlace del recurso"
                title="Compartir"
                className="h-10 w-10 rounded-full border border-line-strong bg-white text-navy hover:bg-paper-warm inline-flex items-center justify-center transition-all"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </m.div>

          {/* Hairline-Divided Editorial Synopsis + Clean Borderless Metadata Grid */}
          <m.div
            variants={DETAIL_ITEM_VARIANTS}
            className="pt-6 border-t border-line grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-8 lg:gap-10"
          >
            {/* Synopsis */}
            <div className="space-y-2.5">
              <h2 className="font-editorial text-lg font-semibold text-navy">
                Sinopsis editorial
              </h2>
              <p className="text-sm sm:text-[15px] text-ink leading-[1.7] max-w-[65ch] whitespace-pre-line">
                {book.description?.trim()
                  ? book.description
                  : 'Este recurso jurídico no cuenta aún con una sinopsis editorial detallada.'}
              </p>
              <p className="text-xs text-ink-muted pt-1">{availability.detail}</p>

              {/* Keywords */}
              {book.keywords && book.keywords.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-3">
                  {book.keywords.map((kw) => (
                    <Link
                      key={kw}
                      to={`/explorar?q=${encodeURIComponent(kw)}`}
                      className="text-xs px-3 py-1 rounded-full bg-white border border-line text-ink-muted hover:text-navy hover:border-navy/30 transition-colors"
                    >
                      {kw}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Clean Hairline Bibliographic Grid (No gray boxes) */}
            <div className="space-y-3 lg:border-l lg:border-line/80 lg:pl-8">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-subtle">
                Ficha bibliográfica
              </h2>
              <dl className="grid grid-cols-2 gap-x-5 gap-y-3.5">
                {bibliographicItems.map((item) => (
                  <div key={item.label} className="space-y-0.5 min-w-0">
                    <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                      {item.label}
                    </dt>
                    <dd className="text-[13.5px] font-medium text-navy break-words leading-snug">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </m.div>
        </m.div>
      </section>

      {/* Related Resources Shelf */}
      <div className="pt-2">
        <BookShelf
          title="Títulos relacionados"
          subtitle="Otras obras jurídicas afines para ampliar tu investigación."
          seeAllTo={`/explorar?categoria=${encodeURIComponent(book.category)}`}
          books={relatedBooks}
          isInLibrary={isInLibrary}
          isFavorite={isFavorite}
          getProgress={getProgress}
          onToggleLibrary={handleToggleLibrary}
          onToggleFavorite={handleToggleFavorite}
          onPreview={setPreviewTarget}
        />
      </div>

      {/* Quick Preview Modal */}
      <QuickPreviewModal
        book={previewTarget}
        onClose={() => setPreviewTarget(null)}
        inLibrary={previewTarget ? isInLibrary(previewTarget.id) : false}
        isFavorite={previewTarget ? isFavorite(previewTarget.id) : false}
        onToggleLibrary={handleToggleLibrary}
        onToggleFavorite={handleToggleFavorite}
        onDownload={(b) => handleDownloadBook(b)}
      />

      {/* Add to Collection Modal */}
      <Modal
        open={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        title="Guardar en colecciones"
        description={`Organiza "${book.title}" en tus carpetas de estudio.`}
        size="sm"
      >
        <div className="p-6 space-y-4">
          {snapshot.collections.length > 0 ? (
            <ul className="space-y-2">
              {snapshot.collections.map((col) => {
                const included = col.book_ids.includes(book.id);
                return (
                  <li key={col.id}>
                    <button
                      type="button"
                      onClick={() =>
                        void toggleBookInCollection({
                          collectionId: col.id,
                          bookId: book.id,
                          inCollection: included,
                        })
                      }
                      className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-line hover:bg-paper-warm text-left transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-navy truncate">{col.name}</p>
                        <p className="text-xs text-ink-muted">
                          {col.book_ids.length} {col.book_ids.length === 1 ? 'recurso' : 'recursos'}
                        </p>
                      </div>
                      <span
                        className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${
                          included
                            ? 'bg-forest border-forest text-white'
                            : 'border-line-strong bg-white'
                        }`}
                      >
                        {included && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-ink-muted">
              Aún no tienes colecciones creadas. Crea la primera debajo.
            </p>
          )}

          <form onSubmit={handleQuickCreateCollection} className="pt-3 border-t border-line flex gap-2">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Ej. Exámenes Procesal Penal"
              aria-label="Nombre de nueva colección"
              className="flex-1 min-w-0 rounded-xl border border-line-strong px-3 py-2 text-sm focus:border-navy focus:outline-none"
            />
            <Button type="submit" size="sm" disabled={!newCollectionName.trim()}>
              Crear
            </Button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
