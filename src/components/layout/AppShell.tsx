import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { PwaInstallBanner } from './PwaInstallBanner';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { cn } from '../../utils/cn';

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 && window.innerWidth < 1140 : false
  );
  const { canPromptNative, promptInstall } = usePwaInstall();
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const isCatalog = pathname === '/explorar' || pathname === '/biblioteca';

  return (
    <div className="min-h-dvh flex bg-paper text-ink">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-navy focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Ir al contenido principal
      </a>

      <Sidebar collapsed={sidebarCollapsed} />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          isHome={isHome}
          hideSearch={isHome || isCatalog}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        />

        <main
          id="contenido-principal"
          className={cn(
            'flex-1 w-full min-w-0',
            isHome
              ? 'pb-24 md:pb-14'
              : 'max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 pt-5 sm:pt-7 pb-24 md:pb-14'
          )}
        >
          {children}
        </main>

        <footer className="border-t border-line/80 bg-paper mt-auto mb-16 md:mb-0">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-ink-muted">
            <p>
              MICOLE LIBRARY © {new Date().getFullYear()} · Biblioteca Jurídica Digital de la República Dominicana
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <Link to="/explorar" className="hover:text-navy transition-colors">
                Catálogo
              </Link>
              <Link to="/categorias" className="hover:text-navy transition-colors">
                Categorías
              </Link>
              <Link to="/acerca" className="hover:text-navy transition-colors">
                Acerca de
              </Link>
              {canPromptNative && (
                <button
                  type="button"
                  onClick={() => void promptInstall()}
                  className="font-semibold text-gold-dark hover:text-navy transition-colors"
                >
                  Instalar app
                </button>
              )}
            </div>
          </div>
        </footer>
      </div>

      <PwaInstallBanner />
      <MobileNav />
    </div>
  );
}
