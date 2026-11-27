import { AnimatePresence, m } from 'motion/react';
import { Download, Scale, Share, X } from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { EASE_EDITORIAL } from '../../utils/motion';

export function PwaInstallBanner() {
  const { showBanner, canPromptNative, isIosSafari, installing, promptInstall, dismissBanner } =
    usePwaInstall();

  return (
    <AnimatePresence>
      {showBanner && (
        <m.div
          role="region"
          aria-label="Instalar aplicación MICOLE LIBRARY"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.24, ease: EASE_EDITORIAL }}
          className="fixed bottom-20 md:bottom-5 right-4 left-4 md:left-auto z-40 md:w-[370px] rounded-2xl border border-[#C5AA70]/45 bg-[#111E32] text-white p-3.5 shadow-[0_18px_40px_-14px_rgba(17,30,50,0.5)]"
        >
          <div className="flex items-start gap-3">
            <span className="h-10 w-10 rounded-xl bg-[#192B45] border border-[#C5AA70]/60 text-[#E5C784] inline-flex items-center justify-center shrink-0">
              <Scale className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </span>

            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs font-semibold text-white leading-snug">
                Instala MICOLE LIBRARY
              </p>
              {canPromptNative ? (
                <p className="text-[11.5px] text-white/75 leading-snug">
                  Ábrela como app a pantalla completa desde tu dispositivo.
                </p>
              ) : isIosSafari ? (
                <p className="text-[11.5px] text-white/75 leading-snug">
                  Pulsa <Share className="inline h-3 w-3 mx-0.5 text-[#E5C784]" /> Compartir y luego{' '}
                  <strong className="text-[#E5C784]">«Añadir a pantalla de inicio»</strong>.
                </p>
              ) : null}

              {canPromptNative && (
                <div className="pt-1.5">
                  <button
                    type="button"
                    disabled={installing}
                    onClick={() => void promptInstall()}
                    className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-[#E5C784] hover:bg-[#edd39b] text-[#111E32] text-xs font-semibold transition-colors disabled:opacity-60"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    {installing ? 'Instalando…' : 'Instalar app'}
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={dismissBanner}
              aria-label="Cerrar aviso de instalación"
              className="h-7 w-7 rounded-lg inline-flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 shrink-0 transition-colors"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
