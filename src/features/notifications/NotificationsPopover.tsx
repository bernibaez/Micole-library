import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, m } from 'motion/react';
import { Bell, BookOpen, CheckCheck, Info, Sparkles } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useNotificationsQuery } from '../library/useLibraryData';
import { formatRelativeDate } from '../../utils/format';
import { TRANSITION_MICRO } from '../../utils/motion';
import { cn } from '../../utils/cn';

export function NotificationsPopover() {
  const { isAuthenticated } = useAuth();
  const { items, unreadCount, markRead, markAllRead } = useNotificationsQuery();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
        aria-expanded={open}
        className="relative h-10 w-10 rounded-full inline-flex items-center justify-center text-ink-muted hover:text-navy hover:bg-surface-secondary transition-colors"
      >
        <Bell className="h-[19px] w-[19px]" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-gold ring-2 ring-white" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={TRANSITION_MICRO}
            className="absolute right-0 mt-2 w-[320px] sm:w-[360px] rounded-2xl bg-white border border-line shadow-popover overflow-hidden z-40"
          >
            <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-navy">Notificaciones</h2>
                {unreadCount > 0 && (
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-gold-soft text-gold-dark">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="text-xs font-medium text-navy hover:text-gold-dark inline-flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Marcar todo
                </button>
              )}
            </div>

            {!isAuthenticated ? (
              <div className="p-6 text-center space-y-2">
                <p className="text-sm font-medium text-navy">Mantente al día con tu biblioteca</p>
                <p className="text-xs text-ink-muted">
                  Inicia sesión para recibir avisos sobre nuevos recursos jurídicos y tu actividad de lectura.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate('/iniciar-sesion');
                  }}
                  className="mt-2 inline-flex items-center justify-center rounded-lg bg-navy text-white text-xs font-medium px-3.5 py-2 hover:bg-navy-secondary"
                >
                  Iniciar sesión
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-navy">Sin notificaciones</p>
                <p className="text-xs text-ink-muted mt-1">Estás al día con toda tu actividad.</p>
              </div>
            ) : (
              <ul className="max-h-80 overflow-y-auto divide-y divide-line">
                {items.map((item) => {
                  const unread = !item.read_at;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (unread) void markRead(item.id);
                          setOpen(false);
                          if (item.action_url) navigate(item.action_url);
                        }}
                        className={cn(
                          'w-full text-left px-4 py-3 hover:bg-surface-secondary/70 transition-colors flex gap-3 items-start',
                          unread && 'bg-gold-soft/30'
                        )}
                      >
                        <span className="mt-0.5 h-7 w-7 rounded-lg bg-surface-secondary text-navy inline-flex items-center justify-center shrink-0">
                          {item.type === 'reading' ? (
                            <BookOpen className="h-3.5 w-3.5 text-gold-dark" />
                          ) : item.type === 'new_book' ? (
                            <Sparkles className="h-3.5 w-3.5 text-gold-dark" />
                          ) : (
                            <Info className="h-3.5 w-3.5 text-navy" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-navy leading-snug">{item.title}</p>
                            {unread && <span className="h-2 w-2 rounded-full bg-gold shrink-0 mt-1" />}
                          </div>
                          <p className="text-xs text-ink-muted mt-0.5 line-clamp-2 leading-relaxed">
                            {item.body}
                          </p>
                          <span className="block text-[11px] text-ink-subtle mt-1">
                            {formatRelativeDate(item.created_at)}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
