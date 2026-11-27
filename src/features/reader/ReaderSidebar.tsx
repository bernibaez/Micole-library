import { useState } from 'react';
import { Page } from 'react-pdf';
import {
  Bookmark,
  Check,
  Copy,
  Download,
  FileText,
  ListTree,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from 'lucide-react';
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
  onSaveBookmarkNote: (pageNumber: number, label: string, note: string) => Promise<boolean> | boolean;
  onExportNotesPrint?: () => void;
  onExportNotesMarkdown?: () => void;
  onCopyNotes?: () => void;
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
  onSaveBookmarkNote,
  onExportNotesPrint,
  onExportNotesMarkdown,
  onCopyNotes,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  isSearching,
  theme,
}: ReaderSidebarProps) {
  const [thumbLimit, setThumbLimit] = useState(THUMB_BATCH);
  const [editingState, setEditingState] = useState<{ page: number; contextPage: number } | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const editingPage =
    editingState && editingState.contextPage === currentPage ? editingState.page : null;
  const currentBookmark = bookmarks.find((b) => b.page_number === currentPage);

  if (!open) return null;

  const isDark = theme === 'dark';
  const isSepia = theme === 'sepia';

  const panelClass = isDark
    ? 'bg-[#152238] border-white/10 text-slate-200'
    : isSepia
      ? 'bg-[#F2EAE0] border-[#DFD4BF] text-[#3B3124]'
      : 'bg-paper border-line/90 text-ink';

  const cardClass = isDark
    ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.07]'
    : isSepia
      ? 'bg-[#FAF5EC] border-[#DFD4BF] hover:bg-white/75'
      : 'bg-white border-line/90 hover:border-line-strong';

  const mutedText = isDark ? 'text-slate-400' : isSepia ? 'text-[#73614A]' : 'text-ink-muted';

  const tabs: Array<{ id: ReaderSidebarTab; label: string; icon: typeof FileText; count?: number }> = [
    { id: 'outline', label: 'Índice', icon: ListTree },
    { id: 'thumbnails', label: 'Páginas', icon: FileText },
    { id: 'bookmarks', label: 'Notas', icon: Bookmark, count: bookmarks.length },
    { id: 'search', label: 'Buscar', icon: Search },
  ];

  const visibleThumbsCount = Math.min(numPages, Math.max(thumbLimit, currentPage + 4));

  const startEditing = (pageNum: number, existing?: BookmarkItem) => {
    setEditingState({ page: pageNum, contextPage: currentPage });
    setDraftLabel(existing?.label || `Página ${pageNum}`);
    setDraftNote(existing?.note || '');
  };

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPage === null || savingNote) return;
    setSavingNote(true);
    try {
      const ok = await onSaveBookmarkNote(editingPage, draftLabel, draftNote);
      if (ok) {
        setEditingState(null);
      }
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-navy/45 backdrop-blur-[1px] z-30 md:hidden"
      />
      <aside
        aria-label="Herramientas del documento"
        className={cn(
          'fixed md:static inset-y-0 left-0 z-40 md:z-20 w-[300px] max-w-[86vw] border-r flex flex-col shrink-0 shadow-popover md:shadow-none',
          panelClass
        )}
      >
        {/* Header + Tabs */}
        <div className="px-3.5 pt-3 pb-0 border-b border-current/10 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-editorial text-sm font-semibold tracking-tight">
              {activeTab === 'bookmarks'
                ? 'Marcadores y Notas'
                : activeTab === 'outline'
                  ? 'Tabla de contenido'
                  : activeTab === 'search'
                    ? 'Buscar en el texto'
                    : 'Vista de páginas'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar panel lateral"
              className="md:hidden h-7 w-7 rounded-full inline-flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-current/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            {tabs.map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                type="button"
                onClick={() => onSelectTab(id)}
                className={cn(
                  'relative flex-1 flex flex-col items-center gap-1 py-2 px-1 text-[11px] font-medium border-b-2 transition-colors',
                  activeTab === id
                    ? isDark
                      ? 'border-gold text-gold'
                      : 'border-forest text-navy font-semibold'
                    : 'border-transparent opacity-60 hover:opacity-100'
                )}
              >
                <span className="relative inline-flex items-center">
                  <Icon className="h-3.5 w-3.5" />
                  {typeof count === 'number' && count > 0 && (
                    <span className="ml-1 text-[9.5px] font-bold tabular-nums opacity-80">
                      {count}
                    </span>
                  )}
                </span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto p-3.5">
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
                              ? 'border-gold bg-gold/10 ring-1 ring-gold/60'
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
                          <span className="text-[11px] font-medium tabular-nums">Pág. {pageNum}</span>
                        </button>
                      );
                    })}
                  </div>
                  {visibleThumbsCount < numPages && (
                    <button
                      type="button"
                      onClick={() => setThumbLimit((v) => v + THUMB_BATCH)}
                      className="w-full py-2 rounded-xl border border-current/15 text-xs font-medium hover:bg-current/5 transition-colors"
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
                  <p className="text-xs font-semibold">Sin índice estructurado</p>
                  <p className={cn('text-xs leading-relaxed', mutedText)}>
                    Este archivo PDF no incluye tabla de contenido incrustada. Usa las miniaturas o
                    el buscador interno.
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
                      'w-full flex items-center justify-between gap-2 pr-2.5 py-2 rounded-xl text-xs text-left transition-colors',
                      entry.pageNumber === currentPage
                        ? isDark
                          ? 'bg-white/10 text-gold font-semibold'
                          : 'bg-navy/[0.08] text-navy font-semibold'
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
            <div className="space-y-3">
              {/* Quick Add / Edit Note Action for Current Page */}
              {editingPage === null ? (
                <button
                  type="button"
                  onClick={() => startEditing(currentPage, currentBookmark)}
                  className={cn(
                    'w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 px-3 text-xs font-semibold transition-colors',
                    isDark
                      ? 'border-gold/40 text-gold hover:bg-gold/10'
                      : 'border-forest/35 bg-forest-soft/60 text-forest hover:bg-forest-soft'
                  )}
                >
                  {currentBookmark ? (
                    <>
                      <Pencil className="h-3.5 w-3.5" />
                      Editar nota de página {currentPage}
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      Anotar página actual ({currentPage})
                    </>
                  )}
                </button>
              ) : (
                <form
                  onSubmit={(e) => void handleSubmitNote(e)}
                  className={cn('rounded-2xl border p-3 space-y-2.5 shadow-subtle', cardClass)}
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-gold-dark uppercase tracking-wider">
                      Nota · Página {editingPage}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingState(null)}
                      aria-label="Cancelar edición"
                      className="opacity-60 hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={draftLabel}
                    onChange={(e) => setDraftLabel(e.target.value)}
                    placeholder="Ej. Art. 226 · Medidas de coerción"
                    aria-label="Título del marcador"
                    className="w-full rounded-lg border border-current/15 bg-transparent px-2.5 py-1.5 text-xs font-medium focus:border-gold focus:outline-none"
                  />
                  <textarea
                    rows={3}
                    value={draftNote}
                    onChange={(e) => setDraftNote(e.target.value)}
                    placeholder="Escribe una observación, cita o criterio jurídico..."
                    aria-label="Nota personal sobre la página"
                    className="w-full rounded-lg border border-current/15 bg-transparent px-2.5 py-1.5 text-xs leading-relaxed resize-none focus:border-gold focus:outline-none"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingState(null)}
                      className="h-7 px-2.5 rounded-lg text-[11px] font-medium hover:bg-current/5"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingNote}
                      className="h-7 px-3 rounded-lg bg-forest text-white text-[11px] font-semibold hover:bg-forest-hover disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      <Check className="h-3 w-3" />
                      Guardar
                    </button>
                  </div>
                </form>
              )}

              {/* Export Notes Bar */}
              {bookmarks.length > 0 &&
                (onExportNotesPrint || onExportNotesMarkdown || onCopyNotes) && (
                  <div
                    className={cn(
                      'rounded-xl border px-2.5 py-2 flex items-center justify-between gap-1.5',
                      cardClass
                    )}
                  >
                    <span className={cn('text-[10.5px] font-semibold uppercase tracking-wider', mutedText)}>
                      Exportar ({bookmarks.length})
                    </span>
                    <div className="flex items-center gap-1">
                      {onExportNotesPrint && (
                        <button
                          type="button"
                          onClick={onExportNotesPrint}
                          title="Imprimir o guardar apuntes como PDF"
                          className="h-7 px-2 rounded-lg text-[11px] font-medium hover:bg-current/10 inline-flex items-center gap-1 transition-colors"
                        >
                          <Printer className="h-3 w-3 text-gold-dark dark:text-gold" />
                          PDF
                        </button>
                      )}
                      {onExportNotesMarkdown && (
                        <button
                          type="button"
                          onClick={onExportNotesMarkdown}
                          title="Descargar apuntes en formato Markdown (.md)"
                          className="h-7 px-2 rounded-lg text-[11px] font-medium hover:bg-current/10 inline-flex items-center gap-1 transition-colors"
                        >
                          <Download className="h-3 w-3 opacity-75" />
                          .md
                        </button>
                      )}
                      {onCopyNotes && (
                        <button
                          type="button"
                          onClick={onCopyNotes}
                          title="Copiar todos los apuntes al portapapeles"
                          aria-label="Copiar apuntes"
                          className="h-7 w-7 rounded-lg hover:bg-current/10 inline-flex items-center justify-center transition-colors"
                        >
                          <Copy className="h-3 w-3 opacity-75" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

              {/* Saved Bookmarks & Legal Notes */}
              {bookmarks.length === 0 ? (
                <div className="py-8 text-center space-y-1.5 px-3">
                  <p className="text-xs font-semibold">Sin marcadores ni notas aún</p>
                  <p className={cn('text-xs leading-relaxed', mutedText)}>
                    Marca una página o añade apuntes jurídicos para volver rápidamente a artículos y
                    criterios clave.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      className={cn(
                        'rounded-2xl border p-3 transition-colors shadow-xs',
                        cardClass,
                        bm.page_number === currentPage && 'ring-1 ring-gold/70 border-gold/60'
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <Bookmark
                          className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5"
                          fill="currentColor"
                        />
                        <button
                          type="button"
                          onClick={() => onJumpToPage(bm.page_number)}
                          className="flex-1 min-w-0 text-left space-y-1"
                        >
                          <p className="text-xs font-semibold leading-snug">
                            <span className="text-gold-dark tabular-nums">Pág. {bm.page_number}</span>
                            {bm.label && bm.label !== `Página ${bm.page_number}`
                              ? ` · ${bm.label}`
                              : ''}
                          </p>
                          {bm.note && (
                            <p className={cn('text-[11.5px] leading-relaxed line-clamp-3', mutedText)}>
                              {bm.note}
                            </p>
                          )}
                        </button>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditing(bm.page_number, bm)}
                            aria-label={`Editar nota de página ${bm.page_number}`}
                            className="p-1 rounded-md opacity-55 hover:opacity-100 hover:bg-current/5"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveBookmark(bm.page_number)}
                            aria-label={`Eliminar marcador página ${bm.page_number}`}
                            className="p-1 rounded-md opacity-55 hover:opacity-100 hover:text-red-500 hover:bg-current/5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'search' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-current/15 px-3 h-9 bg-current/[0.03]">
                <Search className="h-3.5 w-3.5 opacity-60 shrink-0" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  placeholder="Buscar término o artículo..."
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
                  Escribe al menos 2 caracteres para buscar palabras, artículos o conceptos en todo
                  el documento.
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
                        'w-full text-left rounded-xl border p-2.5 transition-colors space-y-1',
                        cardClass,
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
