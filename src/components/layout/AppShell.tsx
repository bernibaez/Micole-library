import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { cn } from '../../utils/cn';

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <div className="min-h-dvh flex bg-white text-ink">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-[#101D35] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Ir al contenido principal
      </a>

      <Sidebar collapsed={sidebarCollapsed} />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          isHome={isHome}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        />

        <main
          id="contenido-principal"
          className={cn(
            'flex-1 w-full min-w-0',
            isHome
              ? '-mt-16 pb-24 md:pb-14'
              : 'max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-24 md:pb-12'
          )}
        >
          {children}
        </main>

        <footer className="border-t border-line bg-white mt-auto mb-16 md:mb-0">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-ink-muted">
            <p>
              MICOLE LIBRARY © {new Date().getFullYear()} · Biblioteca Jurídica Digital de la República Dominicana
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/explorar" className="hover:text-navy transition-colors">
                Catálogo
              </Link>
              <Link to="/categorias" className="hover:text-navy transition-colors">
                Categorías
              </Link>
              <Link to="/acerca" className="hover:text-navy transition-colors">
                Acerca de
              </Link>
            </div>
          </div>
        </footer>
      </div>

      <MobileNav />
    </div>
  );
}
