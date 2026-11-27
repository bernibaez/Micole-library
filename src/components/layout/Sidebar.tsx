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
  Settings,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../../features/auth/AuthContext';
import { cn } from '../../utils/cn';
import { EASE_EDITORIAL } from '../../utils/motion';

const EXPLORE_ITEMS = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/explorar', label: 'Catálogo', icon: Compass },
  { to: '/categorias', label: 'Categorías', icon: LayoutGrid },
];

const LIBRARY_ITEMS = [
  { to: '/mi-biblioteca', label: 'Mi biblioteca', icon: Bookmark },
  { to: '/favoritos', label: 'Favoritos', icon: Heart },
  { to: '/recientes', label: 'Recientes', icon: Clock },
  { to: '/descargas', label: 'Descargas', icon: Download },
];

const ADMIN_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/documentos', label: 'Documentos', icon: FileText },
  { to: '/admin/organizacion', label: 'Organización', icon: FolderTree },
  { to: '/admin/google-drive', label: 'Google Drive', icon: Cloud },
];

interface NavItemProps {
  to: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
  collapsed: boolean;
  accent?: 'default' | 'admin';
}

function SidebarNavItem({
  to,
  label,
  icon: Icon,
  end,
  collapsed,
  accent = 'default',
}: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-xl py-2 text-[13.5px] transition-all duration-150',
          collapsed ? 'justify-center px-0 mx-auto w-11' : 'px-3',
          isActive
            ? 'bg-navy/[0.075] text-navy font-semibold'
            : 'text-ink-muted hover:bg-navy/[0.04] hover:text-navy font-medium'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !collapsed && (
            <span
              aria-hidden="true"
              className={cn(
                'absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full',
                accent === 'admin' ? 'bg-forest' : 'bg-gold'
              )}
            />
          )}
          <Icon
            className={cn(
              'h-[17px] w-[17px] shrink-0 transition-colors duration-150',
              isActive
                ? accent === 'admin'
                  ? 'text-forest'
                  : 'text-navy'
                : 'text-ink-subtle group-hover:text-navy'
            )}
            strokeWidth={isActive ? 2.1 : 1.75}
          />
          {!collapsed && <span className="truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const { isAdmin, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <m.aside
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.24, ease: EASE_EDITORIAL }}
      aria-label="Navegación principal"
      className={cn(
        'hidden md:flex flex-col justify-between sticky top-0 h-dvh border-r border-line/85 bg-paper/95 backdrop-blur-sm transition-[width] duration-200 ease-out shrink-0 z-20',
        collapsed ? 'w-[72px] px-2' : 'w-[228px] px-3.5'
      )}
    >
      {/* Top Brand Wordmark */}
      <div
        className={cn(
          'h-16 flex items-center shrink-0 border-b border-line/55',
          collapsed ? 'justify-center' : 'px-1.5'
        )}
      >
        <Link to="/" aria-label="MICOLE LIBRARY — Ir al inicio" className="rounded-lg">
          <BrandLogo compact={collapsed} />
        </Link>
      </div>

      {/* Scrollable Semantic Navigation Groups */}
      <div className="flex-1 py-4 space-y-5 overflow-y-auto no-scrollbar">
        <nav aria-label="Explorar" className="space-y-0.5">
          {!collapsed && (
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-subtle">
              Explorar
            </p>
          )}
          {EXPLORE_ITEMS.map((item) => (
            <SidebarNavItem key={item.to} {...item} collapsed={collapsed} />
          ))}
        </nav>

        <div className={cn('border-t border-line/70', collapsed ? 'mx-2' : 'mx-3')} />

        <nav aria-label="Mi biblioteca" className="space-y-0.5">
          {!collapsed && (
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-subtle">
              Mi biblioteca
            </p>
          )}
          {LIBRARY_ITEMS.map((item) => (
            <SidebarNavItem key={item.to} {...item} collapsed={collapsed} />
          ))}
        </nav>

        {isAdmin && (
          <>
            <div className={cn('border-t border-line/70', collapsed ? 'mx-2' : 'mx-3')} />
            <nav aria-label="Administración" className="space-y-0.5">
              {!collapsed && (
                <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-forest">
                  Administración
                </p>
              )}
              {ADMIN_ITEMS.map((item) => (
                <SidebarNavItem
                  key={item.to}
                  {...item}
                  collapsed={collapsed}
                  accent="admin"
                />
              ))}
            </nav>
          </>
        )}
      </div>

      {/* Quiet Editorial Bottom Utility Bar */}
      <div className="py-3 border-t border-line/70 space-y-0.5">
        <SidebarNavItem
          to="/configuracion"
          label="Configuración"
          icon={Settings}
          collapsed={collapsed}
        />
        <SidebarNavItem
          to="/acerca"
          label="Acerca de"
          icon={HelpCircle}
          collapsed={collapsed}
        />
        {isAuthenticated && (
          <button
            type="button"
            title={collapsed ? 'Cerrar sesión' : undefined}
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
            className={cn(
              'w-full group flex items-center gap-3 rounded-xl py-2 text-[13.5px] font-medium text-ink-muted hover:bg-red-50/80 hover:text-red-700 transition-colors duration-150',
              collapsed ? 'justify-center px-0 mx-auto w-11' : 'px-3'
            )}
          >
            <LogOut
              className="h-[17px] w-[17px] shrink-0 text-ink-subtle group-hover:text-red-600 transition-colors"
              strokeWidth={1.75}
            />
            {!collapsed && <span className="truncate">Cerrar sesión</span>}
          </button>
        )}
      </div>
    </m.aside>
  );
}
