import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, m } from 'motion/react';
import {
  Bookmark,
  ChevronLeft,
  Download,
  Expand,
  ExternalLink,
  EyeOff,
  Headphones,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  PanelLeft,
  RotateCw,
  Search,
  StretchHorizontal,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { ReaderFitMode, ReaderTheme } from '../../types';
import { cn } from '../../utils/cn';
import { TRANSITION_MICRO } from '../../utils/motion';

interface ReaderToolbarProps {
  bookId: string;
  bookTitle: string;
  currentPage: number;
  numPages: number;
  zoom: number;
  fitMode: ReaderFitMode;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomChange: (val: number) => void;
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
  audioOpen?: boolean;
  audioPlaying?: boolean;
  onToggleAudio?: () => void;
}

export function ReaderToolbar({
  bookId,
  bookTitle,
  zoom,
  fitMode,
  onZoomIn,
  onZoomOut,
  onZoomChange,
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
  audioOpen = false,
  audioPlaying = false,
  onToggleAudio,
}: ReaderToolbarProps) {
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const appearanceRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!appearanceOpen && !moreOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (appearanceRef.current && !appearanceRef.current.contains(e.target as Node)) {
        setAppearanceOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAppearanceOpen(false);
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('keydown', onKey);
    };
  }, [appearanceOpen, moreOpen]);

  const isDark = theme === 'dark';
  const isSepia = theme === 'sepia';

  const barBg = isDark
    ? 'bg-[#121D32]/92 border-white/10 text-slate-100'
    : isSepia
      ? 'bg-[#F2EAE0]/92 border-[#DFD4BF] text-[#3B3124]'
      : 'bg-paper/92 border-line/90 text-navy';

  const btnClass = isDark
    ? 'text-slate-300 hover:text-white hover:bg-white/10'
    : isSepia
      ? 'text-[#5C4D3B] hover:text-[#2B2217] hover:bg-black/5'
      : 'text-ink-muted hover:text-navy hover:bg-navy/[0.06]';

  const activeBtnClass = isDark
    ? 'bg-white/15 text-gold'
    : isSepia
      ? 'bg-[#3B3124] text-[#F7F1E3]'
      : 'bg-navy/[0.1] text-navy';

  const popoverBg = isDark
    ? 'bg-[#182640] border-white/12 text-slate-100'
    : isSepia
      ? 'bg-[#FAF5EC] border-[#DFD4BF] text-[#3B3124]'
      : 'bg-white border-line text-navy';

  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b backdrop-blur-md transition-colors duration-200 px-3 sm:px-5',
        barBg
      )}
    >
      <div className="h-14 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Back + Sidebar Toggle */}
        <div className="flex items-center gap-1 shrink-0">
          <Link
            to={`/libro/${bookId}`}
            aria-label="Volver a la ficha del libro"
            className={cn(
              'h-9 px-2.5 rounded-full inline-flex items-center gap-1 text-xs font-medium transition-colors',
              btnClass
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Volver</span>
          </Link>

          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? 'Ocultar panel lateral' : 'Mostrar índice, páginas y notas'}
            aria-pressed={sidebarOpen}
            title="Índice, páginas y notas"
            className={cn(
              'h-9 w-9 rounded-full inline-flex items-center justify-center transition-colors',
              sidebarOpen ? activeBtnClass : btnClass
            )}
          >
            <PanelLeft className="h-[17px] w-[17px]" strokeWidth={1.8} />
          </button>
        </div>

        {/* Center: Quiet Editorial Document Title */}
        <div className="flex-1 min-w-0 text-center px-2">
          <h1 className="text-xs sm:text-[13.5px] font-semibold truncate max-w-md mx-auto tracking-tight">
            {bookTitle}
          </h1>
        </div>

        {/* Right: Minimal Apple Books-inspired control cluster */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Audiobook Mode Toggle */}
          {onToggleAudio && (
            <button
              type="button"
              onClick={onToggleAudio}
              aria-label={audioOpen ? 'Mostrar reproductor de audiolibro' : 'Escuchar audiolibro'}
              aria-pressed={audioOpen}
              title="Escuchar audiolibro (A)"
              className={cn(
                'relative h-9 px-2.5 sm:px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-medium transition-colors',
                audioOpen ? activeBtnClass : btnClass
              )}
            >
              <Headphones className="h-[16px] w-[16px]" strokeWidth={1.85} />
              <span className="hidden md:inline">Escuchar</span>
              {audioPlaying && (
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse"
                />
              )}
            </button>
          )}

          {/* Search inside PDF */}
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Buscar dentro del PDF"
            title="Buscar en el documento"
            className={cn('h-9 w-9 rounded-full inline-flex items-center justify-center transition-colors', btnClass)}
          >
            <Search className="h-[17px] w-[17px]" strokeWidth={1.8} />
          </button>

          {/* Consolidated "Aa" Appearance & View Popover */}
          <div ref={appearanceRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setAppearanceOpen((v) => !v);
                setMoreOpen(false);
              }}
              aria-label="Apariencia y vista de lectura"
              aria-expanded={appearanceOpen}
              title="Tema, zoom y ajuste"
              className={cn(
                'h-9 px-2.5 rounded-full inline-flex items-center justify-center text-xs font-editorial font-bold tracking-tight transition-colors',
                appearanceOpen ? activeBtnClass : btnClass
              )}
            >
              Aa
            </button>

            <AnimatePresence>
              {appearanceOpen && (
                <m.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={TRANSITION_MICRO}
                  className={cn(
                    'absolute right-0 mt-2 w-[272px] max-w-[calc(100vw-1.5rem)] rounded-2xl border shadow-popover p-4 space-y-4 z-50',
                    popoverBg
                  )}
                >
                  {/* Theme Swatches */}
                  <div className="space-y-2">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] opacity-65">
                      Tema de lectura
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'light', label: 'Papel', swatch: 'bg-[#F7F6F2] border-[#D4CFC2]' },
                          { id: 'sepia', label: 'Sepia', swatch: 'bg-[#EFE5D1] border-[#D3C19F]' },
                          { id: 'dark', label: 'Noche', swatch: 'bg-[#121D32] border-[#2D4164]' },
                        ] as const
                      ).map((opt) => {
                        const selected = theme === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => onSetTheme(opt.id)}
                            className={cn(
                              'flex flex-col items-center gap-1.5 rounded-xl py-2 px-1 border transition-all',
                              selected
                                ? 'border-gold ring-1 ring-gold/60 bg-gold/10'
                                : 'border-transparent hover:bg-current/5'
                            )}
                          >
                            <span
                              className={cn(
                                'h-8 w-8 rounded-full border shadow-xs block',
                                opt.swatch
                              )}
                            />
                            <span className="text-[11px] font-medium">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Zoom Slider */}
                  <div className="space-y-2 pt-3 border-t border-current/10">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold uppercase tracking-[0.14em] opacity-65">
                        Zoom
                      </span>
                      <span className="font-semibold tabular-nums">
                        {fitMode === 'custom'
                          ? `${Math.round(zoom * 100)}%`
                          : fitMode === 'width'
                            ? 'Ancho'
                            : 'Página'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onZoomOut}
                        aria-label="Reducir zoom"
                        className="h-7 w-7 rounded-full inline-flex items-center justify-center hover:bg-current/10"
                      >
                        <ZoomOut className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="range"
                        min={60}
                        max={240}
                        step={5}
                        value={Math.round(zoom * 100)}
                        onChange={(e) => onZoomChange(Number(e.target.value) / 100)}
                        aria-label="Control deslizante de zoom"
                        className="flex-1 h-1.5 accent-gold cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={onZoomIn}
                        aria-label="Aumentar zoom"
                        className="h-7 w-7 rounded-full inline-flex items-center justify-center hover:bg-current/10"
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Fit Mode + Rotate */}
                  <div className="flex items-center gap-1.5 pt-3 border-t border-current/10">
                    <button
                      type="button"
                      onClick={() => onSetFitMode('width')}
                      aria-pressed={fitMode === 'width'}
                      className={cn(
                        'flex-1 h-8 rounded-xl text-[11px] font-medium inline-flex items-center justify-center gap-1.5 border transition-colors',
                        fitMode === 'width'
                          ? 'border-forest bg-forest text-white'
                          : 'border-current/15 hover:bg-current/5'
                      )}
                    >
                      <StretchHorizontal className="h-3.5 w-3.5" />
                      Ancho
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetFitMode('page')}
                      aria-pressed={fitMode === 'page'}
                      className={cn(
                        'flex-1 h-8 rounded-xl text-[11px] font-medium inline-flex items-center justify-center gap-1.5 border transition-colors',
                        fitMode === 'page'
                          ? 'border-forest bg-forest text-white'
                          : 'border-current/15 hover:bg-current/5'
                      )}
                    >
                      <Expand className="h-3.5 w-3.5" />
                      Página
                    </button>
                    <button
                      type="button"
                      onClick={onRotate}
                      aria-label="Rotar página 90 grados"
                      title="Rotar 90°"
                      className="h-8 w-8 rounded-xl border border-current/15 inline-flex items-center justify-center hover:bg-current/5 shrink-0"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bookmark Page Ribbon */}
          <button
            type="button"
            onClick={onToggleBookmark}
            aria-label={isBookmarked ? 'Quitar marcador de esta página' : 'Marcar esta página'}
            aria-pressed={isBookmarked}
            title={isBookmarked ? 'Página marcada' : 'Marcar página'}
            className={cn(
              'h-9 w-9 rounded-full inline-flex items-center justify-center transition-colors',
              isBookmarked ? 'bg-gold/20 text-gold-dark dark:text-gold' : btnClass
            )}
          >
            <Bookmark
              className={cn('h-[17px] w-[17px]', isBookmarked && 'text-gold')}
              fill={isBookmarked ? 'currentColor' : 'none'}
              strokeWidth={1.85}
            />
          </button>

          {/* More Actions Popover */}
          <div ref={moreRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setMoreOpen((v) => !v);
                setAppearanceOpen(false);
              }}
              aria-label="Más opciones del lector"
              aria-expanded={moreOpen}
              className={cn(
                'h-9 w-9 rounded-full inline-flex items-center justify-center transition-colors',
                moreOpen ? activeBtnClass : btnClass
              )}
            >
              <MoreHorizontal className="h-[18px] w-[18px]" />
            </button>

            <AnimatePresence>
              {moreOpen && (
                <m.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={TRANSITION_MICRO}
                  className={cn(
                    'absolute right-0 mt-2 w-56 max-w-[calc(100vw-1.5rem)] rounded-2xl border shadow-popover p-1.5 z-50 text-xs font-medium',
                    popoverBg
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onToggleFocusMode();
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl hover:bg-current/5 text-left"
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <EyeOff className="h-4 w-4 opacity-70" />
                      {focusMode ? 'Salir de concentración' : 'Modo concentración'}
                    </span>
                    <kbd className="text-[10px] opacity-55 px-1.5 py-0.5 rounded border border-current/15">
                      F
                    </kbd>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onToggleFullscreen();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-current/5 text-left"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-4 w-4 opacity-70" />
                    ) : (
                      <Maximize2 className="h-4 w-4 opacity-70" />
                    )}
                    {isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                  </button>

                  {onOpenNewTab && (
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        onOpenNewTab();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-current/5 text-left"
                    >
                      <ExternalLink className="h-4 w-4 opacity-70" />
                      Abrir en nueva pestaña
                    </button>
                  )}

                  {onDownload && (
                    <>
                      <div className="border-t border-current/10 my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setMoreOpen(false);
                          onDownload();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-current/5 text-left"
                      >
                        <Download className="h-4 w-4 opacity-70" />
                        Descargar PDF
                      </button>
                    </>
                  )}
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
