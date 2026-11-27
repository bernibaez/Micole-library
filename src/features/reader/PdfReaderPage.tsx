import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Moon,
  RotateCw,
  Sun,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ensurePdfWorker } from './pdfWorker';
import { ReaderToolbar } from './ReaderToolbar';
import { AudiobookPlayer } from './AudiobookPlayer';
import { useAudiobookPlayer } from './useAudiobookPlayer';
import {
  ReaderSidebar,
  type PdfOutlineEntry,
  type PdfSearchMatch,
  type ReaderSidebarTab,
} from './ReaderSidebar';
import {
  useBookQuery,
  usePersonalLibrary,
  usePreferencesQuery,
} from '../library/useLibraryData';
import { resolveDocumentSource, type ResolvedDocumentSource } from '../../services/booksService';
import { useDebounce } from '../../hooks/useDebounce';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/feedback/EmptyState';
import { cn } from '../../utils/cn';
import { getDocumentTypeLabel, isPdfDocument } from '../../utils/format';
import type { ReaderFitMode, ReaderTheme } from '../../types';

ensurePdfWorker();

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function PdfReaderPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const autoOpenAudio = searchParams.get('audio') === '1';
  const isMobile = useMediaQuery('(max-width: 767px)');
  const { data: book, isLoading: loadingBook } = useBookQuery(id);
  const {
    getProgress,
    getBookmarks,
    saveProgress,
    logHistory,
    handleToggleBookmark,
    handleSaveBookmarkNote,
    handleDownloadBook,
  } = usePersonalLibrary();
  const { preferences, updatePreferences } = usePreferencesQuery();

  const [docSource, setDocSource] = useState<ResolvedDocumentSource>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>('1');
  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(preferences.reader_zoom || 1);
  const [fitModeOverride, setFitModeOverride] = useState<ReaderFitMode | null>(null);
  const [themeOverride, setThemeOverride] = useState<ReaderTheme | null>(null);
  const fitMode = fitModeOverride ?? preferences.reader_fit_mode ?? 'width';
  const theme = themeOverride ?? preferences.reader_theme ?? 'light';
  const setFitMode = setFitModeOverride;
  const setTheme = setThemeOverride;
  const [focusMode, setFocusMode] = useState<boolean>(false);
  const [mobileChromeVisible, setMobileChromeVisible] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => !isMobile);
  const [sidebarTab, setSidebarTab] = useState<ReaderSidebarTab>('thumbnails');
  const [outline, setOutline] = useState<PdfOutlineEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearch = useDebounce(searchQuery, 260);
  const [searchState, setSearchState] = useState<{
    term: string;
    results: PdfSearchMatch[];
    loading: boolean;
  }>({ term: '', results: [], loading: false });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: 820,
    height: 760,
  });

  const readerRootRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const initializedBookRef = useRef<string | null>(null);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapTimeRef = useRef<number>(0);

  const savedProgress = book ? getProgress(book.id) : undefined;
  const bookmarks = book ? getBookmarks(book.id) : [];
  const isCurrentBookmarked = bookmarks.some((b) => b.page_number === currentPage);

  // Resolve authorized document source (Google Drive secure proxy or direct URL)
  useEffect(() => {
    let active = true;
    if (!book) return;
    resolveDocumentSource(book, 'view').then((source) => {
      if (!active) return;
      setPdfLoadError(null);
      setDocSource(source);
    });
    return () => {
      active = false;
    };
  }, [book]);

  const pdfFileInput = useMemo(() => {
    if (!docSource) return null;
    if (docSource.kind === 'proxy') {
      return { url: docSource.url, httpHeaders: docSource.httpHeaders };
    }
    return docSource.url;
  }, [docSource]);

  const driveExternalUrl = useMemo(() => {
    if (!book) return null;
    if (book.drive_web_view_link) return book.drive_web_view_link;
    if (book.drive_file_id) {
      return `https://drive.google.com/file/d/${encodeURIComponent(book.drive_file_id)}/view`;
    }
    return null;
  }, [book]);

  const safeDownload = useCallback(async () => {
    if (!book) return;
    try {
      await handleDownloadBook(book);
    } catch {
      // El toast de error ya fue notificado por handleDownloadBook
    }
  }, [book, handleDownloadBook]);

  const handleOpenInNewTab = useCallback(async () => {
    if (!docSource) return;
    if (docSource.kind === 'direct') {
      window.open(docSource.url, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      const res = await fetch(docSource.url, { headers: docSource.httpHeaders });
      if (!res.ok) {
        if (driveExternalUrl) {
          window.open(driveExternalUrl, '_blank', 'noopener,noreferrer');
          return;
        }
        throw new Error('No autorizado');
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch {
      if (driveExternalUrl) {
        window.open(driveExternalUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      setPdfLoadError('No se pudo abrir el documento en una nueva pestaña.');
    }
  }, [docSource, driveExternalUrl]);

  // Restore last read page and log reading history once per book open
  useEffect(() => {
    if (!book || initializedBookRef.current === book.id) return;
    initializedBookRef.current = book.id;
    const resumePage = savedProgress?.current_page && savedProgress.current_page > 0 ? savedProgress.current_page : 1;
    setCurrentPage(resumePage);
    setPageInput(String(resumePage));
    void logHistory(book.id, resumePage);
  }, [book, logHistory, savedProgress?.current_page]);

  // Observe available reader viewport dimensions for crisp fit-width / fit-page rendering
  useEffect(() => {
    const el = canvasHostRef.current;
    if (!el) return;
    const update = () => {
      setViewportSize({
        width: Math.max(260, el.clientWidth - (isMobile ? 16 : 56)),
        height: Math.max(360, el.clientHeight - (isMobile ? 28 : 40)),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isMobile, sidebarOpen, focusMode]);

  // Debounced auto-save of reading progress
  const debouncedPage = useDebounce(currentPage, 650);
  useEffect(() => {
    if (!book || numPages <= 0) return;
    void saveProgress(book.id, Math.min(debouncedPage, numPages), numPages);
  }, [book, debouncedPage, numPages, saveProgress]);

  // Track fullscreen state
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const goToPage = useCallback(
    (target: number) => {
      const clamped = numPages > 0 ? Math.min(numPages, Math.max(1, target)) : Math.max(1, target);
      setCurrentPage(clamped);
      setPageInput(String(clamped));
      canvasHostRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [numPages]
  );

  const audiobook = useAudiobookPlayer({
    pdfDoc,
    currentPage,
    numPages,
    bookTitle: book?.title ?? 'Documento jurídico',
    bookAuthor: book?.author ?? 'MICOLE LIBRARY',
    onGoToPage: goToPage,
  });

  // Auto-open Audiobook Studio when navigated with ?audio=1
  const audioAutoOpenedRef = useRef(false);
  useEffect(() => {
    if (!autoOpenAudio || !pdfDoc || audioAutoOpenedRef.current) return;
    audioAutoOpenedRef.current = true;
    audiobook.openPlayer(true);
  }, [audiobook, autoOpenAudio, pdfDoc]);

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;
      if (typing) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        goToPage(currentPage + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToPage(currentPage - 1);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setFitModeOverride('custom');
        setZoom((z) => Math.min(2.4, Number((z + 0.15).toFixed(2))));
      } else if (e.key === '-') {
        e.preventDefault();
        setFitModeOverride('custom');
        setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))));
      } else if (e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (audiobook.isOpen) {
          audiobook.setIsExpanded(!audiobook.isExpanded);
        } else {
          audiobook.openPlayer(false);
        }
      } else if (e.key === ' ' && audiobook.isOpen) {
        e.preventDefault();
        audiobook.togglePlay();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFocusMode((v) => !v);
      } else if (e.key === 'Escape' && audiobook.isExpanded) {
        audiobook.setIsExpanded(false);
      } else if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [audiobook, currentPage, focusMode, goToPage]);

  // Extract PDF outline / TOC when document loads
  const handleDocumentLoad = useCallback(
    async (doc: PDFDocumentProxy) => {
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setPdfLoadError(null);
      setCurrentPage((prev) => {
        const safe = Math.min(doc.numPages, Math.max(1, prev));
        setPageInput(String(safe));
        return safe;
      });

      try {
        const rawOutline = await doc.getOutline();
        if (!rawOutline || rawOutline.length === 0) {
          setOutline([]);
          return;
        }
        const entries: PdfOutlineEntry[] = [];
        const walk = async (items: typeof rawOutline, level: number) => {
          for (const item of items) {
            let pageNumber: number | null = null;
            try {
              const dest =
                typeof item.dest === 'string' ? await doc.getDestination(item.dest) : item.dest;
              if (Array.isArray(dest) && dest[0]) {
                const idx = await doc.getPageIndex(dest[0]);
                pageNumber = idx + 1;
              }
            } catch {
              pageNumber = null;
            }
            entries.push({ title: item.title || 'Sección', pageNumber, level });
            if (item.items && item.items.length > 0 && level < 3) {
              await walk(item.items, level + 1);
            }
          }
        };
        await walk(rawOutline, 0);
        setOutline(entries);
      } catch {
        setOutline([]);
      }
    },
    []
  );

  // Full-text search across PDF pages (cancellable)
  useEffect(() => {
    const term = debouncedSearch.trim();
    if (!pdfDoc || term.length < 2) {
      return;
    }

    let cancelled = false;

    const runSearch = async () => {
      setSearchState({ term, results: [], loading: true });
      const matches: PdfSearchMatch[] = [];
      const lowerTerm = term.toLowerCase();
      for (let p = 1; p <= pdfDoc.numPages; p++) {
        if (cancelled) return;
        try {
          const page = await pdfDoc.getPage(p);
          const textContent = await page.getTextContent();
          const fullText = textContent.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ')
            .replace(/\s+/g, ' ');
          const lowerText = fullText.toLowerCase();
          let idx = lowerText.indexOf(lowerTerm);
          if (idx !== -1) {
            let count = 0;
            const firstIdx = idx;
            while (idx !== -1) {
              count += 1;
              idx = lowerText.indexOf(lowerTerm, idx + lowerTerm.length);
            }
            const start = Math.max(0, firstIdx - 42);
            const end = Math.min(fullText.length, firstIdx + term.length + 72);
            const snippet = `${start > 0 ? '…' : ''}${fullText.slice(start, end)}${end < fullText.length ? '…' : ''}`;
            matches.push({ pageNumber: p, snippet, occurrences: count });
          }
        } catch {
          // Skip unreadable page
        }
      }
      if (!cancelled) {
        setSearchState({ term, results: matches, loading: false });
      }
    };

    void runSearch();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, pdfDoc]);

  const activeSearchTerm = debouncedSearch.trim();
  const searchResults =
    activeSearchTerm.length >= 2 && searchState.term === activeSearchTerm
      ? searchState.results
      : [];
  const isSearching =
    activeSearchTerm.length >= 2 &&
    (searchState.term !== activeSearchTerm || searchState.loading);

  // Highlight matched search term in text layer
  const customTextRenderer = useMemo(() => {
    const term = debouncedSearch.trim();
    if (term.length < 2) return undefined;
    const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
    return ({ str }: { str: string }) =>
      str.replace(regex, '<mark class="bg-gold/55 text-navy rounded-sm px-0.5">$1</mark>');
  }, [debouncedSearch]);

  const pageWidth = useMemo(() => {
    if (fitMode === 'width') {
      return Math.min(960, viewportSize.width);
    }
    if (fitMode === 'page') {
      // Standard US Letter aspect ratio ~0.77
      const widthFromHeight = Math.floor(viewportSize.height * 0.77);
      return Math.min(viewportSize.width, widthFromHeight);
    }
    return Math.round(Math.min(960, viewportSize.width) * zoom);
  }, [fitMode, viewportSize.height, viewportSize.width, zoom]);

  const handleSetTheme = (nextTheme: ReaderTheme) => {
    setTheme(nextTheme);
    void updatePreferences({ reader_theme: nextTheme });
  };

  const handleSetFitMode = (nextMode: ReaderFitMode) => {
    setFitMode(nextMode);
    if (nextMode !== 'custom') setZoom(1);
    void updatePreferences({ reader_fit_mode: nextMode });
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void readerRootRef.current?.requestFullscreen().catch(() => {});
    } else {
      void document.exitFullscreen().catch(() => {});
    }
  };

  // Mobile pinch-to-zoom, horizontal swipe to turn pages, and double-tap zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      swipeStartRef.current = null;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistanceRef.current = Math.hypot(dx, dy);
      pinchStartZoomRef.current = fitMode === 'custom' ? zoom : 1;
      return;
    }

    if (e.touches.length === 1 && isMobile) {
      swipeStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistanceRef.current) {
      swipeStartRef.current = null;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / pinchStartDistanceRef.current;
      const nextZoom = Math.min(
        2.4,
        Math.max(0.65, Number((pinchStartZoomRef.current * scale).toFixed(2)))
      );
      setFitMode('custom');
      setZoom(nextZoom);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (pinchStartDistanceRef.current) {
      pinchStartDistanceRef.current = null;
      swipeStartRef.current = null;
      return;
    }

    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || !isMobile || e.changedTouches.length !== 1) return;

    const endTouch = e.changedTouches[0];
    const dx = endTouch.clientX - start.x;
    const dy = endTouch.clientY - start.y;
    const elapsed = Date.now() - start.time;
    const isZoomedIn = fitMode === 'custom' && zoom > 1.05;

    // Horizontal swipe page turn (only when not zoomed in so panning works freely)
    if (
      !isZoomedIn &&
      elapsed < 600 &&
      Math.abs(dx) >= 56 &&
      Math.abs(dx) > Math.abs(dy) * 1.4
    ) {
      if (dx < 0 && (numPages === 0 || currentPage < numPages)) {
        goToPage(currentPage + 1);
      } else if (dx > 0 && currentPage > 1) {
        goToPage(currentPage - 1);
      }
      return;
    }

    // Quick double-tap to toggle comfortable 1.55x reading zoom vs fit-width
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && elapsed < 250) {
      const targetEl = e.target as HTMLElement | null;
      const interactive = targetEl?.closest('button, a, input, [role="button"]');
      if (interactive) return;

      const now = Date.now();
      if (now - lastTapTimeRef.current < 300) {
        lastTapTimeRef.current = 0;
        if (fitMode === 'custom' && zoom > 1.1) {
          handleSetFitMode('width');
        } else {
          setFitMode('custom');
          setZoom(1.55);
        }
      } else {
        lastTapTimeRef.current = now;
      }
    }
  };

  if (loadingBook) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface-secondary p-6">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-[68vh] w-full" />
        </div>
      </div>
    );
  }

  if (!book || (!book.file_url && !book.drive_file_id)) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <EmptyState
          title="Documento no disponible para lectura"
          description="Este recurso no tiene un archivo enlazado actualmente."
          action={
            <Link to="/explorar">
              <Button variant="primary">Volver al catálogo</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (book.allow_preview === false) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 bg-surface-secondary">
        <div className="max-w-md w-full rounded-2xl border border-line bg-white p-7 text-center space-y-4 shadow-subtle">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gold-soft text-gold-dark inline-flex items-center justify-center">
            <FileText className="h-6 w-6" />
          </div>
          <h1 className="font-editorial text-2xl font-semibold text-navy">{book.title}</h1>
          <p className="text-sm text-ink-muted">
            La visualización en línea no está habilitada para este documento.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            {book.allow_download !== false && (
              <Button variant="primary" onClick={() => void safeDownload()}>
                <Download className="h-4 w-4" />
                Descargar archivo
              </Button>
            )}
            <Link to={`/libro/${book.id}`}>
              <Button variant="secondary">Ver ficha</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const canRenderPdf = isPdfDocument(book.mime_type, book.file_extension);

  if (!canRenderPdf) {
    return (
      <div className="min-h-dvh flex flex-col bg-surface-secondary">
        <header className="h-14 border-b border-line bg-white px-4 flex items-center justify-between gap-3">
          <Link
            to={`/libro/${book.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-navy"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver a la ficha
          </Link>
          <h1 className="text-sm font-semibold text-navy truncate">{book.title}</h1>
          <div className="w-20" />
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-2xl border border-line bg-white p-8 space-y-5 shadow-subtle">
            <div className="flex items-start gap-4">
              <span className="h-12 w-12 rounded-2xl bg-navy text-gold inline-flex items-center justify-center shrink-0">
                <FileText className="h-6 w-6" />
              </span>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="gold">{getDocumentTypeLabel(book.document_type)}</Badge>
                  <Badge variant="outline">
                    {(book.file_extension || 'ARCHIVO').toUpperCase()}
                  </Badge>
                </div>
                <h2 className="font-editorial text-2xl font-semibold text-navy leading-snug">
                  {book.title}
                </h2>
                <p className="text-sm text-ink-muted">{book.author}</p>
              </div>
            </div>

            {book.description && (
              <p className="text-sm text-ink leading-relaxed">{book.description}</p>
            )}

            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-surface-secondary p-4 text-xs">
              <div>
                <dt className="text-ink-subtle">Categoría</dt>
                <dd className="font-medium text-navy mt-0.5">{book.category}</dd>
              </div>
              <div>
                <dt className="text-ink-subtle">Formato</dt>
                <dd className="font-medium text-navy mt-0.5">{book.size_label}</dd>
              </div>
            </dl>

            <p className="text-xs text-ink-muted">
              Este formato ({book.file_extension?.toUpperCase() || book.mime_type}) no se renderiza
              con el visor PDF integrado. Puedes descargarlo si tienes autorización o consultarlo en
              una nueva pestaña.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {book.allow_download !== false && (
                <Button variant="primary" onClick={() => void safeDownload()}>
                  <Download className="h-4 w-4" />
                  Descargar documento
                </Button>
              )}
              {docSource && (
                <Button variant="secondary" onClick={() => void handleOpenInNewTab()}>
                  <ExternalLink className="h-4 w-4" />
                  Abrir en nueva pestaña
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = numPages > 0 ? Math.round((currentPage / numPages) * 100) : 0;
  const remainingPages = numPages > 0 ? Math.max(0, numPages - currentPage) : 0;
  const estimatedMinutesLeft = remainingPages > 0 ? Math.max(1, Math.round(remainingPages * 1.4)) : 0;
  const showToolbar = !focusMode && (!isMobile || mobileChromeVisible);

  const canvasBg =
    theme === 'dark'
      ? 'bg-[#121D32] text-slate-100'
      : theme === 'sepia'
        ? 'bg-[#EDE4D3] text-[#3B3124]'
        : 'bg-paper text-ink';

  return (
    <div
      ref={readerRootRef}
      className={cn(
        'h-dvh flex flex-col overflow-hidden transition-colors duration-200',
        canvasBg
      )}
    >
      {/* Minimal Editorial Top Toolbar */}
      {showToolbar && (
        <ReaderToolbar
          bookId={book.id}
          bookTitle={book.title}
          currentPage={currentPage}
          numPages={numPages}
          zoom={zoom}
          fitMode={fitMode}
          onZoomIn={() => {
            setFitMode('custom');
            setZoom((z) => Math.min(2.4, Number((z + 0.15).toFixed(2))));
          }}
          onZoomOut={() => {
            setFitMode('custom');
            setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))));
          }}
          onZoomChange={(val) => {
            setFitMode('custom');
            setZoom(Math.min(2.4, Math.max(0.6, Number(val.toFixed(2)))));
          }}
          onSetFitMode={handleSetFitMode}
          onRotate={() => setRotation((r) => (r + 90) % 360)}
          theme={theme}
          onSetTheme={handleSetTheme}
          isBookmarked={isCurrentBookmarked}
          onToggleBookmark={() => void handleToggleBookmark(book.id, currentPage)}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onOpenSearch={() => {
            setSidebarOpen(true);
            setSidebarTab('search');
          }}
          focusMode={focusMode}
          onToggleFocusMode={() => setFocusMode((v) => !v)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onDownload={
            book.allow_download !== false ? () => void safeDownload() : undefined
          }
          onOpenNewTab={docSource ? () => void handleOpenInNewTab() : undefined}
          audioOpen={audiobook.isOpen}
          audioPlaying={audiobook.isPlaying}
          onToggleAudio={() => {
            if (!audiobook.isOpen) {
              audiobook.openPlayer(false);
              void audiobook.play();
            } else {
              audiobook.setIsExpanded(!audiobook.isExpanded);
            }
          }}
        />
      )}

      {/* Hairline Reading Progress Track */}
      <div
        className="h-[2.5px] w-full bg-current/10 shrink-0"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso de lectura"
      >
        <div
          className="h-full bg-gold transition-[width] duration-200"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Document Wrapper (single Document instance powers sidebar thumbnails + active page) */}
      <Document
        file={pdfFileInput}
        onLoadSuccess={(doc) => void handleDocumentLoad(doc)}
        onLoadError={async () => {
          let detailed =
            'No pudimos renderizar este archivo PDF en el visor. Puedes descargarlo o abrirlo en Google Drive.';
          if (docSource?.kind === 'proxy') {
            try {
              const probe = await fetch(docSource.url, { headers: docSource.httpHeaders });
              if (!probe.ok) {
                const payload = (await probe.json().catch(() => null)) as { error?: string } | null;
                if (payload?.error) detailed = payload.error;
              }
            } catch {
              // ignore probe error
            }
          }
          setPdfLoadError(detailed);
        }}
        loading={
          <div className="flex-1 flex items-center justify-center p-8">
            <Skeleton className="h-[72vh] w-full max-w-[680px] rounded-xl" />
          </div>
        }
        className="flex-1 flex min-h-0 overflow-hidden relative"
      >
        {/* Sidebar: Outline, Thumbnails, Bookmarks & Notes, In-PDF Search */}
        {!focusMode && (
          <ReaderSidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            activeTab={sidebarTab}
            onSelectTab={setSidebarTab}
            numPages={numPages}
            currentPage={currentPage}
            onJumpToPage={(p) => {
              goToPage(p);
              if (isMobile) setSidebarOpen(false);
            }}
            outline={outline}
            bookmarks={bookmarks}
            onRemoveBookmark={(pageNum) => void handleToggleBookmark(book.id, pageNum)}
            onSaveBookmarkNote={(pageNum, label, note) =>
              handleSaveBookmarkNote(book.id, pageNum, label, note)
            }
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            searchResults={searchResults}
            isSearching={isSearching}
            theme={theme}
          />
        )}

        {/* Active Page Canvas Area */}
        <div
          ref={canvasHostRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={(e) => {
            if (isMobile && e.target === canvasHostRef.current) {
              setMobileChromeVisible((v) => !v);
            }
          }}
          className={cn(
            'flex-1 overflow-auto px-2 sm:px-8 pt-4 sm:pt-7 pb-36 md:pb-24 overscroll-contain touch-pan-x touch-pan-y',
            theme === 'sepia' && 'lex-pdf-sepia',
            theme === 'dark' && 'lex-pdf-dark-page'
          )}
        >
          {pdfLoadError ? (
            <div className="my-auto mx-auto max-w-md text-center space-y-4 bg-white text-ink rounded-2xl p-6 border border-line shadow-subtle">
              <p className="text-sm font-semibold text-navy leading-relaxed">{pdfLoadError}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {book.allow_download !== false && (
                  <Button variant="primary" onClick={() => void safeDownload()}>
                    Descargar PDF
                  </Button>
                )}
                {driveExternalUrl && (
                  <a href={driveExternalUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary">
                      <ExternalLink className="h-4 w-4" />
                      Abrir en Google Drive
                    </Button>
                  </a>
                )}
                <Link to={`/libro/${book.id}`}>
                  <Button variant="secondary">Volver</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-fit rounded-lg overflow-hidden shadow-editorial-cover bg-white ring-1 ring-black/[0.06]">
              <Page
                pageNumber={currentPage}
                width={pageWidth}
                rotate={rotation}
                renderTextLayer
                renderAnnotationLayer
                customTextRenderer={customTextRenderer}
                loading={<Skeleton className="h-[72vh] w-[min(680px,92vw)]" />}
              />
            </div>
          )}
        </div>

        {/* Audiobook Floating Dock & Full Studio Mode */}
        <AudiobookPlayer
          book={book}
          theme={theme}
          isMobile={isMobile}
          currentPage={currentPage}
          numPages={numPages}
          onGoToPage={goToPage}
          isOpen={audiobook.isOpen}
          isExpanded={audiobook.isExpanded}
          onSetExpanded={audiobook.setIsExpanded}
          onClose={audiobook.closePlayer}
          isSupported={audiobook.isSupported}
          isPlaying={audiobook.isPlaying}
          isLoadingPage={audiobook.isLoadingPage}
          pageStatusMessage={audiobook.pageStatusMessage}
          chunks={audiobook.chunks}
          activeChunkIndex={audiobook.activeChunkIndex}
          activeSentence={audiobook.activeSentence}
          rate={audiobook.rate}
          onSetRate={audiobook.setRate}
          onCycleRate={audiobook.cycleRate}
          autoAdvance={audiobook.autoAdvance}
          onSetAutoAdvance={audiobook.setAutoAdvance}
          voiceOptions={audiobook.voiceOptions}
          selectedVoiceURI={audiobook.selectedVoiceURI}
          onSetSelectedVoiceURI={audiobook.setSelectedVoiceURI}
          sleepTimerOption={audiobook.sleepTimerOption}
          sleepRemainingSec={audiobook.sleepRemainingSec}
          onSetSleepTimer={audiobook.setSleepTimer}
          estimatedPageSecondsLeft={audiobook.estimatedPageSecondsLeft}
          onTogglePlay={audiobook.togglePlay}
          onJumpToChunk={audiobook.jumpToChunk}
          onSkipBackward={audiobook.skipBackward}
          onSkipForward={audiobook.skipForward}
        />

        {/* Floating Apple Books Scrubber Pill (Desktop & Tablet) */}
        {!isMobile && !focusMode && numPages > 0 && (
          <div
            className={cn(
              'fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-full border px-3.5 py-2 backdrop-blur-md shadow-popover transition-colors',
              theme === 'dark'
                ? 'bg-[#182640]/92 border-white/12 text-slate-100'
                : theme === 'sepia'
                  ? 'bg-[#F5EEE2]/92 border-[#DFD4BF] text-[#3B3124]'
                  : 'bg-white/92 border-line text-navy'
            )}
          >
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
              aria-label="Página anterior"
              className="h-7 w-7 rounded-full inline-flex items-center justify-center hover:bg-current/10 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center gap-1 min-w-[240px] sm:min-w-[300px]">
              {numPages > 1 && (
                <input
                  type="range"
                  min={1}
                  max={numPages}
                  value={currentPage}
                  onChange={(e) => goToPage(Number(e.target.value))}
                  aria-label="Deslizar para navegar por páginas"
                  className="w-full h-1 accent-gold cursor-pointer"
                />
              )}
              <div className="flex items-center gap-2 text-[11px] font-medium tabular-nums opacity-85">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const parsed = Number.parseInt(pageInput, 10);
                    if (!Number.isNaN(parsed)) goToPage(parsed);
                    else setPageInput(String(currentPage));
                  }}
                  className="inline-flex items-center gap-1"
                >
                  <span>Pág.</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value.replace(/[^\d]/g, ''))}
                    onBlur={() => {
                      const parsed = Number.parseInt(pageInput, 10);
                      if (!Number.isNaN(parsed)) goToPage(parsed);
                      else setPageInput(String(currentPage));
                    }}
                    aria-label="Número de página actual"
                    className="w-9 rounded bg-current/10 px-1 py-0.5 text-center text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                  <span>de {numPages}</span>
                </form>
                <span aria-hidden="true">·</span>
                <span className="font-semibold">{progressPercent}%</span>
                {estimatedMinutesLeft > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="opacity-75">~{estimatedMinutesLeft} min</span>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={currentPage >= numPages}
              onClick={() => goToPage(currentPage + 1)}
              aria-label="Página siguiente"
              className="h-7 w-7 rounded-full inline-flex items-center justify-center hover:bg-current/10 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Floating Focus Mode Controls */}
        {focusMode && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 rounded-full bg-navy/95 text-white px-3 py-1.5 shadow-popover border border-white/10">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
              aria-label="Página anterior"
              className="h-8 w-8 rounded-full inline-flex items-center justify-center hover:bg-white/10 disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-medium px-1.5 tabular-nums">
              {currentPage} / {numPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= numPages}
              onClick={() => goToPage(currentPage + 1)}
              aria-label="Página siguiente"
              className="h-8 w-8 rounded-full inline-flex items-center justify-center hover:bg-white/10 disabled:opacity-35"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-white/15 mx-1" />
            <button
              type="button"
              onClick={() => setFocusMode(false)}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Eye className="h-3.5 w-3.5 text-gold" />
              Salir de concentración
            </button>
          </div>
        )}

        {/* Mobile Bottom Quick Bar (thumb-zone pager + scrubber + zoom + theme) */}
        {isMobile && !focusMode && mobileChromeVisible && (
          <div
            className={cn(
              'fixed bottom-0 inset-x-0 z-30 border-t px-3 pt-2 pb-2.5 backdrop-blur-md space-y-2 safe-bottom shadow-popover',
              theme === 'dark'
                ? 'bg-[#121D32]/95 border-white/10 text-slate-100'
                : theme === 'sepia'
                  ? 'bg-[#F2EAE0]/95 border-[#DFD4BF] text-[#3B3124]'
                  : 'bg-paper/95 border-line text-navy'
            )}
          >
            {/* Thumb-zone page navigation + quick scrubber slider */}
            {numPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => goToPage(currentPage - 1)}
                  aria-label="Página anterior"
                  className="h-9 w-9 rounded-lg border border-current/15 inline-flex items-center justify-center disabled:opacity-35 active:scale-95 shrink-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <input
                  type="range"
                  min={1}
                  max={numPages}
                  value={currentPage}
                  onChange={(e) => goToPage(Number(e.target.value))}
                  aria-label="Deslizar para cambiar de página"
                  className="flex-1 h-1.5 accent-gold cursor-pointer"
                />
                <span className="text-[11px] font-semibold tabular-nums min-w-[44px] text-center opacity-85">
                  {currentPage}/{numPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= numPages}
                  onClick={() => goToPage(currentPage + 1)}
                  aria-label="Página siguiente"
                  className="h-9 w-9 rounded-lg border border-current/15 inline-flex items-center justify-center disabled:opacity-35 active:scale-95 shrink-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Zoom, Fit-Width Reset, Rotate, Theme, Hide */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setFitMode('custom');
                    setZoom((z) => Math.max(0.65, Number((z - 0.15).toFixed(2))));
                  }}
                  aria-label="Alejar"
                  className="h-9 w-9 rounded-lg inline-flex items-center justify-center hover:bg-current/10"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSetFitMode('width')}
                  aria-label="Ajustar al ancho de pantalla"
                  className="h-8 px-2 rounded-lg text-[11px] font-semibold tabular-nums bg-current/10 hover:bg-current/15 transition-colors"
                >
                  {fitMode === 'custom' ? `${Math.round(zoom * 100)}%` : 'Ajustar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFitMode('custom');
                    setZoom((z) => Math.min(2.4, Number((z + 0.15).toFixed(2))));
                  }}
                  aria-label="Acercar"
                  className="h-9 w-9 rounded-lg inline-flex items-center justify-center hover:bg-current/10"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  aria-label="Rotar"
                  className="h-9 w-9 rounded-lg inline-flex items-center justify-center hover:bg-current/10"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    handleSetTheme(
                      theme === 'light' ? 'sepia' : theme === 'sepia' ? 'dark' : 'light'
                    )
                  }
                  aria-label="Cambiar modo de lectura"
                  className="h-9 px-2.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 hover:bg-current/10"
                >
                  {theme === 'dark' ? (
                    <Moon className="h-3.5 w-3.5 text-gold" />
                  ) : (
                    <Sun className="h-3.5 w-3.5" />
                  )}
                  {theme === 'light' ? 'Papel' : theme === 'sepia' ? 'Sepia' : 'Noche'}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileChromeVisible(false)}
                  className="h-9 px-2.5 rounded-lg text-xs font-medium hover:bg-current/10"
                >
                  Ocultar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Floating Restore Controls Pill */}
        {isMobile && !focusMode && !mobileChromeVisible && (
          <button
            type="button"
            onClick={() => setMobileChromeVisible(true)}
            className="fixed bottom-4 right-4 z-30 h-10 px-3.5 rounded-full bg-navy/90 text-white text-xs font-medium shadow-popover"
          >
            Mostrar controles
          </button>
        )}
      </Document>
    </div>
  );
}
