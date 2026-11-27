import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { cn } from '../../utils/cn';
import { EASE_EDITORIAL } from '../../utils/motion';

const MASCOT_STATIC_SRC = '/mascot/lex-static.webp';
const MASCOT_SPRITE_SRC = '/mascot/lex-wave-sprite.webp';
const SESSION_KEY_PREFIX = 'lexlibrary:v2:mascot-greeted:';
const WAVE_DURATION_MS = 2240;
const AUTO_GREET_DELAY_MS = 340;

const BOTTOM_FADE_MASK_STYLE = {
  WebkitMaskImage:
    'linear-gradient(to bottom, #000 0%, #000 76%, rgba(0, 0, 0, 0.55) 90%, transparent 100%)',
  maskImage:
    'linear-gradient(to bottom, #000 0%, #000 76%, rgba(0, 0, 0, 0.55) 90%, transparent 100%)',
} as const;

export interface LexMascotProps {
  /** Whether the user is currently authenticated (triggers the once-per-session login greeting). */
  isAuthenticated?: boolean;
  /** Unique identifier for the active user/session used to persist once-per-session greeting state. */
  sessionKey?: string | null;
  /** Automatically play the greeting wave once per authenticated session. Defaults to true. */
  autoGreet?: boolean;
  /** Optional first name for accessible labeling. */
  userName?: string | null;
  /** Flip the mascot horizontally to face the opposite side. */
  flipHorizontal?: boolean;
  /** Wrapper class name. */
  className?: string;
  /** Height/size utility classes controlling the mascot's responsive dimensions. */
  sizeClassName?: string;
}

function clearMascotSessionFlags() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(SESSION_KEY_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // Ignore storage access restrictions in private browsing modes.
  }
}

export function LexMascot({
  isAuthenticated = false,
  sessionKey,
  autoGreet = true,
  userName,
  flipHorizontal = false,
  className,
  sizeClassName = 'h-[210px] sm:h-[236px] lg:h-[278px] xl:h-[306px]',
}: LexMascotProps) {
  const reducedMotion = useReducedMotion();
  const [spriteLoaded, setSpriteLoaded] = useState(false);
  const [isWaving, setIsWaving] = useState(false);
  const [playNonce, setPlayNonce] = useState(0);

  const finishTimerRef = useRef<number | null>(null);
  const autoStartTimerRef = useRef<number | null>(null);

  // Preload the optimized WebP sprite sheet silently in the background
  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    const img = new Image();
    img.decoding = 'async';
    img.src = MASCOT_SPRITE_SRC;
    const markReady = () => {
      if (!cancelled) setSpriteLoaded(true);
    };
    if (img.complete) {
      markReady();
    } else {
      img.onload = markReady;
    }
    return () => {
      cancelled = true;
    };
  }, [reducedMotion]);

  const stopWave = useCallback(() => {
    if (finishTimerRef.current !== null) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
    setIsWaving(false);
  }, []);

  const triggerWave = useCallback(() => {
    if (reducedMotion || !spriteLoaded) return;

    if (finishTimerRef.current !== null) {
      window.clearTimeout(finishTimerRef.current);
    }

    setPlayNonce((n) => n + 1);
    setIsWaving(true);

    // Fallback safety timer slightly after the 1.98s CSS sprite animation
    finishTimerRef.current = window.setTimeout(() => {
      finishTimerRef.current = null;
      setIsWaving(false);
    }, WAVE_DURATION_MS + 140);
  }, [reducedMotion, spriteLoaded]);

  // Clear session flags when user signs out so the next login greets them again
  useEffect(() => {
    if (!isAuthenticated) {
      clearMascotSessionFlags();
    }
  }, [isAuthenticated]);

  // Auto-play greeting wave once per authenticated session
  useEffect(() => {
    if (!autoGreet || !isAuthenticated || reducedMotion || !spriteLoaded) return;

    const storageKey = `${SESSION_KEY_PREFIX}${sessionKey || 'authenticated'}`;
    try {
      if (sessionStorage.getItem(storageKey) === '1') {
        return;
      }
      sessionStorage.setItem(storageKey, '1');
    } catch {
      // If sessionStorage is unavailable, still greet once on mount
    }

    autoStartTimerRef.current = window.setTimeout(() => {
      autoStartTimerRef.current = null;
      triggerWave();
    }, AUTO_GREET_DELAY_MS);

    return () => {
      if (autoStartTimerRef.current !== null) {
        window.clearTimeout(autoStartTimerRef.current);
        autoStartTimerRef.current = null;
      }
    };
  }, [autoGreet, isAuthenticated, reducedMotion, sessionKey, spriteLoaded, triggerWave]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
      if (autoStartTimerRef.current !== null) window.clearTimeout(autoStartTimerRef.current);
    };
  }, []);

  const handleClick = () => {
    if (reducedMotion || isWaving) return;
    triggerWave();
  };

  const accessibleLabel = userName
    ? `Asistente jurídica de MICOLE LIBRARY saludando a ${userName}. Haz clic para repetir el saludo.`
    : 'Asistente jurídica de MICOLE LIBRARY. Haz clic para ver el saludo.';

  return (
    <m.div
      initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { duration: 0.52, delay: 0.1, ease: EASE_EDITORIAL }
      }
      className={cn('relative inline-flex items-end justify-center select-none', className)}
    >
      <m.button
        type="button"
        onClick={handleClick}
        aria-label={accessibleLabel}
        title={reducedMotion ? 'Asistente jurídica de MICOLE LIBRARY' : 'Haz clic para saludar'}
        whileHover={reducedMotion ? undefined : { scale: 1.02 }}
        whileTap={reducedMotion ? undefined : { scale: 0.985 }}
        transition={{ duration: 0.2, ease: EASE_EDITORIAL }}
        className={cn(
          'group relative block aspect-[278/312] w-auto bg-transparent border-0 p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 rounded-2xl',
          reducedMotion ? 'cursor-default' : 'cursor-pointer',
          sizeClassName
        )}
      >
        {/* Masked visual frame preserving clean transparent bottom fade */}
        <span
          className={cn(
            'relative block h-full w-full overflow-hidden drop-shadow-[0_14px_24px_rgba(16,29,53,0.12)]',
            flipHorizontal && '-scale-x-100'
          )}
          style={BOTTOM_FADE_MASK_STYLE}
        >
          {/* High-resolution 2x Retina static resting pose */}
          <m.img
            src={MASCOT_STATIC_SRC}
            alt=""
            aria-hidden="true"
            draggable={false}
            decoding="async"
            animate={{ opacity: isWaving ? 0 : 1 }}
            transition={{
              duration: reducedMotion ? 0 : isWaving ? 0.08 : 0.01,
              delay: reducedMotion ? 0 : isWaving ? 0.14 : 0,
              ease: EASE_EDITORIAL,
            }}
            className="absolute inset-0 h-full w-full object-contain object-bottom pointer-events-none"
          />

          {/* GPU-accelerated WebP CSS sprite wave sequence with Motion crossfade */}
          <AnimatePresence>
            {isWaving && !reducedMotion && (
              <m.span
                key={playNonce}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16, ease: EASE_EDITORIAL }}
                className="absolute inset-0 block overflow-hidden pointer-events-none"
                aria-hidden="true"
              >
                <img
                  src={MASCOT_SPRITE_SRC}
                  alt=""
                  draggable={false}
                  decoding="async"
                  onAnimationEnd={stopWave}
                  className="block h-full w-[1700%] max-w-none select-none lex-mascot-sprite-play"
                />
              </m.span>
            )}
          </AnimatePresence>
        </span>
      </m.button>
    </m.div>
  );
}
