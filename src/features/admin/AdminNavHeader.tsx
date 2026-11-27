import { NavLink } from 'react-router-dom';
import { Cloud, FileText, FolderTree, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { cn } from '../../utils/cn';

const ADMIN_TABS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/documentos', label: 'Gestión documental', icon: FileText },
  { to: '/admin/organizacion', label: 'Categorías y carpetas', icon: FolderTree },
  { to: '/admin/google-drive', label: 'Google Drive', icon: Cloud },
];

export function AdminNavHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sand-soft border border-line px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold-dark">
            <ShieldCheck className="h-3.5 w-3.5" />
            Administración · MICOLE LIBRARY
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-navy tracking-tight leading-tight">
            {title}
          </h1>
          <p className="text-sm text-ink-muted max-w-2xl leading-relaxed">{subtitle}</p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>

      <nav
        aria-label="Secciones de administración"
        className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-sand-soft/80 border border-line/80 p-1.5 no-scrollbar"
      >
        {ADMIN_TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-150',
                isActive
                  ? 'bg-navy text-white shadow-sm'
                  : 'text-ink-muted hover:text-navy hover:bg-white/80'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    isActive ? 'text-gold' : 'text-ink-subtle'
                  )}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
