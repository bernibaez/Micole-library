import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { TRANSITION_MICRO } from '../../utils/motion';

type ToastTone = 'success' | 'info' | 'error';

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue>({
  notify: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 3400);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto z-50 flex flex-col gap-2 items-end pointer-events-none"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <m.div
              key={toast.id}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={TRANSITION_MICRO}
              role="status"
              className="pointer-events-auto w-full md:w-auto max-w-sm rounded-xl bg-navy text-white px-4 py-3 shadow-popover border border-white/10 flex items-center gap-3 text-sm"
            >
              {toast.tone === 'error' ? (
                <AlertCircle className="h-4 w-4 text-red-300 shrink-0" />
              ) : toast.tone === 'info' ? (
                <Info className="h-4 w-4 text-gold shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-gold shrink-0" />
              )}
              <span className="flex-1 leading-snug">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Cerrar notificación"
                className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
