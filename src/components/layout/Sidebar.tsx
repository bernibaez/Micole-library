import { Link, NavLink, useNavigate } from 'react-router-dom';
import { m } from 'motion/react';
import {
  Bookmark,
  Clock,
  Cloud,
  Compass,
  Download,
  FileText,
  FolderTree,
  Heart,
  HelpCircle,
  Home,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Scale,
  Settings,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../../features/auth/AuthContext';
import { cn } from '../../utils/cn';
import { EASE_EDITORIAL } from '../../utils/motion';

const MENU_ITEMS = [
  { to: '/', label: 'Descubrir', icon: Home, end: true },
  { to: '/categorias', label: 'Categorías', icon: LayoutGrid },
  { to: '/explorar', label: 'Explorar', icon: Compass },
  { to: '/mi-biblioteca', label: 'Mi biblioteca', icon: Bookmark },
  { to: '/descargas', label: 'Descargas', icon: Download },
  { to: '/favoritos', label: 'Favoritos', icon: Heart },
  { to: '/recientes', label: 'Recientes', icon: Clock },
];

const ADMIN_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/documentos', label: 'Documentos', icon: FileText },
  { to: '/admin/organizacion', label: 'Organización', icon: FolderTree },
  { to: '/admin/google-drive', label: 'Google Drive', icon: Cloud },
];

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const { isAdmin, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <m.aside
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.26, ease: EASE_EDITORIAL }}
      aria-label="Navegación principal"
      className={cn(
        'hidden md:flex flex-col justify-between sticky top-0 h-dvh border-r border-line/70 bg-white transition-[width] duration-200 ease-out shrink-0 z-20',
        collapsed ? 'w-[78px] px-2.5' : 'w-[244px] px-4'
      )}
    >
      {/* Top Brand Wordmark */}
      <div
        className={cn(
          'h-16 flex items-center shrink-0',
          collapsed ? 'justify-center' : 'px-1.5'
        )}
      >
        <Link to="/" aria-label="MICOLE LIBRARY — Ir al inicio" className="rounded-lg">
          <BrandLogo compact={collapsed} />
        </Link>
      </div>

      {/* Scrollable Menu Groups */}
      <div className="flex-1 py-3 space-y-5 overflow-y-auto no-scrollbar">
        <nav className="space-y-1">
          {!collapsed && (
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-subtle">
              Menú
            </p>
          )}
          {MENU_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl px-2 py-1.5 text-[13.5px] transition-colors duration-150',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'text-navy font-semibold'
                    : 'text-ink-muted hover:text-navy font-medium'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'h-8 w-8 rounded-full inline-flex items-center justify-center shrink-0 transition-all duration-200',
                      isActive
                        ? 'bg-navy text-gold shadow-[0_6px_14px_-4px_rgba(16,29,53,0.45)] scale-[1.03]'
                        : 'bg-sand-soft text-ink-muted group-hover:bg-sand group-hover:text-navy'
                    )}
                  >
                    <Icon className="h-[15px] w-[15px]" strokeWidth={isActive ? 2.1 : 1.85} />
                  </span>
                  {!collapsed && <span className="truncate">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line/70 mx-2" />

        {/* Secondary Actions (Setting, Help, Log out — mirroring reference) */}
        <nav className="space-y-1">
          <NavLink
            to="/configuracion"
            title={collapsed ? 'Configuración' : undefined}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-2 py-1.5 text-[13.5px] transition-colors duration-150',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'text-navy font-semibold'
                  : 'text-ink-muted hover:text-navy font-medium'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'h-8 w-8 rounded-full inline-flex items-center justify-center shrink-0 transition-all duration-200',
                    isActive
                      ? 'bg-navy text-gold shadow-[0_6px_14px_-4px_rgba(16,29,53,0.45)]'
                      : 'bg-sand-soft text-ink-muted group-hover:bg-sand group-hover:text-navy'
                  )}
                >
                  <Settings className="h-[15px] w-[15px] transition-transform duration-200 group-hover:rotate-12" />
                </span>
                {!collapsed && <span className="truncate">Configuración</span>}
              </>
            )}
          </NavLink>

          <NavLink
            to="/acerca"
            title={collapsed ? 'Ayuda y acerca de' : undefined}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-2 py-1.5 text-[13.5px] transition-colors duration-150',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'text-navy font-semibold'
                  : 'text-ink-muted hover:text-navy font-medium'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'h-8 w-8 rounded-full inline-flex items-center justify-center shrink-0 transition-all duration-200',
                    isActive
                      ? 'bg-navy text-gold shadow-[0_6px_14px_-4px_rgba(16,29,53,0.45)]'
                      : 'bg-sand-soft text-ink-muted group-hover:bg-sand group-hover:text-navy'
                  )}
                >
                  <HelpCircle className="h-[15px] w-[15px]" />
                </span>
                {!collapsed && <span className="truncate">Acerca de</span>}
              </>
            )}
          </NavLink>

          {isAuthenticated && (
            <button
              type="button"
              title={collapsed ? 'Cerrar sesión' : undefined}
              onClick={async () => {
                await signOut();
                navigate('/');
              }}
              className={cn(
                'w-full group flex items-center gap-3 rounded-xl px-2 py-1.5 text-[13.5px] font-medium text-ink-muted hover:text-red-700 transition-colors duration-150',
                collapsed && 'justify-center px-0'
              )}
            >
              <span className="h-8 w-8 rounded-full bg-sand-soft text-ink-muted group-hover:bg-red-50 group-hover:text-red-600 inline-flex items-center justify-center shrink-0 transition-colors duration-200">
                <LogOut className="h-[15px] w-[15px]" />
              </span>
              {!collapsed && <span className="truncate">Cerrar sesión</span>}
            </button>
          )}
        </nav>

        {isAdmin && (
          <>
            <div className="border-t border-line/70 mx-2" />
            <nav className="space-y-1">
              {!collapsed && (
                <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-dark">
                  Administración
                </p>
              )}
              {ADMIN_ITEMS.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-xl px-2 py-1.5 text-[13.5px] transition-colors duration-150',
                      collapsed && 'justify-center px-0',
                      isActive
                        ? 'text-navy font-semibold'
                        : 'text-ink-muted hover:text-navy font-medium'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          'h-8 w-8 rounded-full inline-flex items-center justify-center shrink-0 transition-all duration-200',
                          isActive
                            ? 'bg-navy text-gold shadow-[0_6px_14px_-4px_rgba(16,29,53,0.45)]'
                            : 'bg-gold-soft/70 text-gold-dark group-hover:bg-gold-soft group-hover:text-navy'
                        )}
                      >
                        <Icon className="h-[15px] w-[15px]" />
                      </span>
                      {!collapsed && <span className="truncate">{label}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </>
        )}
      </div>

      {/* Bottom Editorial Brand Emblem Card (inspired by reference bottom tile) */}
      {!collapsed && (
        <div className="pt-3 pb-5 border-t border-line/60">
          <Link
            to="/explorar"
            className="group block rounded-2xl bg-gradient-to-br from-navy via-navy-secondary to-[#223B61] p-4 text-white relative overflow-hidden shadow-subtle hover:shadow-cover transition-shadow"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 180 90"
              fill="none"
              className="pointer-events-none absolute inset-0 h-full w-full opacity-35"
            >
              <path
                d="M12 -10C40 24 22 60 58 98"
                stroke="#C5A15B"
                strokeWidth="1.4"
              />
              <path
                d="M124 -8C96 26 146 58 118 98"
                stroke="#C5A15B"
                strokeWidth="1.2"
              />
              <circle cx="44" cy="24" r="5" fill="#C5A15B" />
              <circle cx="130" cy="64" r="8" fill="#101D35" stroke="#C5A15B" strokeWidth="1.5" />
            </svg>
            <div className="relative z-10 flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
                  Rep. Dominicana
                </p>
                <p className="text-xs font-semibold text-white/95 mt-1 leading-snug">
                  Acervo Jurídico Digital
                </p>
              </div>
              <span className="h-9 w-9 rounded-xl bg-white/10 border border-white/15 inline-flex items-center justify-center text-gold shrink-0 group-hover:scale-105 transition-transform">
                <Scale className="h-4 w-4" strokeWidth={1.8} />
              </span>
            </div>
          </Link>
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-subtle mt-2.5">
            MICOLE LIBRARY
          </p>
        </div>
      )}
    </m.aside>
  );
}
