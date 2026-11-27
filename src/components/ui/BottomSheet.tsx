import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { TRANSITION_MODAL } from '../../utils/motion';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, className, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 90 || info.velocity.y > 400) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          role="dialog"
          aria-modal="true"
          aria-label={title ?? 'Panel inferior'}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-navy/45 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={TRANSITION_MODAL}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDragEnd={handleDragEnd}
            className={cn(
              'relative z-10 w-full max-h-[90dvh] bg-white rounded-t-2xl border-t border-line shadow-popover flex flex-col overflow-hidden safe-bottom',
              className
            )}
          >
            <div className="flex flex-col items-center pt-2.5 pb-2 px-4 border-b border-line shrink-0">
              <div className="h-1 w-10 rounded-full bg-line-strong mb-2" aria-hidden="true" />
              <div className="w-full flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-navy truncate">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar panel"
                  className="h-9 w-9 rounded-lg inline-flex items-center justify-center text-ink-muted hover:bg-surface-secondary hover:text-navy"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
