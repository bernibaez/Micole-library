import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

export function ErrorState({
  title = 'No pudimos cargar el contenido',
  message = 'Ocurrió un problema al consultar los datos. Verifica tu conexión e intenta nuevamente.',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border border-line bg-surface-secondary/40">
      <div className="h-12 w-12 rounded-xl bg-red-50 text-red-700 flex items-center justify-center mb-4">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h2 className="text-lg font-semibold text-navy">{title}</h2>
      <p className="text-sm text-ink-muted max-w-md mt-1.5">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </Button>
      )}
    </div>
  );
}
