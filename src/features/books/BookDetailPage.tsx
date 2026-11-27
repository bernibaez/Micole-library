import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { m } from 'motion/react';
import {
  Bookmark,
  BookOpen,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  Eye,
  FolderPlus,
  Heart,
  Lock,
  Share2,
  User,
  XCircle,
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
import { DownloadActionButton } from '../../components/ui/DownloadActionButton';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { LexNotFoundMascot } from '../../components/mascot/LexNotFoundMascot';
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

  const relatedBooks = useMemo(() => {
    if (!book) return [];
    const sameCategory = allBooks.filter((b) => b.id !== book.id && b.category === book.category);
    const others = allBooks.filter((b) => b.id !== book.id && b.category !== book.category);
    return [...sameCategory, ...others].slice(0, 8);
  }, [allBooks, book]);

  if (isLoading) {
    return (
      <div className="space-y-8 py-4">
        <Skeleton className="h-5 w-28" />
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
          <Skeleton className="aspect-[2/3] w-48 md:w-full rounded-book" />
          <div className="space-y-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-24 w-full max-w-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-14 sm:py-16 px-6 rounded-3xl border border-line bg-white shadow-subtle">
        <LexNotFoundMascot className="mb-3" />
        <h2 className="font-editorial text-xl sm:text-2xl font-semibold text-navy">
          Recurso no encontrado
        </h2>
        <p className="text-sm text-ink-muted max-w-md mt-1.5 leading-relaxed">
          El documento que buscas no existe, no está disponible o fue retirado del catálogo.
        </p>
        <div className="mt-5">
          <Link to="/explorar">
            <Button variant="primary">Volver al catálogo</Button>
          </Link>
        </div>
      </div>
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

  // Extended bibliographic rows (only verified non-empty values)
  const bibliographicItems: Array<{ label: string; value: string }> = [
    { label: 'Categoría', value: book.category },
    ...(subcategoryObj ? [{ label: 'Subcategoría', value: subcategoryObj.name }] : []),
    ...(folderObj ? [{ label: 'Carpeta', value: folderObj.name }] : []),
    { label: 'Tipo de documento', value: getDocumentTypeLabel(book.document_type) },
    ...(book.subject ? [{ label: 'Materia', value: book.subject }] : []),
    ...(validityLabel ? [{ label: 'Estado de vigencia', value: validityLabel }] : []),
    ...(book.country ? [{ label: 'País / Jurisdicción', value: book.country }] : []),
    ...(book.court ? [{ label: 'Tribunal', value: book.court }] : []),
    ...(book.judgment_number ? [{ label: 'N.º de sentencia', value: book.judgment_number }] : []),
    ...(book.added_at
      ? [{ label: 'Fecha de incorporación', value: formatFullDate(book.added_at) }]
      : []),
    ...(book.isbn ? [{ label: 'ISBN', value: book.isbn }] : []),
    ...(book.pages ? [{ label: 'Extensión', value: `${book.pages} páginas` }] : []),
    ...(book.size_label ? [{ label: 'Archivo', value: book.size_label }] : []),
    ...(book.language ? [{ label: 'Idioma', value: book.language }] : []),
    ...(book.source ? [{ label: 'Fuente', value: book.source }] : []),
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
    <div className="space-y-12">
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
          Volver
        </button>
      </div>

      {/* Main Editorial Detail Layout */}
      <section className="grid grid-cols-1 md:grid-cols-[230px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)] gap-8 lg:gap-12 items-start">
        {/* Vertical Book Cover */}
        <m.div
          variants={DETAIL_COVER_VARIANTS}
          initial="hidden"
          animate="visible"
          className="w-48 sm:w-56 md:w-full mx-auto md:mx-0 space-y-3"
        >
          <BookCover book={book} size="lg" progressPercent={progress?.progress_percent} />
          {progress && progress.progress_percent > 0 && (
            <div className="rounded-xl bg-surface-secondary border border-line px-3.5 py-2.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-navy font-medium">
                <span>Tu lectura</span>
                <span>{Math.round(progress.progress_percent)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full"
                  style={{ width: `${Math.min(100, Math.max(4, progress.progress_percent))}%` }}
                />
              </div>
              <p className="text-[11px] text-ink-muted">
                Última página: {progress.current_page}
                {progress.total_pages ? ` de ${progress.total_pages}` : ''}
              </p>
            </div>
          )}
        </m.div>

        {/* Details & Actions */}
        <m.div
          variants={DETAIL_STAGGER_VARIANTS}
          initial="hidden"
          animate="visible"
          className="min-w-0 space-y-6"
        >
          <m.div variants={DETAIL_ITEM_VARIANTS} className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/explorar?categoria=${encodeURIComponent(book.category)}`}>
                <Badge variant="gold" className="hover:bg-gold/20 transition-colors">
                  {book.category}
                </Badge>
              </Link>
              <Badge variant="outline">{getDocumentTypeLabel(book.document_type)}</Badge>
              {validityLabel && (
                <Badge variant={book.validity_status === 'vigente' ? 'gold' : 'neutral'}>
                  {validityLabel}
                </Badge>
              )}
              {book.year && <Badge variant="neutral">{book.year}</Badge>}
              <Badge variant="neutral">{formatExt}</Badge>
              <span
                className={
                  availability.status === 'available'
                    ? 'inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800'
                    : availability.status === 'login_required'
                      ? 'inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800'
                      : 'inline-flex items-center gap-1.5 rounded-full bg-surface-secondary border border-line px-2.5 py-0.5 text-[11px] font-semibold text-ink-muted'
                }
              >
                <span
                  className={
                    availability.status === 'available'
                      ? 'h-1.5 w-1.5 rounded-full bg-emerald-500'
                      : availability.status === 'login_required'
                        ? 'h-1.5 w-1.5 rounded-full bg-amber-500'
                        : 'h-1.5 w-1.5 rounded-full bg-ink-subtle'
                  }
                />
                {availability.shortLabel}
              </span>
            </div>

            <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-navy leading-[1.15] tracking-tight">
              {book.title}
            </h1>
            <p className="text-base text-ink-muted font-medium">
              {book.author}
              {book.publisher ? ` · ${book.publisher}` : ''}
            </p>
          </m.div>

          {/* Primary Actions */}
          <m.div variants={DETAIL_ITEM_VARIANTS} className="flex flex-wrap items-center gap-2.5 pt-1">
            {availability.canRead && (
              <Link to={`/leer/${book.id}`}>
                <Button variant="primary" size="lg">
                  <BookOpen className="h-4 w-4" />
                  {progress && progress.current_page > 1 ? 'Continuar lectura' : 'Leer ahora'}
                </Button>
              </Link>
            )}
            {availability.canRead && (
              <Button variant="secondary" size="lg" onClick={() => setPreviewTarget(book)}>
                <Eye className="h-4 w-4" />
                Vista previa
              </Button>
            )}
            {availability.canDownload && (
              <DownloadActionButton
                variant="secondary"
                size="lg"
                idleLabel={`Descargar ${formatExt}`}
                onDownload={() => handleDownloadBook(book)}
              />
            )}
            {availability.status === 'login_required' && (
              <Link to={`/iniciar-sesion?redirect=${encodeURIComponent(`/libro/${book.id}`)}`}>
                <Button variant="primary" size="lg">
                  <Lock className="h-4 w-4" />
                  Iniciar sesión para acceder
                </Button>
              </Link>
            )}
          </m.div>

          {/* Secondary Personal Actions */}
          <m.div variants={DETAIL_ITEM_VARIANTS} className="flex flex-wrap items-center gap-2 pb-2 border-b border-line">
            <Button
              variant={inLib ? 'gold' : 'ghost'}
              size="sm"
              className={!inLib ? 'border border-line' : ''}
              onClick={() => handleToggleLibrary(book.id)}
            >
              <Bookmark className="h-4 w-4" fill={inLib ? 'currentColor' : 'none'} />
              {inLib ? 'En mi biblioteca' : 'Añadir a mi biblioteca'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="border border-line"
              onClick={() => handleToggleFavorite(book.id)}
            >
              <Heart
                className="h-4 w-4"
                fill={fav ? '#DC2626' : 'none'}
                color={fav ? '#DC2626' : 'currentColor'}
              />
              {fav ? 'Favorito' : 'Añadir a favoritos'}
            </Button>

            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                className="border border-line"
                onClick={() => setCollectionModalOpen(true)}
              >
                <FolderPlus className="h-4 w-4" />
                Colección
              </Button>
            )}

            <Button variant="ghost" size="sm" className="border border-line" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
              Compartir
            </Button>
          </m.div>

          {/* Structured Book Detail Sheet: Author, Publisher, Year, Availability, Description */}
          <m.div
            variants={DETAIL_ITEM_VARIANTS}
            className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-subtle space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line/80">
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-dark">
                Ficha detallada del libro
              </h2>
              <span className="text-xs text-ink-subtle font-medium">
                {getDocumentTypeLabel(book.document_type)} · {formatExt}
              </span>
            </div>

            {/* Core 4-Card Strip: Autor, Editorial, Año, Disponibilidad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex items-start gap-3 rounded-xl bg-surface-secondary/55 border border-line/70 px-3.5 py-3">
                <span className="h-8 w-8 rounded-lg bg-white border border-line text-gold-dark inline-flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-subtle">
                    Autor
                  </p>
                  <p className="text-sm font-semibold text-navy mt-0.5 break-words">
                    {book.author || 'No especificado'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-surface-secondary/55 border border-line/70 px-3.5 py-3">
                <span className="h-8 w-8 rounded-lg bg-white border border-line text-gold-dark inline-flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-subtle">
                    Editorial
                  </p>
                  <p className="text-sm font-semibold text-navy mt-0.5 break-words">
                    {book.publisher || 'No especificada'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-surface-secondary/55 border border-line/70 px-3.5 py-3">
                <span className="h-8 w-8 rounded-lg bg-white border border-line text-gold-dark inline-flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-subtle">
                    Año de publicación
                  </p>
                  <p className="text-sm font-semibold text-navy mt-0.5">
                    {publicationYearLabel}
                  </p>
                </div>
              </div>

              <div
                className={
                  availability.status === 'available'
                    ? 'flex items-start gap-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 px-3.5 py-3'
                    : availability.status === 'login_required'
                      ? 'flex items-start gap-3 rounded-xl bg-amber-50/75 border border-amber-200/80 px-3.5 py-3'
                      : 'flex items-start gap-3 rounded-xl bg-surface-secondary/75 border border-line px-3.5 py-3'
                }
              >
                <span className="h-8 w-8 rounded-lg bg-white border border-current/10 inline-flex items-center justify-center shrink-0">
                  {availability.status === 'available' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : availability.status === 'login_required' ? (
                    <Lock className="h-4 w-4 text-amber-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-ink-subtle" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-subtle">
                    Disponibilidad
                  </p>
                  <p className="text-sm font-semibold text-navy mt-0.5">
                    {availability.label}
                  </p>
                  <p className="text-xs text-ink-muted mt-0.5 leading-snug">
                    {availability.detail}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5 pt-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                Descripción
              </h3>
              <p className="text-sm sm:text-[15px] text-ink leading-relaxed whitespace-pre-line">
                {book.description?.trim()
                  ? book.description
                  : 'Este recurso no cuenta aún con una descripción editorial detallada.'}
              </p>
            </div>
          </m.div>

          {/* Extended Bibliographic Metadata */}
          <m.div variants={DETAIL_ITEM_VARIANTS} className="space-y-3 pt-1">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-subtle">
              Datos bibliográficos adicionales
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3.5 rounded-2xl border border-line bg-surface-secondary/50 p-5">
              {bibliographicItems.map((item) => (
                <div key={item.label} className="space-y-0.5">
                  <dt className="text-[11px] font-medium uppercase tracking-wider text-ink-subtle">
                    {item.label}
                  </dt>
                  <dd className="text-sm font-medium text-navy break-words">{item.value}</dd>
                </div>
              ))}
            </dl>
          </m.div>

          {/* Keywords */}
          {book.keywords && book.keywords.length > 0 && (
            <m.div variants={DETAIL_ITEM_VARIANTS} className="flex flex-wrap items-center gap-2 pt-1">
              {book.keywords.map((kw) => (
                <Link
                  key={kw}
                  to={`/explorar?q=${encodeURIComponent(kw)}`}
                  className="text-xs px-3 py-1 rounded-full bg-surface-secondary text-ink-muted hover:text-navy hover:bg-surface-tertiary transition-colors"
                >
                  {kw}
                </Link>
              ))}
            </m.div>
          )}
        </m.div>
      </section>

      {/* Related Resources */}
      <div className="pt-4 border-t border-line">
        <BookShelf
          title="Recursos relacionados"
          subtitle="Otros títulos afines para ampliar tu estudio."
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
                      className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-line hover:bg-surface-secondary text-left transition-colors"
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
                            ? 'bg-navy border-navy text-white'
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
              className="flex-1 min-w-0 rounded-lg border border-line-strong px-3 py-2 text-sm focus:border-navy focus:outline-none"
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
