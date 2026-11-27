import { Link, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, m } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { AuthIllustration } from './components/AuthIllustration';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { EASE_EDITORIAL } from '../../utils/motion';

export function AuthLayout() {
  const location = useLocation();
  const reducedMotion = useReducedMotion();

  return (
    <div className="min-h-dvh w-full bg-white text-[#111E32] flex flex-col lg:flex-row overflow-x-clip">
      {/* Persistent Illustration Panel (never remounts across auth sub-routes) */}
      <AuthIllustration />

      {/* Right / Bottom Form Section */}
      <main className="flex-1 bg-white flex flex-col justify-between min-w-0 safe-bottom">
        {/* Top-right back to catalog link (desktop & tablet/mobile) */}
        <div className="flex items-center justify-end px-5 sm:px-8 lg:px-10 pt-2 lg:pt-7">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-2 -mr-2 text-[13px] font-medium text-[#667085] hover:text-[#111E32] transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5AA70]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Volver al catálogo</span>
          </Link>
        </div>

        {/* Centered Auth Form Container */}
        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 lg:px-10 py-4 sm:py-6">
          <div className="w-full max-w-[450px] mx-auto">
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={location.pathname}
                initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: EASE_EDITORIAL }}
              >
                <Outlet />
              </m.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Subtle bottom spacer on desktop to keep visual balance */}
        <div className="hidden lg:block h-8 shrink-0" aria-hidden="true" />
      </main>
    </div>
  );
}
