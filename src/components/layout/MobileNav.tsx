import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { m } from 'motion/react';
import {
  Bookmark,
  Clock,
  Compass,
  Download,
  Heart,
  HelpCircle,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  User,
} from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { useAuth } from '../../features/auth/AuthContext';
import { cn } from '../../utils/cn';
import { EASE_EDITORIAL } from '../../utils/motion';

const MOBILE_ITEMS = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/explorar', label: 'Catálogo', icon: Compass },
  { to: '/categorias', label: 'Categorías', icon: LayoutGrid },
  { to: '/mi-biblioteca', label: 'Biblioteca', icon: Bookmark },
];

const MORE_ROUTES = [
  '/favoritos',
  '/recientes',
  '/descargas',
  '/perfil',
  '/configuracion',
  '/acerca',
  '/admin',
];

export function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, signOut } = useAuth();

  const isMoreActive = MORE_ROUTES.some((route) => pathname.startsWith(route));

  return (
    <>
      <m.nav
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: EASE_EDITORIAL }}
        aria-label="Navegación móvil"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-paper/94 backdrop-blur-md border-t border-line/90 safe-bottom"
      >
        <ul className="grid grid-cols-5 h-16 px-1">
          {MOBILE_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to} className="flex">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex-1 flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors',
                    isActive ? 'text-navy font-semibold' : 'text-ink-muted'
                  )
                }
              >
                {({ isActive }) => (
                  <m.span
                    whileTap={{ scale: 0.92 }}
                    transition={{ duration: 0.12 }}
                    className="flex flex-col items-center justify-center gap-1"
                  >
                    <span className="relative inline-flex items-center justify-center h-7 w-11 rounded-full">
                      {isActive && (
                        <m.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.18, ease: EASE_EDITORIAL }}
                          className="absolute inset-0 rounded-full bg-navy/10"
                        />
                      )}
                      <Icon
                        className={cn(
                          'relative z-10 h-[18px] w-[18px] transition-colors',
                          isActive ? 'text-navy' : 'text-ink-muted'
                        )}
                        strokeWidth={isActive ? 2.15 : 1.75}
                      />
                    </span>
                    <span className="leading-none">{label}</span>
                  </m.span>
                )}
              </NavLink>
            </li>
          ))}

          {/* "Más" button for complete access on mobile */}
          <li className="flex">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label="Más secciones"
              aria-expanded={moreOpen}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors',
                isMoreActive || moreOpen ? 'text-navy font-semibold' : 'text-ink-muted'
              )}
            >
              <m.span
                whileTap={{ scale: 0.92 }}
                transition={{ duration: 0.12 }}
                className="flex flex-col items-center justify-center gap-1"
              >
                <span className="relative inline-flex items-center justify-center h-7 w-11 rounded-full">
                  {(isMoreActive || moreOpen) && (
                    <span className="absolute inset-0 rounded-full bg-navy/10" />
                  )}
                  <Menu
                    className={cn(
                      'relative z-10 h-[18px] w-[18px]',
                      isMoreActive || moreOpen ? 'text-navy' : 'text-ink-muted'
                    )}
                    strokeWidth={isMoreActive || moreOpen ? 2.15 : 1.75}
                  />
                </span>
                <span className="leading-none">Más</span>
              </m.span>
            </button>
          </li>
        </ul>
      </m.nav>

      <BottomSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Mi biblioteca y cuenta"
      >
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { to: '/favoritos', label: 'Favoritos', icon: Heart },
              { to: '/recientes', label: 'Recientes', icon: Clock },
              { to: '/descargas', label: 'Descargas', icon: Download },
            ].map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3.5 text-xs font-medium transition-colors',
                  pathname === to
                    ? 'border-navy/25 bg-navy/[0.06] text-navy font-semibold'
                    : 'border-line bg-paper/60 text-ink hover:bg-paper-warm'
                )}
              >
                <Icon className="h-4 w-4 text-gold-dark" />
                <span>{label}</span>
              </Link>
            ))}
          </div>

          <div className="divide-y divide-line/80 rounded-2xl border border-line bg-white overflow-hidden">
            <Link
              to="/perfil"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-navy hover:bg-paper-warm/70"
            >
              <User className="h-4 w-4 text-ink-muted" />
              Mi perfil
            </Link>
            <Link
              to="/configuracion"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-navy hover:bg-paper-warm/70"
            >
              <Settings className="h-4 w-4 text-ink-muted" />
              Configuración
            </Link>
            <Link
              to="/acerca"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-navy hover:bg-paper-warm/70"
            >
              <HelpCircle className="h-4 w-4 text-ink-muted" />
              Acerca de MICOLE LIBRARY
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-forest hover:bg-forest-soft/60"
              >
                <ShieldCheck className="h-4 w-4 text-forest" />
                Panel administrativo
              </Link>
            )}
            {isAuthenticated && (
              <button
                type="button"
                onClick={async () => {
                  setMoreOpen(false);
                  await signOut();
                  navigate('/');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50 text-left"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            )}
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
