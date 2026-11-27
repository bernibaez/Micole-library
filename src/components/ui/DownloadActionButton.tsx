import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { AlertCircle, Check, Download, Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from './Button';
import { TRANSITION_MICRO } from '../../utils/motion';

type DownloadStatus = 'idle' | 'loading' | 'success' | 'error';

interface DownloadActionButtonProps extends Omit<ButtonProps, 'onClick' | 'loading' | 'children'> {
  onDownload: () => Promise<void> | void;
  idleLabel?: string;
  loadingLabel?: string;
  successLabel?: string;
  errorLabel?: string;
  compactLabelOnMobile?: boolean;
}

export function DownloadActionButton({
  onDownload,
  idleLabel = 'Descargar PDF',
  loadingLabel = 'Preparando...',
  successLabel = 'Descarga iniciada',
  errorLabel = 'Error al descargar',
  compactLabelOnMobile = false,
  variant = 'secondary',
  size = 'lg',
  disabled,
  className,
  ...rest
}: DownloadActionButtonProps) {
  const [status, setStatus] = useState<DownloadStatus>('idle');
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    };
  }, []);

  const handleClick = async () => {
    if (status === 'loading') return;
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    setStatus('loading');
    try {
      await Promise.resolve(onDownload());
      setStatus('success');
      resetTimerRef.current = window.setTimeout(() => setStatus('idle'), 2200);
    } catch {
      setStatus('error');
      resetTimerRef.current = window.setTimeout(() => setStatus('idle'), 2600);
    }
  };

  const labelClass = compactLabelOnMobile ? 'hidden sm:inline' : undefined;

  return (
    <Button
      type="button"
      variant={status === 'error' ? 'danger' : variant}
      size={size}
      disabled={disabled || status === 'loading'}
      onClick={() => void handleClick()}
      className={className}
      {...rest}
    >
      <AnimatePresence mode="wait" initial={false}>
        {status === 'loading' && (
          <m.span
            key="loading"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={TRANSITION_MICRO}
            className="inline-flex items-center gap-2"
          >
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span className={labelClass}>{loadingLabel}</span>
          </m.span>
        )}

        {status === 'success' && (
          <m.span
            key="success"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={TRANSITION_MICRO}
            className="inline-flex items-center gap-2 text-forest"
          >
            <Check className="h-4 w-4 shrink-0" />
            <span className={labelClass}>{successLabel}</span>
          </m.span>
        )}

        {status === 'error' && (
          <m.span
            key="error"
            initial={{ opacity: 0, x: -3 }}
            animate={{ opacity: 1, x: [0, -3, 3, -2, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="inline-flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className={labelClass}>{errorLabel}</span>
          </m.span>
        )}

        {status === 'idle' && (
          <m.span
            key="idle"
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={TRANSITION_MICRO}
            className="inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4 shrink-0" />
            <span className={labelClass}>{idleLabel}</span>
          </m.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
