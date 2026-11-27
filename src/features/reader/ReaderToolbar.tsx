import { Link } from 'react-router-dom';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Download,
  Expand,
  ExternalLink,
  EyeOff,
  Maximize2,
  Minimize2,
  Moon,
  PanelLeft,
  RotateCw,
  Search,
  StretchHorizontal,
  Sun,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { ReaderFitMode, ReaderTheme } from '../../types';
import { cn } from '../../utils/cn';

interface ReaderToolbarProps {
  bookId: string;
  bookTitle: string;
  currentPage: number;
  numPages: number;
  pageInput: string;
  onPageInputChange: (val: string) => void;
  onPageInputCommit: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  zoom: number;
  fitMode: ReaderFitMode;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetFitMode: (mode: ReaderFitMode) => void;
  onRotate: () => void;
  theme: ReaderTheme;
  onSetTheme: (theme: ReaderTheme) => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onDownload?: () => void;
  onOpenNewTab?: () => void;
}

export function ReaderToolbar({
  bookId,
  bookTitle,
  currentPage,
  numPages,
  pageInput,
  onPageInputChange,
  onPageInputCommit,
  onPrevPage,
  onNextPage,
  zoom,
  fitMode,
  onZoomIn,
  onZoomOut,
  onSetFitMode,
  onRotate,
  theme,
  onSetTheme,
  isBookmarked,
  onToggleBookmark,
  sidebarOpen,
  onToggleSidebar,
  onOpenSearch,
  focusMode,
  onToggleFocusMode,
  isFullscreen,
  onToggleFullscreen,
  onDownload,
  onOpenNewTab,
}: ReaderToolbarProps) {
  const isDark = theme === 'dark';
  const isSepia = theme === 'sepia';

  const barBg = isDark
    ? 'bg-[#121926] border-white/10 text-slate-100'
    : isSepia
      ? 'bg-[#F3ECE0] border-[#DFD4BF] text-[#3B3124]'
      : 'bg-white border-line text-navy';

  const btnClass = isDark
    ? 'text-slate-300 hover:text-white hover:bg-white/10'
    : isSepia
      ? 'text-[#5C4D3B] hover:text-[#2B2217] hover:bg-black/5'
      : 'text-ink-muted hover:text-navy hover:bg-surface-secondary';

  const activeBtnClass = isDark
    ? 'bg-white/15 text-gold'
    : isSepia
      ? 'bg-[#3B3124] text-[#F7F1E3]'
      : 'bg-navy text-white';

  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b transition-colors duration-200 px-2.5 sm:px-4',
        barBg
      )}
    >
      <div className="h-14 flex items-center justify-between gap-2">
        {/* Left: Back + Sidebar + Title */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Link
            to={`/libro/${bookId}`}
            aria-label="Volver a la ficha del libro"
            className={cn(
              'h-9 px-2.5 rounded-lg inline-flex items-center gap-1 text-xs font-medium transition-colors shrink-0',
              btnClass
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Volver</span>
          </Link>

          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? 'Ocultar panel lateral' : 'Mostrar miniaturas, índice y marcadores'}
            aria-pressed={sidebarOpen}
            className={cn(
              'h-9 w-9 rounded-lg inline-flex items-center justify-center transition-colors shrink-0',
              sidebarOpen ? activeBtnClass : btnClass
            )}
          >
            <PanelLeft className="h-[18px] w-[18px]" />
          </button>

          <div className="hidden md:block min-w-0 pl-1">
            <h1 className="text-sm font-semibold truncate max-w-[220px] lg:max-w-[320px]">
              {bookTitle}
            </h1>
          </div>
        </div>

        {/* Center: Page Controls + Zoom */}
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={onPrevPage}
              aria-label="Página anterior"
              className={cn(
                'h-9 w-9 rounded-lg inline-flex items-center justify-center disabled:opacity-35 transition-colors',
                btnClass
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onPageInputCommit();
              }}
              className="flex items-center gap-1 text-xs"
            >
              <input
                type="text"
                inputMode="numeric"
                value={pageInput}
                onChange={(e) => onPageInputChange(e.target.value.replace(/[^\d]/g, ''))}
                onBlur={onPageInputCommit}
                aria-label="Número de página actual"
                className={cn(
                  'w-11 h-8 rounded-md border text-center text-xs font-semibold focus:outline-none',
                  isDark
                    ? 'bg-white/5 border-white/15 text-white'
                    : isSepia
                      ? 'bg-white/70 border-[#D5C7AD] text-[#3B3124]'
                      : 'bg-surface-secondary border-line text-navy'
                )}
              />
              <span className="opacity-70 whitespace-nowrap">/ {numPages || '—'}</span>
            </form>

            <button
              type="button"
              disabled={numPages > 0 && currentPage >= numPages}
              onClick={onNextPage}
              aria-label="Página siguiente"
              className={cn(
                'h-9 w-9 rounded-lg inline-flex items-center justify-center disabled:opacity-35 transition-colors',
                btnClass
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-0.5 pl-2 border-l border-current/10">
            <button
              type="button"
              onClick={onZoomOut}
              aria-label="Reducir zoom"
              className={cn('h-9 w-9 rounded-lg inline-flex items-center justify-center', btnClass)}
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="w-11 text-center text-xs font-medium tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={onZoomIn}
              aria-label="Aumentar zoom"
              className={cn('h-9 w-9 rounded-lg inline-flex items-center justify-center', btnClass)}
            >
              <ZoomIn className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => onSetFitMode('width')}
              aria-label="Ajustar al ancho"
              title="Ajustar al ancho"
              aria-pressed={fitMode === 'width'}
              className={cn(
                'h-9 w-9 rounded-lg inline-flex items-center justify-center transition-colors',
                fitMode === 'width' ? activeBtnClass : btnClass
              )}
            >
              <StretchHorizontal className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onSetFitMode('page')}
              aria-label="Ajustar a la página"
              title="Ajustar a la página"
              aria-pressed={fitMode === 'page'}
              className={cn(
                'h-9 w-9 rounded-lg inline-flex items-center justify-center transition-colors',
                fitMode === 'page' ? activeBtnClass : btnClass
              )}
            >
              <Expand className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right: Search, Bookmark, Rotate, Theme, Focus, Fullscreen, Download */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Buscar dentro del PDF"
            title="Buscar dentro del PDF"
            className={cn('h-9 w-9 rounded-lg inline-flex items-center justify-center', btnClass)}
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onToggleBookmark}
            aria-label={isBookmarked ? 'Quitar marcador de esta página' : 'Marcar esta página'}
            aria-pressed={isBookmarked}
            title="Marcador de página"
            className={cn(
              'h-9 w-9 rounded-lg inline-flex items-center justify-center transition-colors',
              isBookmarked ? 'text-gold bg-gold/15' : btnClass
            )}
          >
            <Bookmark className="h-4 w-4" fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>

          <button
            type="button"
            onClick={onRotate}
            aria-label="Rotar página 90 grados"
            title="Rotar 90°"
            className={cn('hidden sm:inline-flex h-9 w-9 rounded-lg items-center justify-center', btnClass)}
          >
            <RotateCw className="h-4 w-4" />
          </button>

          {/* Theme Switcher */}
          <div
            role="group"
            aria-label="Modo de lectura"
            className={cn(
              'hidden md:inline-flex items-center rounded-lg p-0.5 border mx-1',
              isDark ? 'border-white/15 bg-white/5' : 'border-line bg-surface-secondary/70'
            )}
          >
            <button
              type="button"
              onClick={() => onSetTheme('light')}
              aria-label="Modo claro"
              title="Modo claro"
              className={cn(
                'h-7 w-7 rounded-md inline-flex items-center justify-center transition-colors',
                theme === 'light' ? 'bg-white text-navy shadow-sm' : btnClass
              )}
            >
              <Sun className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onSetTheme('sepia')}
              aria-label="Modo sepia"
              title="Modo sepia"
              className={cn(
                'h-7 px-2 rounded-md text-[11px] font-semibold transition-colors',
                theme === 'sepia' ? 'bg-[#E5D7BF] text-[#3B3124] shadow-sm' : btnClass
              )}
            >
              Aa
            </button>
            <button
              type="button"
              onClick={() => onSetTheme('dark')}
              aria-label="Modo oscuro"
              title="Modo oscuro"
              className={cn(
                'h-7 w-7 rounded-md inline-flex items-center justify-center transition-colors',
                theme === 'dark' ? 'bg-navy text-gold shadow-sm' : btnClass
              )}
            >
              <Moon className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleFocusMode}
            aria-label="Modo concentración"
            title="Modo concentración (F)"
            aria-pressed={focusMode}
            className={cn(
              'hidden sm:inline-flex h-9 w-9 rounded-lg items-center justify-center transition-colors',
              focusMode ? activeBtnClass : btnClass
            )}
          >
            <EyeOff className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            title="Pantalla completa"
            className={cn('hidden md:inline-flex h-9 w-9 rounded-lg items-center justify-center', btnClass)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {onOpenNewTab && (
            <button
              type="button"
              onClick={onOpenNewTab}
              aria-label="Abrir en nueva pestaña"
              title="Abrir en nueva pestaña"
              className={cn('hidden sm:inline-flex h-9 w-9 rounded-lg items-center justify-center', btnClass)}
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          )}

          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              aria-label="Descargar documento"
              title="Descargar documento"
              className={cn('h-9 w-9 rounded-lg inline-flex items-center justify-center', btnClass)}
            >
              <Download className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
