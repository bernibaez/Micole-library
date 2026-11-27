import { m } from 'motion/react';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { EASE_EDITORIAL, HERO_CONTAINER_VARIANTS, HERO_ITEM_VARIANTS } from '../../../utils/motion';
import { AuthBrand } from './AuthBrand';

function AmbientBookshelf() {
  const shelves = [
    [
      { w: 'w-3.5', h: 'h-14', bg: 'bg-[#2B4063]' },
      { w: 'w-2.5', h: 'h-12', bg: 'bg-[#5A3E36]' },
      { w: 'w-4', h: 'h-16', bg: 'bg-[#223350]' },
      { w: 'w-2.5', h: 'h-13', bg: 'bg-[#8A6E3E]' },
      { w: 'w-3', h: 'h-15', bg: 'bg-[#2C4061]' },
      { w: 'w-2.5', h: 'h-11', bg: 'bg-[#3D4C66]' },
      { w: 'w-3.5', h: 'h-14', bg: 'bg-[#5E433B]' },
    ],
    [
      { w: 'w-3.5', h: 'h-15', bg: 'bg-[#243756]' },
      { w: 'w-2.5', h: 'h-13', bg: 'bg-[#7F6439]' },
      { w: 'w-3.5', h: 'h-16', bg: 'bg-[#2D4366]' },
      { w: 'w-2.5', h: 'h-12', bg: 'bg-[#523A34]' },
      { w: 'w-3', h: 'h-14', bg: 'bg-[#1D2E49]' },
      { w: 'w-3', h: 'h-13', bg: 'bg-[#384B6B]' },
    ],
    [
      { w: 'w-3', h: 'h-14', bg: 'bg-[#573E37]' },
      { w: 'w-3.5', h: 'h-15', bg: 'bg-[#263958]' },
      { w: 'w-2.5', h: 'h-12', bg: 'bg-[#856B3D]' },
      { w: 'w-4', h: 'h-15', bg: 'bg-[#21314C]' },
      { w: 'w-2.5', h: 'h-13', bg: 'bg-[#3B4E6E]' },
    ],
    [
      { w: 'w-3.5', h: 'h-14', bg: 'bg-[#233552]' },
      { w: 'w-2.5', h: 'h-13', bg: 'bg-[#6F5833]' },
      { w: 'w-3', h: 'h-15', bg: 'bg-[#4C3630]' },
      { w: 'w-3.5', h: 'h-14', bg: 'bg-[#2A3D5D]' },
    ],
  ];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-0 w-40 sm:w-48 lg:w-60 overflow-hidden"
      style={{
        maskImage:
          'linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0) 100%)',
        WebkitMaskImage:
          'linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0) 100%)',
      }}
    >
      {/* Subtle warm library sconce illumination */}
      <div
        className="absolute -left-10 top-16 h-72 w-52 rounded-full blur-3xl opacity-45"
        style={{
          background:
            'radial-gradient(circle, rgba(229,199,132,0.28) 0%, rgba(197,170,112,0.10) 48%, transparent 75%)',
        }}
      />

      {/* Out-of-focus legal wooden bookshelves */}
      <div className="absolute inset-0 -left-5 top-16 sm:top-20 flex flex-col gap-5 -rotate-[1.5deg] blur-[3px] opacity-45">
        {shelves.map((books, shelfIdx) => (
          <div key={shelfIdx} className="flex flex-col">
            <div className="flex items-end gap-1 px-2">
              {books.map((book, bookIdx) => (
                <div
                  key={bookIdx}
                  className={`${book.w} ${book.h} ${book.bg} rounded-t-[2px] border-t border-[#E5C784]/15`}
                />
              ))}
            </div>
            <div className="h-2.5 w-full bg-[#241B18] border-t border-[#8B6E47]/35 shadow-md" />
          </div>
        ))}
      </div>

      {/* Gentle vertical navy depth vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0E192B]/65 via-transparent to-[#0D1728]/80" />
    </div>
  );
}

export function AuthIllustration() {
  const reducedMotion = useReducedMotion();

  return (
    <>
      {/* ============================================================
          DESKTOP LEFT PANEL (>= 1024px) — 55% width + Sweeping Organic Curve
         ============================================================ */}
      <aside
        aria-hidden="true"
        className="hidden lg:flex lg:w-[55%] xl:w-[55%] shrink-0 relative bg-gradient-to-br from-[#0F1B2E] via-[#111E32] to-[#172840] text-white flex-col overflow-hidden select-none min-h-dvh"
      >
        {/* Subtle ambient architectural rings */}
        <div className="pointer-events-none absolute -top-24 right-16 h-72 w-72 rounded-full border border-white/[0.055]" />
        <div className="pointer-events-none absolute -top-8 right-28 h-48 w-48 rounded-full border border-[#C5AA70]/[0.09]" />

        {/* Blurred legal bookshelf with warm depth lighting */}
        <AmbientBookshelf />

        {/* Subtle warm-navy depth glow behind characters */}
        <div className="pointer-events-none absolute bottom-10 left-[22%] h-80 w-80 rounded-full bg-[#254270]/35 blur-3xl" />
        <div className="pointer-events-none absolute bottom-20 left-[14%] h-52 w-52 rounded-full bg-[#C5AA70]/[0.08] blur-3xl" />

        {/* Top content: Brand + Headline + Description */}
        <div className="relative z-20 pt-8 xl:pt-10 2xl:pt-12 pl-10 xl:pl-14 pr-16 max-w-[560px] space-y-6 xl:space-y-7">
          <AuthBrand />

          <m.div
            variants={HERO_CONTAINER_VARIANTS}
            initial={reducedMotion ? false : 'hidden'}
            animate="visible"
            className="space-y-3.5"
          >
            <m.h2
              variants={HERO_ITEM_VARIANTS}
              className="text-[40px] xl:text-[46px] leading-[1.08] font-bold tracking-[-0.025em]"
            >
              <span className="block text-white">Simplifica tu</span>
              <span className="relative inline-block italic font-bold text-[#E5C784] mt-0.5 tracking-[-0.015em]">
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
              className="text-[14px] xl:text-[15px] leading-relaxed text-white/80 max-w-[395px] pt-1.5"
            >
              Consulta, organiza y descarga legislación, jurisprudencia y doctrina jurídica en un
              solo lugar.
            </m.p>
          </m.div>
        </div>

        {/* Pronounced, fluid organic SVG curve connecting navy panel to white form */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 w-full h-full z-10"
        >
          <path
            d="M 99 0 C 97 22, 87 46, 68 65 C 50 83, 34 92, 22 100 L 100 100 L 100 0 Z"
            fill="#FFFFFF"
          />
        </svg>

        {/* Realistic 3D Golden Scale of Justice grounded cleanly on dark desk edge */}
        <m.img
          src="/auth-scale-3d.webp"
          alt=""
          draggable={false}
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18, ease: EASE_EDITORIAL }}
          className="pointer-events-none absolute bottom-0 right-[2%] xl:right-[4%] z-[15] w-[205px] xl:w-[248px] 2xl:w-[272px] h-auto object-contain object-bottom rounded-tr-md"
        />

        {/* Foreground 3D Legal Avatars — centered gently in left panel, tight rhythm with headline */}
        <div className="relative z-20 flex-1 mt-3 xl:mt-4 flex items-end justify-center pr-[9%] xl:pr-[11%] pl-4">
          <m.img
            src="/auth-avatars.webp"
            alt=""
            draggable={false}
            initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.12, ease: EASE_EDITORIAL }}
            className="w-[82%] max-w-[520px] max-h-[58dvh] h-auto object-contain object-bottom drop-shadow-[0_18px_30px_rgba(10,18,32,0.42)]"
          />
        </div>
      </aside>

      {/* ============================================================
          MOBILE & VERTICAL TABLET TOP SECTION (< 1024px)
         ============================================================ */}
      <header
        aria-hidden="true"
        className="lg:hidden relative w-full bg-gradient-to-b from-[#0F1B2E] via-[#111E32] to-[#172840] text-white pt-[max(1.25rem,env(safe-area-inset-top))] overflow-hidden select-none shrink-0"
      >
        <AmbientBookshelf />

        {/* Subtle top-right ring */}
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
              <span className="relative inline-block italic font-bold text-[#E5C784] mt-0.5 tracking-[-0.015em]">
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

        {/* Avatars + 3D Scale stage */}
        <div className="relative z-10 mt-2.5 sm:mt-3 flex items-end justify-center px-4">
          {/* Subtle white sweep peeking behind the 3D scale on the right (matches mobile reference) */}
          <svg
            viewBox="0 0 390 140"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 w-full h-32 sm:h-40 z-0"
          >
            <path d="M 240 140 Q 325 82, 390 16 L 390 140 Z" fill="#FFFFFF" />
          </svg>

          {/* 3D Golden Scale of Justice grounded on the right */}
          <img
            src="/auth-scale-3d.webp"
            alt=""
            draggable={false}
            className="pointer-events-none absolute right-0 sm:right-6 bottom-2 z-[5] w-[112px] min-[390px]:w-[128px] sm:w-[162px] h-auto object-contain object-bottom"
          />

          <m.img
            src="/auth-avatars.webp"
            alt=""
            draggable={false}
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE_EDITORIAL }}
            className="relative z-10 w-[235px] min-[390px]:w-[270px] sm:w-[325px] max-h-[160px] min-[390px]:max-h-[190px] sm:max-h-[235px] h-auto object-contain object-bottom -ml-6 sm:-ml-8 drop-shadow-[0_12px_20px_rgba(10,18,32,0.48)]"
          />
        </div>

        {/* Fluid organic white wave transition */}
        <svg
          viewBox="0 0 390 56"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="relative z-20 block w-full h-9 min-[390px]:h-11 sm:h-14 -mt-7 sm:-mt-9"
        >
          <path
            d="M 0 34 C 72 6, 152 4, 240 22 C 304 35, 356 28, 390 10 L 390 56 L 0 56 Z"
            fill="#FFFFFF"
          />
        </svg>
      </header>
    </>
  );
}
