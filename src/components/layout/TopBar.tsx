import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, m, useMotionValueEvent, useScroll } from 'motion/react';
import {
  Bookmark,
  ChevronDown,
  LogIn,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  User,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { GlobalSearch } from '../../features/catalog/GlobalSearch';
import { NotificationsPopover } from '../../features/notifications/NotificationsPopover';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { useAuth } from '../../features/auth/AuthContext';
import { cn } from '../../utils/cn';
import { EASE_EDITORIAL, TRANSITION_MICRO } from '../../utils/motion';

interface TopBarProps {
  isHome?: boolean;
  hideSearch?: boolean;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function TopBar({
  isHome = false,
  hideSearch = false,
  sidebarCollapsed,
  onToggleSidebar,
}: TopBarProps) {
  const { isAuthenticated, isAdmin, profile, user, isDemoSession, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const isScrolled = latest > 12;
    if (isScrolled !== scrolled) setScrolled(isScrolled);
  });

  useEffect(() => {
    if (!menuOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() ||
    user?.email?.split('@')[0] ||
    'Mi cuenta';

  return (
    <m.header
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: EASE_EDITORIAL }}
      className={cn(
        'sticky top-0 z-30 h-14 sm:h-16 px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-3 sm:gap-5 transition-[background-color,box-shadow,border-color] duration-200',
        scrolled
          ? 'bg-paper/92 backdrop-blur-md border-b border-line shadow-subtle'
          : isHome
            ? 'bg-paper/80 backdrop-blur-sm border-b border-transparent'
            : 'bg-paper/90 backdrop-blur-sm border-b border-line/70'
      )}
    >
      {/* Left: Sidebar toggle on desktop, BrandLogo on mobile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
          className="hidden md:inline-flex h-9 w-9 rounded-xl items-center justify-center text-ink-muted hover:text-navy hover:bg-navy/[0.06] transition-colors"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.75} />
          ) : (
            <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.75} />
          )}
        </button>

        <Link to="/" aria-label="MICOLE LIBRARY — Ir al inicio" className="md:hidden rounded-lg">
          <BrandLogo compact={false} className="hidden sm:inline-flex" />
          <BrandLogo compact className="inline-flex sm:hidden" />
        </Link>
      </div>

      {/* Center: GlobalSearch when page doesn't have its own primary search bar */}
      {!hideSearch ? (
        <div className="flex-1 flex justify-center max-w-xl min-w-0">
          <GlobalSearch />
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Right: Admin badge, User profile pill, and Notification Bell */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {isAdmin && (
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 h-8 sm:h-9 px-3 rounded-full bg-forest text-white text-xs font-medium hover:bg-forest-hover transition-colors shadow-subtle"
            title="Ir al Panel Administrativo"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-gold" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        )}

        {isAuthenticated ? (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label="Menú del perfil"
              className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 hover:bg-navy/[0.06] transition-colors"
            >
              <Avatar
                src={profile?.avatar_url}
                firstName={profile?.first_name}
                lastName={profile?.last_name}
                email={profile?.email ?? user?.email}
                size="sm"
              />
              <span className="hidden sm:block text-sm font-medium text-navy max-w-[136px] truncate">
                {displayName}
              </span>
              <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-ink-muted" />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <m.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={TRANSITION_MICRO}
                  className="absolute right-0 mt-2 w-60 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white border border-line shadow-popover p-1.5 z-40"
                >
                  <div className="px-3 py-2.5 border-b border-line mb-1">
                    <p className="text-sm font-semibold text-navy truncate">{displayName}</p>
                    <p className="text-xs text-ink-muted truncate">
                      {profile?.email ?? user?.email}
                    </p>
                    {isDemoSession && (
                      <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wider text-gold-dark bg-gold-soft px-2 py-0.5 rounded-full">
                        Sesión local demo
                      </span>
                    )}
                  </div>
                  <Link
                    to="/perfil"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-ink hover:bg-paper-warm hover:text-navy"
                  >
                    <User className="h-4 w-4 text-ink-muted" />
                    Mi perfil
                  </Link>
                  <Link
                    to="/mi-biblioteca"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-ink hover:bg-paper-warm hover:text-navy"
                  >
                    <Bookmark className="h-4 w-4 text-ink-muted" />
                    Mi biblioteca
                  </Link>
                  <Link
                    to="/configuracion"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-ink hover:bg-paper-warm hover:text-navy"
                  >
                    <Settings className="h-4 w-4 text-ink-muted" />
                    Configuración
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-forest hover:bg-forest-soft"
                    >
                      <ShieldCheck className="h-4 w-4 text-forest" />
                      Panel administrativo
                    </Link>
                  )}
                  <div className="border-t border-line my-1" />
                  <button
                    type="button"
                    onClick={async () => {
                      setMenuOpen(false);
                      await signOut();
                      navigate('/');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </button>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/iniciar-sesion" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm">
                Iniciar sesión
              </Button>
            </Link>
            <Link to="/iniciar-sesion" className="sm:hidden" aria-label="Iniciar sesión">
              <Button variant="secondary" size="icon">
                <LogIn className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/crear-cuenta" className="hidden sm:inline-flex">
              <Button variant="primary" size="sm" className="rounded-full px-4">
                Crear cuenta
              </Button>
            </Link>
          </div>
        )}

        <NotificationsPopover />
      </div>
    </m.header>
  );
}
