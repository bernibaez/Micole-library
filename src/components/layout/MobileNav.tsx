import { NavLink } from 'react-router-dom';
import { m } from 'motion/react';
import { Bookmark, Compass, Heart, Home, User } from 'lucide-react';
import { cn } from '../../utils/cn';
import { EASE_EDITORIAL } from '../../utils/motion';

const MOBILE_ITEMS = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/explorar', label: 'Explorar', icon: Compass },
  { to: '/mi-biblioteca', label: 'Biblioteca', icon: Bookmark },
  { to: '/favoritos', label: 'Favoritos', icon: Heart },
  { to: '/perfil', label: 'Perfil', icon: User },
];

export function MobileNav() {
  return (
    <m.nav
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE_EDITORIAL }}
      aria-label="Navegación móvil"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-line safe-bottom"
    >
      <ul className="grid grid-cols-5 h-16 px-1">
        {MOBILE_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
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
                  <span className="relative inline-flex items-center justify-center h-7 w-12 rounded-full">
                    {isActive && (
                      <m.span
                        initial={{ opacity: 0, scale: 0.75 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2, ease: EASE_EDITORIAL }}
                        className="absolute inset-0 rounded-full bg-navy/10"
                      />
                    )}
                    <Icon
                      className={cn(
                        'relative z-10 h-[19px] w-[19px] transition-colors',
                        isActive ? 'text-navy' : 'text-ink-muted'
                      )}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                  </span>
                  <span className="leading-none">{label}</span>
                </m.span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </m.nav>
  );
}
