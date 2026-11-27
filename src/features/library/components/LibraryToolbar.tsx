import { ArrowUpDown, LayoutGrid, List, Search, X } from 'lucide-react';
import { cn } from '../../../utils/cn';

export type LibrarySortOption =
  | 'recent'
  | 'oldest'
  | 'title_asc'
  | 'title_desc'
  | 'last_read'
  | 'progress';

export type LibraryViewMode = 'grid' | 'list';

interface LibraryToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: LibrarySortOption;
  onSortChange: (value: LibrarySortOption) => void;
  viewMode: LibraryViewMode;
  onViewModeChange: (value: LibraryViewMode) => void;
  placeholder?: string;
  totalResults: number;
}

const SORT_LABELS: Record<LibrarySortOption, string> = {
  recent: 'Más recientes',
  oldest: 'Más antiguos',
  title_asc: 'Título A–Z',
  title_desc: 'Título Z–A',
  last_read: 'Última lectura',
  progress: 'Progreso de lectura',
};

export function LibraryToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
  placeholder = 'Buscar en mi biblioteca...',
  totalResults,
}: LibraryToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Search input */}
      <div className="relative flex-1 sm:max-w-md flex items-center h-11 sm:h-10 rounded-xl border border-[#E5E3DD] bg-white px-3.5 focus-within:border-[#111E32] focus-within:ring-4 focus-within:ring-[#111E32]/[0.05] transition-all">
        <Search className="h-4 w-4 text-[#667085] shrink-0 mr-2.5" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full min-w-0 bg-transparent text-base sm:text-sm text-[#111E32] placeholder:text-[#667085]/80 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Limpiar búsqueda"
            className="h-8 w-8 -mr-1.5 rounded-lg inline-flex items-center justify-center text-[#667085] hover:text-[#111E32] hover:bg-[#F6F5F1] transition-colors"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Right controls: count, sort, view mode */}
      <div className="flex items-center justify-between sm:justify-end gap-2.5">
        <span className="text-xs text-[#667085] tabular-nums hidden md:inline">
          {totalResults} {totalResults === 1 ? 'documento' : 'documentos'}
        </span>

        {/* Sort select */}
        <div className="relative flex items-center h-11 sm:h-10 rounded-xl border border-[#E5E3DD] bg-white px-3 text-[#111E32] focus-within:border-[#111E32] transition-colors flex-1 sm:flex-initial">
          <ArrowUpDown className="h-3.5 w-3.5 text-[#667085] mr-2 shrink-0" aria-hidden="true" />
          <label htmlFor="library-sort" className="sr-only">
            Ordenar documentos
          </label>
          <select
            id="library-sort"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as LibrarySortOption)}
            className="w-full sm:w-auto bg-transparent text-xs sm:text-[13px] font-medium text-[#111E32] focus:outline-none cursor-pointer pr-1"
          >
            {(Object.entries(SORT_LABELS) as Array<[LibrarySortOption, string]>).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </div>

        {/* View Mode Switcher */}
        <div
          role="group"
          aria-label="Modo de visualización"
          className="inline-flex items-center h-11 sm:h-10 rounded-xl border border-[#E5E3DD] bg-white p-1 shrink-0"
        >
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            aria-label="Vista de cuadrícula"
            aria-pressed={viewMode === 'grid'}
            title="Vista de cuadrícula"
            className={cn(
              'h-9 sm:h-8 w-9 sm:w-8 rounded-lg inline-flex items-center justify-center transition-colors',
              viewMode === 'grid'
                ? 'bg-[#111E32] text-[#E5C784]'
                : 'text-[#667085] hover:text-[#111E32]'
            )}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            aria-label="Vista de lista"
            aria-pressed={viewMode === 'list'}
            title="Vista de lista"
            className={cn(
              'h-9 sm:h-8 w-9 sm:w-8 rounded-lg inline-flex items-center justify-center transition-colors',
              viewMode === 'list'
                ? 'bg-[#111E32] text-[#E5C784]'
                : 'text-[#667085] hover:text-[#111E32]'
            )}
          >
            <List className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
