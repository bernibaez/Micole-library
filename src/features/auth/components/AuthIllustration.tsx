import { m } from 'motion/react';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { EASE_EDITORIAL, HERO_CONTAINER_VARIANTS, HERO_ITEM_VARIANTS } from '../../../utils/motion';
import { AuthBrand } from './AuthBrand';

function AmbientBookshelf() {
  const shelves = [
    [
      { w: 'w-3', h: 'h-14', bg: 'bg-[#2C4062]' },
      { w: 'w-2.5', h: 'h-12', bg: 'bg-[#4E3832]' },
      { w: 'w-3.5', h: 'h-15', bg: 'bg-[#23334F]' },
      { w: 'w-2.5', h: 'h-13', bg: 'bg-[#7A6238]' },
      { w: 'w-3', h: 'h-14', bg: 'bg-[#2A3D5C]' },
      { w: 'w-2', h: 'h-11', bg: 'bg-[#3D4B63]' },
      { w: 'w-3', h: 'h-14', bg: 'bg-[#543D37]' },
    ],
    [
      { w: 'w-3.5', h: 'h-14', bg: 'bg-[#253654]' },
      { w: 'w-2.5', h: 'h-13', bg: 'bg-[#6F5833]' },
      { w: 'w-3', h: 'h-15', bg: 'bg-[#2E4264]' },
      { w: 'w-2.5', h: 'h-12', bg: 'bg-[#4A3531]' },
      { w: 'w-3', h: 'h-14', bg: 'bg-[#1F2F4A]' },
      { w: 'w-3', h: 'h-13', bg: 'bg-[#384A69]' },
    ],
    [
      { w: 'w-3', h: 'h-14', bg: 'bg-[#4F3934]' },
      { w: 'w-3', h: 'h-15', bg: 'bg-[#273957]' },
      { w: 'w-2.5', h: 'h-12', bg: 'bg-[#765F37]' },
      { w: 'w-3.5', h: 'h-14', bg: 'bg-[#22324D]' },
      { w: 'w-2.5', h: 'h-13', bg: 'bg-[#3A4D6D]' },
    ],
  ];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-0 w-36 sm:w-44 lg:w-52 overflow-hidden opacity-40"
      style={{
        maskImage: 'linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0) 100%)',
        WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0) 100%)',
      }}
    >
      <div className="absolute inset-0 -left-6 top-20 sm:top-24 flex flex-col gap-5 -rotate-[2deg] blur-[2px]">
        {shelves.map((books, shelfIdx) => (
          <div key={shelfIdx} className="flex flex-col">
            <div className="flex items-end gap-1 px-2">
              {books.map((book, bookIdx) => (
                <div
                  key={bookIdx}
                  className={`${book.w} ${book.h} ${book.bg} rounded-t-[2px] border-t border-white/10`}
                />
              ))}
            </div>
            <div className="h-2.5 w-full bg-[#241B19] border-t border-[#5A4439]/40 shadow-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScaleOfJusticePedestal({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={className}>
      {/* Golden Scale of Justice SVG */}
      <svg
        viewBox="0 0 180 175"
        fill="none"
        className="w-28 sm:w-32 lg:w-36 xl:w-40 h-auto mx-auto drop-shadow-[0_10px_22px_rgba(17,30,50,0.22)]"
      >
        <defs>
          <linearGradient id="goldScaleGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F1DBA4" />
            <stop offset="48%" stopColor="#C5AA70" />
            <stop offset="100%" stopColor="#8E7238" />
          </linearGradient>
          <linearGradient id="goldDarkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C5AA70" />
            <stop offset="100%" stopColor="#775D29" />
          </linearGradient>
        </defs>

        {/* Top finial */}
        <circle cx="90" cy="18" r="5.5" fill="url(#goldScaleGrad)" />
        <path d="M90 23 V140" stroke="url(#goldScaleGrad)" strokeWidth="5" strokeLinecap="round" />

        {/* Crossbar */}
        <path
          d="M28 42 Q60 32 90 36 Q120 32 152 42"
          stroke="url(#goldScaleGrad)"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <circle cx="28" cy="42" r="3.5" fill="url(#goldScaleGrad)" />
        <circle cx="152" cy="42" r="3.5" fill="url(#goldScaleGrad)" />

        {/* Left chains & pan */}
        <path d="M28 44 L14 96" stroke="#C5AA70" strokeWidth="1.5" />
        <path d="M28 44 L28 96" stroke="#C5AA70" strokeWidth="1.5" />
        <path d="M28 44 L42 96" stroke="#C5AA70" strokeWidth="1.5" />
        <path
          d="M11 96 Q28 112 45 96 Z"
          fill="url(#goldScaleGrad)"
          stroke="#8E7238"
          strokeWidth="1"
        />

        {/* Right chains & pan */}
        <path d="M152 44 L138 96" stroke="#C5AA70" strokeWidth="1.5" />
        <path d="M152 44 L152 96" stroke="#C5AA70" strokeWidth="1.5" />
        <path d="M152 44 L166 96" stroke="#C5AA70" strokeWidth="1.5" />
        <path
          d="M135 96 Q152 112 169 96 Z"
          fill="url(#goldScaleGrad)"
          stroke="#8E7238"
          strokeWidth="1"
        />

        {/* Pedestal base */}
        <path d="M72 140 H108 L114 148 H66 Z" fill="url(#goldScaleGrad)" />
        <rect x="60" y="148" width="60" height="7" rx="3" fill="url(#goldDarkGrad)" />
      </svg>

      {/* Dark slate/navy desk surface */}
      <div className="w-40 sm:w-44 lg:w-48 h-12 sm:h-16 lg:h-20 bg-gradient-to-b from-[#23324B] to-[#111E32] rounded-t-lg border-t-2 border-[#394D6E]/70 shadow-[0_8px_24px_rgba(17,30,50,0.28)]" />
    </div>
  );
}

export function AuthIllustration() {
  const reducedMotion = useReducedMotion();

  return (
    <>
      {/* ============================================================
          DESKTOP LEFT PANEL (>= 1024px) — 55% width + Organic Curve
         ============================================================ */}
      <aside
        aria-hidden="true"
        className="hidden lg:flex lg:w-[55%] xl:w-[55%] shrink-0 relative bg-gradient-to-br from-[#111E32] via-[#132238] to-[#192B45] text-white flex-col justify-between overflow-hidden select-none min-h-dvh"
      >
        {/* Subtle ambient concentric rings */}
        <div className="pointer-events-none absolute -top-24 right-14 h-72 w-72 rounded-full border border-white/[0.06]" />
        <div className="pointer-events-none absolute -top-8 right-28 h-48 w-48 rounded-full border border-[#C5AA70]/10" />

        {/* Blurred legal bookshelf on the left */}
        <AmbientBookshelf />

        {/* Soft ambient glow behind characters */}
        <div className="pointer-events-none absolute bottom-12 left-[24%] h-72 w-72 rounded-full bg-[#24406D]/40 blur-3xl" />

        {/* Top content: Brand + Headline + Description */}
        <div className="relative z-20 pt-9 xl:pt-11 pl-10 xl:pl-14 pr-20 max-w-[540px] space-y-8">
          <AuthBrand />

          <m.div
            variants={HERO_CONTAINER_VARIANTS}
            initial={reducedMotion ? false : 'hidden'}
            animate="visible"
            className="space-y-4"
          >
            <m.h2
              variants={HERO_ITEM_VARIANTS}
              className="text-[40px] xl:text-[46px] leading-[1.08] font-bold tracking-[-0.025em]"
            >
              <span className="block text-white">Simplifica tu</span>
              <span className="relative inline-block text-[#E5C784] mt-0.5">
                estudio jurídico.
                <svg
                  viewBox="0 0 320 14"
                  fill="none"
                  className="absolute -bottom-2.5 left-0 w-full h-3 text-[#C5AA70]"
                  preserveAspectRatio="none"
                >
                  <m.path
                    d="M2 10.5C86 2.5 224 2 318 9.5"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.25, ease: EASE_EDITORIAL }}
                  />
                </svg>
              </span>
            </m.h2>

            <m.p
              variants={HERO_ITEM_VARIANTS}
              className="text-[14px] xl:text-[15px] leading-relaxed text-white/80 max-w-[390px] pt-2"
            >
              Consulta, organiza y descarga legislación, jurisprudencia y doctrina jurídica en un
              solo lugar.
            </m.p>
          </m.div>
        </div>

        {/* Organic SVG transition to white right panel */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 w-full h-full z-10"
        >
          <path
            d="M 99 0 C 90 22, 74 44, 58 66 C 48 80, 44 91, 42 100 L 100 100 L 100 0 Z"
            fill="#FFFFFF"
          />
        </svg>

        {/* Bottom-left stacked books accent */}
        <div className="pointer-events-none absolute bottom-0 left-6 xl:left-10 z-[15] hidden xl:flex flex-col items-start opacity-90">
          <div className="w-20 h-3 bg-[#7D6639] rounded-sm border-b border-black/30 ml-2" />
          <div className="w-24 h-3.5 bg-[#2B3D5B] rounded-sm border-b border-black/40" />
          <div className="w-28 h-8 bg-[#182438] rounded-t-sm border-t border-white/10" />
        </div>

        {/* Scale of Justice sitting along the white transition */}
        <ScaleOfJusticePedestal className="pointer-events-none absolute bottom-0 right-[6%] xl:right-[9%] z-[15]" />

        {/* Foreground 3D Legal Avatars */}
        <div className="relative z-20 mt-auto flex items-end justify-start pl-6 xl:pl-12 pt-4">
          <m.img
            src="/auth-avatars.webp"
            alt=""
            draggable={false}
            initial={reducedMotion ? false : { opacity: 0, y: 26, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.12, ease: EASE_EDITORIAL }}
            className="w-[74%] max-w-[490px] max-h-[54dvh] h-auto object-contain object-bottom drop-shadow-[0_18px_32px_rgba(10,18,32,0.45)]"
          />
        </div>
      </aside>

      {/* ============================================================
          MOBILE & VERTICAL TABLET TOP SECTION (< 1024px)
         ============================================================ */}
      <header
        aria-hidden="true"
        className="lg:hidden relative w-full bg-gradient-to-b from-[#111E32] via-[#132238] to-[#192B45] text-white pt-[max(1.25rem,env(safe-area-inset-top))] overflow-hidden select-none shrink-0"
      >
        <AmbientBookshelf />

        {/* Subtle top-right rings */}
        <div className="pointer-events-none absolute -top-12 -right-10 h-40 w-40 rounded-full border border-white/[0.06]" />

        {/* Top centered brand + headline */}
        <div className="relative z-20 px-5 sm:px-8 flex flex-col items-center text-center space-y-3 sm:space-y-4">
          <AuthBrand centered />

          <m.div
            variants={HERO_CONTAINER_VARIANTS}
            initial={reducedMotion ? false : 'hidden'}
            animate="visible"
            className="space-y-2 max-w-[360px] sm:max-w-[440px]"
          >
            <m.h2
              variants={HERO_ITEM_VARIANTS}
              className="text-[24px] min-[390px]:text-[28px] sm:text-[34px] leading-[1.1] font-bold tracking-[-0.02em]"
            >
              <span className="block text-white">Simplifica tu</span>
              <span className="relative inline-block text-[#E5C784] mt-0.5">
                estudio jurídico.
                <svg
                  viewBox="0 0 280 12"
                  fill="none"
                  className="absolute -bottom-1.5 left-0 w-full h-2.5 text-[#C5AA70]"
                  preserveAspectRatio="none"
                >
                  <m.path
                    d="M2 9.5C75 2.5 198 2 278 8.5"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.55, delay: 0.2, ease: EASE_EDITORIAL }}
                  />
                </svg>
              </span>
            </m.h2>

            <m.p
              variants={HERO_ITEM_VARIANTS}
              className="text-[12px] min-[390px]:text-[13px] sm:text-[14px] leading-snug text-white/80 pt-1"
            >
              Consulta, organiza y descarga legislación, jurisprudencia y doctrina jurídica.
            </m.p>
          </m.div>
        </div>

        {/* Avatars + Scale stage */}
        <div className="relative z-10 mt-3 sm:mt-4 flex items-end justify-center px-4">
          {/* Scale of justice peeking on right */}
          <ScaleOfJusticePedestal className="pointer-events-none absolute right-2 sm:right-12 bottom-3 z-0 scale-[0.72] min-[390px]:scale-[0.82] sm:scale-95 origin-bottom-right opacity-95" />

          <m.img
            src="/auth-avatars.webp"
            alt=""
            draggable={false}
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE_EDITORIAL }}
            className="relative z-10 w-[230px] min-[390px]:w-[265px] sm:w-[320px] max-h-[155px] min-[390px]:max-h-[185px] sm:max-h-[230px] h-auto object-contain object-bottom drop-shadow-[0_12px_20px_rgba(10,18,32,0.5)]"
          />
        </div>

        {/* Organic curved white wave transition */}
        <svg
          viewBox="0 0 390 48"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="relative z-20 block w-full h-8 min-[390px]:h-10 sm:h-12 -mt-6 sm:-mt-8"
        >
          <path
            d="M 0 30 C 75 6, 165 6, 245 20 C 310 30, 355 24, 390 12 L 390 48 L 0 48 Z"
            fill="#FFFFFF"
          />
        </svg>
      </header>
    </>
  );
}
