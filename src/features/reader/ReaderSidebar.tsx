import { useState } from 'react';
import { Page } from 'react-pdf';
import { Bookmark, FileText, ListTree, Loader2, Search, X } from 'lucide-react';
import type { BookmarkItem, ReaderTheme } from '../../types';
import { cn } from '../../utils/cn';

export type ReaderSidebarTab = 'thumbnails' | 'outline' | 'bookmarks' | 'search';

export interface PdfOutlineEntry {
  title: string;
  pageNumber: number | null;
  level: number;
}

export interface PdfSearchMatch {
  pageNumber: number;
  snippet: string;
  occurrences: number;
}

interface ReaderSidebarProps {
  open: boolean;
  onClose: () => void;
  activeTab: ReaderSidebarTab;
  onSelectTab: (tab: ReaderSidebarTab) => void;
  numPages: number;
  currentPage: number;
  onJumpToPage: (page: number) => void;
  outline: PdfOutlineEntry[];
  bookmarks: BookmarkItem[];
  onRemoveBookmark: (pageNumber: number) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  searchResults: PdfSearchMatch[];
  isSearching: boolean;
  theme: ReaderTheme;
}

const THUMB_BATCH = 12;

export function ReaderSidebar({
  open,
  onClose,
  activeTab,
  onSelectTab,
  numPages,
  currentPage,
  onJumpToPage,
  outline,
  bookmarks,
  onRemoveBookmark,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  isSearching,
  theme,
}: ReaderSidebarProps) {
  const [thumbLimit, setThumbLimit] = useState(THUMB_BATCH);

  if (!open) return null;

  const isDark = theme === 'dark';
  const isSepia = theme === 'sepia';

  const panelClass = isDark
    ? 'bg-[#121926] border-white/10 text-slate-200'
    : isSepia
      ? 'bg-[#F3ECE0] border-[#DFD4BF] text-[#3B3124]'
      : 'bg-white border-line text-ink';

  const mutedText = isDark ? 'text-slate-400' : isSepia ? 'text-[#73614A]' : 'text-ink-muted';

  const tabs: Array<{ id: ReaderSidebarTab; label: string; icon: typeof FileText }> = [
    { id: 'thumbnails', label: 'Páginas', icon: FileText },
    { id: 'outline', label: 'Índice', icon: ListTree },
    { id: 'bookmarks', label: 'Marcadores', icon: Bookmark },
    { id: 'search', label: 'Buscar', icon: Search },
  ];

  // Progressive thumbnail window so huge documents never render hundreds of canvases
  const visibleThumbsCount = Math.min(numPages, Math.max(thumbLimit, currentPage + 4));

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-black/45 backdrop-blur-[1px] z-30 md:hidden"
      />
      <aside
        aria-label="Herramientas del documento"
        className={cn(
          'fixed md:static inset-y-0 left-0 z-40 md:z-20 w-[290px] max-w-[85vw] border-r flex flex-col shrink-0 shadow-popover md:shadow-none',
          panelClass
        )}
      >
      {/* Tabs */}
      <div className="flex items-center border-b border-current/10 px-2 pt-2 gap-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelectTab(id)}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-2 px-1 text-[11px] font-medium border-b-2 transition-colors',
              activeTab === id
                ? isDark
                  ? 'border-gold text-gold'
                  : 'border-navy text-navy'
                : 'border-transparent opacity-65 hover:opacity-100'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar panel lateral"
          className="md:hidden p-2 opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'thumbnails' && (
          <div className="space-y-3">
            {numPages === 0 ? (
              <p className={cn('text-xs text-center py-8', mutedText)}>Cargando páginas...</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: visibleThumbsCount }, (_, i) => {
                    const pageNum = i + 1;
                    const active = pageNum === currentPage;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => onJumpToPage(pageNum)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 p-1.5 rounded-xl border transition-all text-left',
                          active
                            ? 'border-gold bg-gold/10 ring-1 ring-gold'
                            : 'border-current/10 hover:border-current/25'
                        )}
                      >
                        <div className="w-full overflow-hidden rounded bg-white shadow-sm flex justify-center">
                          <Page
                            pageNumber={pageNum}
                            width={106}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                          />
                        </div>
                        <span className="text-[11px] font-medium">Pág. {pageNum}</span>
                      </button>
                    );
                  })}
                </div>
                {visibleThumbsCount < numPages && (
                  <button
                    type="button"
                    onClick={() => setThumbLimit((v) => v + THUMB_BATCH)}
                    className="w-full py-2 rounded-lg border border-current/15 text-xs font-medium hover:bg-current/5 transition-colors"
                  >
                    Mostrar más páginas ({numPages - visibleThumbsCount} restantes)
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'outline' && (
          <div className="space-y-1">
            {outline.length === 0 ? (
              <div className="py-10 text-center space-y-1.5 px-3">
                <p className="text-xs font-medium">Sin índice estructurado</p>
                <p className={cn('text-xs leading-relaxed', mutedText)}>
                  Este archivo PDF no incluye tabla de contenido incrustada. Usa las miniaturas o el
                  buscador interno.
                </p>
              </div>
            ) : (
              outline.map((entry, idx) => (
                <button
                  key={`${entry.title}-${idx}`}
                  type="button"
                  disabled={!entry.pageNumber}
                  onClick={() => entry.pageNumber && onJumpToPage(entry.pageNumber)}
                  style={{ paddingLeft: `${10 + entry.level * 12}px` }}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 pr-2.5 py-2 rounded-lg text-xs text-left transition-colors',
                    entry.pageNumber === currentPage
                      ? isDark
                        ? 'bg-white/10 text-gold font-semibold'
                        : 'bg-navy/10 text-navy font-semibold'
                      : 'hover:bg-current/5'
                  )}
                >
                  <span className="truncate">{entry.title}</span>
                  {entry.pageNumber && (
                    <span className={cn('text-[11px] tabular-nums shrink-0', mutedText)}>
                      {entry.pageNumber}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {activeTab === 'bookmarks' && (
          <div className="space-y-2">
            {bookmarks.length === 0 ? (
              <div className="py-10 text-center space-y-1.5 px-3">
                <p className="text-xs font-medium">Sin marcadores aún</p>
                <p className={cn('text-xs leading-relaxed', mutedText)}>
                  Pulsa el ícono de marcador en la barra superior para guardar páginas relevantes.
                </p>
              </div>
            ) : (
              bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="flex items-center gap-2 rounded-xl border border-current/10 px-3 py-2.5"
                >
                  <button
                    type="button"
                    onClick={() => onJumpToPage(bm.page_number)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="text-xs font-semibold truncate">
                      {bm.label || `Página ${bm.page_number}`}
                    </p>
                    <p className={cn('text-[11px]', mutedText)}>Ir a la página {bm.page_number}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveBookmark(bm.page_number)}
                    aria-label={`Eliminar marcador página ${bm.page_number}`}
                    className="p-1.5 rounded-md opacity-60 hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-current/15 px-2.5 h-9 bg-current/[0.03]">
              <Search className="h-3.5 w-3.5 opacity-60 shrink-0" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Buscar término en el PDF..."
                aria-label="Buscar texto en el documento"
                className="w-full min-w-0 bg-transparent text-xs focus:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchQueryChange('')}
                  aria-label="Limpiar búsqueda"
                  className="opacity-65 hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {isSearching ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs opacity-75">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando coincidencias...
              </div>
            ) : searchQuery.trim().length < 2 ? (
              <p className={cn('text-xs px-1 leading-relaxed', mutedText)}>
                Escribe al menos 2 caracteres para buscar palabras o artículos en todo el documento.
              </p>
            ) : searchResults.length === 0 ? (
              <p className={cn('text-xs text-center py-8', mutedText)}>
                No se encontraron coincidencias para "{searchQuery}".
              </p>
            ) : (
              <div className="space-y-2">
                <p className={cn('text-[11px] font-medium px-1', mutedText)}>
                  {searchResults.reduce((acc, r) => acc + r.occurrences, 0)} coincidencias en{' '}
                  {searchResults.length} {searchResults.length === 1 ? 'página' : 'páginas'}
                </p>
                {searchResults.map((match) => (
                  <button
                    key={match.pageNumber}
                    type="button"
                    onClick={() => onJumpToPage(match.pageNumber)}
                    className={cn(
                      'w-full text-left rounded-xl border border-current/10 p-2.5 hover:bg-current/5 transition-colors space-y-1',
                      match.pageNumber === currentPage && 'border-gold bg-gold/10'
                    )}
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span>Página {match.pageNumber}</span>
                      <span className="text-gold-dark">{match.occurrences}×</span>
                    </div>
                    <p className={cn('text-xs line-clamp-2 leading-relaxed', mutedText)}>
                      {match.snippet}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      </aside>
    </>
  );
}
