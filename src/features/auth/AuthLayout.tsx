import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { m, useMotionValue, useSpring, useTransform } from 'motion/react';
import { ArrowLeft, Scale } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  EASE_EDITORIAL,
  HERO_CONTAINER_VARIANTS,
  HERO_ITEM_VARIANTS,
  PAGE_VARIANTS,
} from '../../utils/motion';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  const reducedMotion = useReducedMotion();

  // Subtle 3D depth parallax separating background typography from foreground characters
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 140, damping: 22, mass: 0.6 });
  const smoothY = useSpring(pointerY, { stiffness: 140, damping: 22, mass: 0.6 });

  const backTextX = useTransform(smoothX, [-1, 1], [10, -10]);
  const backTextY = useTransform(smoothY, [-1, 1], [6, -6]);
  const charsX = useTransform(smoothX, [-1, 1], [-6, 6]);
  const charsY = useTransform(smoothY, [-1, 1], [-4, 4]);

  const handlePanelMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    pointerX.set(nx);
    pointerY.set(ny);
  };

  const handlePanelMouseLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <div className="min-h-dvh bg-[#EFF2F7] flex flex-col items-center justify-center px-4 py-6 sm:p-6 lg:p-8">
      <m.div
        variants={PAGE_VARIANTS}
        initial="initial"
        animate="animate"
        className="w-full max-w-[1040px] rounded-[32px] bg-white border border-[#E6E9EF]/80 shadow-[0_30px_75px_-20px_rgba(16,29,53,0.16)] p-4 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-[1.04fr_1fr] gap-4 lg:gap-4 overflow-hidden"
      >
        {/* Left Showcase Panel (Desktop) — Layered Depth Typography Behind 3D Legal Characters */}
        <aside
          aria-hidden="true"
          onMouseMove={handlePanelMouseMove}
          onMouseLeave={handlePanelMouseLeave}
          className="hidden lg:flex flex-col justify-between rounded-[26px] bg-gradient-to-br from-[#16294B] via-[#101D35] to-[#1C3358] text-white pt-9 px-9 pb-0 relative overflow-hidden min-h-[600px]"
        >
          {/* Soft ambient editorial glows */}
          <div className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-[#C5A15B]/[0.11] blur-3xl" />
          <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full border border-white/[0.06]" />
          <div className="pointer-events-none absolute top-14 -right-10 h-36 w-36 rounded-full border border-[#C5A15B]/15" />

          {/* Top Headline + Curved Gold Underline */}
          <m.div
            variants={HERO_CONTAINER_VARIANTS}
            initial="hidden"
            animate="visible"
            className="relative z-10 space-y-3.5"
          >
            <m.h2
              variants={HERO_ITEM_VARIANTS}
              className="text-[34px] xl:text-[37px] leading-[1.12] font-bold tracking-[-0.025em] text-white"
            >
              Simplifica tu
              <br />
              estudio jurídico en
              <br />
              <span className="relative inline-block">
                nuestra biblioteca.
                <svg
                  viewBox="0 0 280 15"
                  fill="none"
                  className="absolute -bottom-2 left-0 w-full h-3.5 text-[#C5A15B]"
                  preserveAspectRatio="none"
                >
                  <m.path
                    d="M3 11.5C72 2.8 198 1.6 277 10"
                    stroke="currentColor"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.65, delay: 0.3, ease: EASE_EDITORIAL }}
                  />
                </svg>
              </span>
            </m.h2>

            <m.p
              variants={HERO_ITEM_VARIANTS}
              className="text-[13px] leading-relaxed text-white/75 max-w-[350px] pt-1"
            >
              Consulta, organiza y descarga legislación, jurisprudencia y doctrina jurídica en una
              biblioteca virtual clara y sincronizada.
            </m.p>
          </m.div>

          {/* Layered Stage: Monumental Typography Strictly BEHIND Foreground 3D Characters */}
          <div className="relative mt-4 -mx-9 flex items-end justify-center select-none pt-10 isolate">
            {/* Ambient Backlight Glows behind the characters */}
            <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-60 w-[90%] rounded-full bg-[#C5A15B]/20 blur-3xl z-[5]" />
            <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 h-48 w-[76%] rounded-full bg-[#3B62A1]/30 blur-2xl z-[5]" />

            {/* BACK LAYER (z-10): Giant Editorial Letters Strictly Behind Characters */}
            <m.div
              style={reducedMotion ? undefined : { x: backTextX, y: backTextY }}
              initial={reducedMotion ? false : { opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08, ease: EASE_EDITORIAL }}
              className="pointer-events-none absolute inset-x-0 top-[10%] z-10 flex flex-col items-center justify-center text-center leading-none"
            >
              <span className="block font-black uppercase tracking-[0.04em] text-[88px] xl:text-[100px] leading-[0.86] bg-gradient-to-b from-white/65 via-white/35 to-white/[0.08] bg-clip-text text-transparent drop-shadow-[0_8px_24px_rgba(5,10,22,0.35)]">
                MICOLE
              </span>
              <span className="block font-editorial italic font-bold uppercase tracking-[0.08em] text-[70px] xl:text-[80px] leading-[0.94] -mt-1 bg-gradient-to-b from-[#F4E3BD]/65 via-[#C5A15B]/35 to-[#C5A15B]/[0.08] bg-clip-text text-transparent drop-shadow-[0_8px_24px_rgba(5,10,22,0.3)]">
                LIBRARY
              </span>
            </m.div>

            {/* FOREGROUND LAYER (z-20): Custom 3D Legal Avatars cleanly in front of the letters */}
            <m.img
              src="/auth-avatars.webp"
              alt=""
              draggable={false}
              style={reducedMotion ? undefined : { x: charsX, y: charsY }}
              initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.16, ease: EASE_EDITORIAL }}
              className="relative z-20 w-[92%] max-w-[445px] h-auto object-contain object-bottom drop-shadow-[0_22px_34px_rgba(5,10,22,0.58)]"
            />
          </div>
        </aside>

        {/* Right Form Column */}
        <div className="relative flex flex-col justify-between px-3 py-4 sm:px-8 sm:py-7 lg:px-10 lg:py-8">
          {/* Compact Mobile Visual Banner with Text-Behind-Characters Effect */}
          <div
            aria-hidden="true"
            className="lg:hidden relative rounded-2xl bg-gradient-to-r from-[#16294B] via-[#101D35] to-[#1C3358] px-5 pt-5 pb-0 mb-5 overflow-hidden flex items-end justify-between gap-3"
          >
            {/* Giant watermarked letters behind mobile characters */}
            <div className="pointer-events-none absolute right-2 top-2 z-0 flex flex-col items-end leading-none select-none">
              <span className="font-black uppercase tracking-[0.04em] text-[44px] sm:text-[54px] leading-[0.86] bg-gradient-to-b from-white/35 via-white/18 to-transparent bg-clip-text text-transparent">
                MICOLE
              </span>
              <span className="font-editorial italic font-bold uppercase tracking-[0.08em] text-[34px] sm:text-[42px] leading-[0.9] bg-gradient-to-b from-[#F4E3BD]/35 via-[#C5A15B]/18 to-transparent bg-clip-text text-transparent">
                LIBRARY
              </span>
            </div>

            <div className="relative z-10 pb-5 max-w-[56%] space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C5A15B]">
                Biblioteca Jurídica
              </p>
              <p className="text-base font-bold leading-snug text-white">
                Tu estudio jurídico en un solo espacio.
              </p>
            </div>
            <img
              src="/auth-avatars.webp"
              alt=""
              className="relative z-10 w-36 sm:w-44 h-auto object-contain object-bottom shrink-0 drop-shadow-[0_10px_18px_rgba(5,10,22,0.5)]"
            />
          </div>

          {/* Subtle back to catalog link */}
          <div className="flex items-center justify-between lg:justify-end">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7A8496] hover:text-[#101D35] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al catálogo
            </Link>
          </div>

          <div className="w-full max-w-[365px] mx-auto my-auto py-5 space-y-6">
            {/* Centered Logo Badge + Brand Wordmark */}
            <div className="flex flex-col items-center text-center space-y-4">
              <Link
                to="/"
                aria-label="MICOLE LIBRARY — Inicio"
                className="inline-flex items-center gap-2.5 group"
              >
                <span className="h-11 w-11 rounded-full bg-[#101D35] text-[#C5A15B] inline-flex items-center justify-center shadow-sm transition-transform duration-150 group-hover:scale-105">
                  <Scale className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="text-[19px] font-bold tracking-[0.04em] text-[#101D35]">
                  MICOLE LIBRARY
                </span>
              </Link>

              <div className="space-y-1">
                <h1 className="text-[26px] sm:text-[29px] font-bold text-[#101D35] tracking-tight leading-tight">
                  {title}
                </h1>
                <p className="text-xs sm:text-[13px] text-[#7A8496] leading-relaxed">{subtitle}</p>
              </div>
            </div>

            {children}
          </div>

          <p className="text-[11px] text-[#8E98A8] text-center pt-2">
            MICOLE LIBRARY © {new Date().getFullYear()} · Biblioteca Jurídica Virtual
          </p>
        </div>
      </m.div>
    </div>
  );
}
