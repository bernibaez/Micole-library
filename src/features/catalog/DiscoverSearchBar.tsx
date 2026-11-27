import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, m } from 'motion/react';
import { ArrowUpRight, BookOpen, Check, ChevronDown, Search, X } from 'lucide-react';
import { useBooksQuery } from '../library/useLibraryData';
import { saveRecentSearch } from './GlobalSearch';
import { LexNotFoundMascot } from '../../components/mascot/LexNotFoundMascot';
import { useDebounce } from '../../hooks/useDebounce';
import { normalizeText } from '../../utils/format';
import { TRANSITION_MICRO } from '../../utils/motion';
import { cn } from '../../utils/cn';
import type { CategoryInfo } from '../../types';

interface DiscoverSearchBarProps {
  categories: CategoryInfo[];
  className?: string;
}

export function DiscoverSearchBar({ categories, className }: DiscoverSearchBarProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [catOpen, setCatOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const debounced = useDebounce(query, 180);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { data: books = [] } = useBooksQuery();

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setCatOpen(false);
        setSearchOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCatOpen(false);
        setSearchOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setSearchOpen(true);
      }
    };
    document.addEventListener('mousedown', onOutside);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const suggestions = useMemo(() => {
    const term = normalizeText(debounced);
    if (!term) return [];
    return books
      .filter((b) => {
        if (
          selectedCategory &&
          b.category.toLowerCase() !== selectedCategory.toLowerCase()
        ) {
          return false;
        }
        const haystack = normalizeText(
          [
            b.title,
            b.author,
            b.category,
            b.subject ?? '',
            b.court ?? '',
            b.judgment_number ?? '',
            ...(b.keywords ?? []),
          ].join(' ')
        );
        return haystack.includes(term);
      })
      .slice(0, 5);
  }, [books, debounced, selectedCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim();
    if (clean) {
      saveRecentSearch(clean);
    }
    const params = new URLSearchParams();
    if (clean) params.set('q', clean);
    if (selectedCategory) params.set('categoria', selectedCategory);
    setSearchOpen(false);
    setCatOpen(false);
    const qs = params.toString();
    navigate(qs ? `/explorar?${qs}` : '/explorar');
  };

  return (
    <div ref={wrapperRef} className={cn('relative w-full max-w-[600px]', className)}>
      <form
        onSubmit={handleSubmit}
        role="search"
        className="flex items-center bg-white rounded-full shadow-subtle border border-line p-1.5 gap-1 transition-all focus-within:border-navy/35 focus-within:ring-2 focus-within:ring-navy/10"
      >
        {/* Category Selector Dropdown */}
        <div className="relative shrink-0 hidden sm:block">
          <button
            type="button"
            onClick={() => {
              setCatOpen((v) => !v);
              setSearchOpen(false);
            }}
            aria-expanded={catOpen}
            className="h-9 px-3.5 rounded-full inline-flex items-center gap-1.5 text-xs font-medium text-ink hover:text-navy hover:bg-paper-warm transition-colors max-w-[162px]"
          >
            <span className="truncate">{selectedCategory || 'Todas las categorías'}</span>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-ink-subtle shrink-0 transition-transform duration-150',
                catOpen && 'rotate-180'
              )}
            />
          </button>

          <AnimatePresence>
            {catOpen && (
              <m.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={TRANSITION_MICRO}
                className="absolute left-0 mt-2.5 w-60 rounded-2xl bg-white border border-line shadow-popover p-1.5 z-40 max-h-72 overflow-y-auto"
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('');
                    setCatOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs text-left transition-colors',
                    selectedCategory === ''
                      ? 'bg-sand-soft text-navy font-semibold'
                      : 'text-ink hover:bg-surface-secondary'
                  )}
                >
                  <span>Todas las categorías</span>
                  {selectedCategory === '' && <Check className="h-3.5 w-3.5 text-gold-dark" />}
                </button>
                {categories.map((cat) => {
                  const active = selectedCategory === cat.name;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.name);
                        setCatOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs text-left transition-colors',
                        active
                          ? 'bg-sand-soft text-navy font-semibold'
                          : 'text-ink hover:bg-surface-secondary'
                      )}
                    >
                      <span className="truncate">{cat.name}</span>
                      {active && <Check className="h-3.5 w-3.5 text-gold-dark shrink-0" />}
                    </button>
                  );
                })}
              </m.div>
            )}
          </AnimatePresence>
        </div>

        {/* Subtle Vertical Divider */}
        <div className="hidden sm:block h-6 w-px bg-line shrink-0" aria-hidden="true" />

        {/* Search Input */}
        <div className="flex-1 flex items-center gap-2 px-2.5 min-w-0">
          <Search className="h-4 w-4 text-ink-subtle shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onFocus={() => {
              setSearchOpen(true);
              setCatOpen(false);
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            placeholder="Busca el libro, ley o criterio que necesitas..."
            aria-label="Buscar en MICOLE LIBRARY"
            className="w-full min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-subtle focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Limpiar búsqueda"
              className="h-6 w-6 rounded-full inline-flex items-center justify-center text-ink-subtle hover:text-navy hover:bg-surface-secondary shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="h-9 px-4 sm:px-5 rounded-full bg-navy text-white text-xs sm:text-[13px] font-semibold hover:bg-navy-secondary active:scale-[0.98] transition-all shrink-0"
        >
          Buscar
        </button>
      </form>

      {/* Instant Quick Matches Popover */}
      <AnimatePresence>
        {searchOpen && query.trim().length > 0 && (
          <m.div
            initial={{ opacity: 0, y: 6, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.985 }}
            transition={TRANSITION_MICRO}
            className="absolute left-0 right-0 mt-2 rounded-2xl bg-white border border-line shadow-popover overflow-hidden z-40"
          >
            <div className="p-2">
              {suggestions.length > 0 ? (
                <>
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
                    Coincidencias rápidas
                  </div>
                  <ul>
                    {suggestions.map((book) => (
                      <li key={book.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchOpen(false);
                            navigate(`/libro/${book.id}`);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-sand-soft text-left transition-colors"
                        >
                          <span
                            className="h-10 w-7 rounded-[4px] shrink-0 flex items-center justify-center text-white shadow-sm overflow-hidden"
                            style={{ backgroundColor: book.color }}
                          >
                            {book.cover_url ? (
                              <img
                                src={book.cover_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <BookOpen className="h-3.5 w-3.5 text-gold" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-navy truncate">{book.title}</p>
                            <p className="text-xs text-ink-muted truncate">
                              {book.author} · {book.category}
                            </p>
                          </div>
                          <ArrowUpRight className="h-4 w-4 text-ink-subtle shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="flex flex-col items-center text-center px-4 py-4 gap-1.5">
                  <LexNotFoundMascot compact />
                  <p className="text-xs font-semibold text-navy">
                    No encontramos "{query}"
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    Intenta con otro título, autor o categoría jurídica.
                  </p>
                </div>
              )}
              <div className="border-t border-line mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    saveRecentSearch(query.trim());
                    setSearchOpen(false);
                    const params = new URLSearchParams({ q: query.trim() });
                    if (selectedCategory) params.set('categoria', selectedCategory);
                    navigate(`/explorar?${params.toString()}`);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-navy hover:bg-sand-soft"
                >
                  <span>
                    Buscar "{query}"{selectedCategory ? ` en ${selectedCategory}` : ' en todo el catálogo'}
                  </span>
                  <Search className="h-3.5 w-3.5 text-gold-dark" />
                </button>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
