import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { TRANSITION_MODAL } from '../../utils/motion';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hideHeader?: boolean;
  className?: string;
  children: ReactNode;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  hideHeader = false,
  className,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.[0]?.focus();
    }, 20);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={title ?? 'Diálogo'}
        >
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-navy/45 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
          />
          <m.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={TRANSITION_MODAL}
            className={cn(
              'relative z-10 w-full rounded-2xl bg-white border border-line shadow-popover max-h-[90dvh] flex flex-col overflow-hidden',
              sizeClasses[size],
              className
            )}
          >
            {!hideHeader && (
              <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-line shrink-0">
                <div>
                  {title && (
                    <h2 className="text-lg font-semibold text-navy tracking-tight">{title}</h2>
                  )}
                  {description && <p className="text-xs text-ink-muted mt-0.5">{description}</p>}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar ventana"
                  className="h-9 w-9 rounded-lg inline-flex items-center justify-center text-ink-muted hover:bg-surface-secondary hover:text-navy transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="overflow-y-auto flex-1">{children}</div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
