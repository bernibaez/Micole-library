import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, m } from 'motion/react';
import { ArrowUpRight, BookOpen, Clock, Search, X } from 'lucide-react';
import { useBooksQuery } from '../library/useLibraryData';
import { LexNotFoundMascot } from '../../components/mascot/LexNotFoundMascot';
import { useDebounce } from '../../hooks/useDebounce';
import { normalizeText } from '../../utils/format';
import { EASE_EDITORIAL, TRANSITION_MICRO } from '../../utils/motion';
import { cn } from '../../utils/cn';

const RECENT_SEARCHES_KEY = 'lexlibrary:v2:recent-searches';

function readRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string').slice(0, 6) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(term: string): string[] {
  const clean = term.trim();
  if (!clean) return readRecentSearches();
  const next = [clean, ...readRecentSearches().filter((s) => s.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function GlobalSearch({ className, placeholder = 'Buscar libros, leyes, autores o temas...' }: { className?: string; placeholder?: string }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => readRecentSearches());
  const debounced = useDebounce(query, 180);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { data: books = [] } = useBooksQuery();

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('mousedown', onOutside);
    window.addEventListener('keydown', onShortcut);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('keydown', onShortcut);
    };
  }, []);

  const suggestions = useMemo(() => {
    const term = normalizeText(debounced);
    if (!term) return [];
    return books
      .filter((b) => {
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
  }, [books, debounced]);

  const submitSearch = (term: string) => {
    const clean = term.trim();
    if (clean) {
      setRecent(saveRecentSearch(clean));
    }
    setOpen(false);
    navigate(clean ? `/explorar?q=${encodeURIComponent(clean)}` : '/explorar');
  };

  const clearRecent = (term: string) => {
    const next = recent.filter((item) => item !== term);
    setRecent(next);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  };

  const showDropdown = open && (suggestions.length > 0 || (query.trim().length === 0 && recent.length > 0) || query.trim().length > 0);

  return (
    <div ref={containerRef} className={cn('relative w-full max-w-xl', className)}>
      <m.form
        animate={{ scale: open ? 1.012 : 1 }}
        transition={{ duration: 0.18, ease: EASE_EDITORIAL }}
        onSubmit={(e) => {
          e.preventDefault();
          submitSearch(query);
        }}
        role="search"
        className={cn(
          'flex items-center gap-2.5 h-10 rounded-full bg-surface-secondary border transition-all duration-200 px-3.5 origin-center',
          open
            ? 'bg-white border-navy/35 shadow-subtle ring-2 ring-navy/5'
            : 'border-transparent hover:border-line-strong'
        )}
      >
        <Search className="h-4 w-4 text-ink-muted shrink-0" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder={placeholder}
          aria-label="Buscar en MICOLE LIBRARY"
          className="w-full min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-subtle focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label="Limpiar búsqueda"
            className="h-6 w-6 rounded-full inline-flex items-center justify-center text-ink-muted hover:text-navy hover:bg-surface-secondary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-ink-subtle bg-white border border-line rounded">
            Ctrl K
          </kbd>
        )}
      </m.form>

      <AnimatePresence>
        {showDropdown && (
          <m.div
            initial={{ opacity: 0, y: 6, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.985 }}
            transition={TRANSITION_MICRO}
            className="absolute left-0 right-0 mt-2 rounded-2xl bg-white border border-line shadow-popover overflow-hidden z-40"
          >
            {query.trim().length === 0 ? (
              <div className="p-2">
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
                  Búsquedas recientes
                </div>
                <ul>
                  {recent.map((item) => (
                    <li key={item} className="flex items-center group">
                      <button
                        type="button"
                        onClick={() => {
                          setQuery(item);
                          submitSearch(item);
                        }}
                        className="flex-1 flex items-center gap-2.5 px-3 py-2 text-sm text-ink hover:bg-surface-secondary rounded-lg text-left"
                      >
                        <Clock className="h-3.5 w-3.5 text-ink-subtle shrink-0" />
                        <span className="truncate">{item}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => clearRecent(item)}
                        aria-label={`Eliminar búsqueda ${item}`}
                        className="p-1.5 mr-1 text-ink-subtle hover:text-navy opacity-70 hover:opacity-100 rounded-md"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
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
                              setOpen(false);
                              navigate(`/libro/${book.id}`);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-secondary text-left transition-colors"
                          >
                            <span
                              className="h-10 w-7 rounded-[3px] shrink-0 flex items-center justify-center text-[9px] text-white font-serif shadow-sm"
                              style={{ backgroundColor: book.color }}
                            >
                              {book.cover_url ? (
                                <img
                                  src={book.cover_url}
                                  alt=""
                                  className="h-full w-full object-cover rounded-[3px]"
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
                      Prueba con otro término o revisa todo el catálogo.
                    </p>
                  </div>
                )}
                <div className="border-t border-line mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => submitSearch(query)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-navy hover:bg-surface-secondary"
                  >
                    <span>Buscar "{query}" en todo el catálogo</span>
                    <Search className="h-3.5 w-3.5 text-gold-dark" />
                  </button>
                </div>
              </div>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
