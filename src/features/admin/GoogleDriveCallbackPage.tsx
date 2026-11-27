import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { completeGoogleDriveOAuth } from '../../services/driveService';
import { QUERY_KEYS } from '../library/useLibraryData';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/feedback/ToastProvider';

export function GoogleDriveCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const processedRef = useRef(false);

  const oauthError = searchParams.get('error');
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const initialError = oauthError
    ? `Google canceló o rechazó la autorización: ${oauthError}`
    : !code || !state
      ? 'Faltan los parámetros code o state en la respuesta de Google OAuth.'
      : '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    initialError ? 'error' : 'loading'
  );
  const [errorMessage, setErrorMessage] = useState<string>(initialError);

  useEffect(() => {
    if (initialError || !code || !state || processedRef.current) return;
    processedRef.current = true;

    completeGoogleDriveOAuth(code, state)
      .then((res) => {
        setStatus('success');
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.driveSummary });
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminStats });
        notify('Google Drive conectado correctamente');
        window.setTimeout(() => {
          navigate(res.redirectAfter || '/admin/google-drive', { replace: true });
        }, 900);
      })
      .catch((err) => {
        setStatus('error');
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'No se pudo completar la vinculación con Google Drive.'
        );
      });
  }, [code, initialError, navigate, notify, queryClient, state]);

  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-4">
      {status === 'loading' && (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-navy mx-auto" />
          <h1 className="font-editorial text-2xl font-semibold text-navy">
            Finalizando conexión con Google Drive
          </h1>
          <p className="text-sm text-ink-muted">
            Intercambiando código de autorización de forma segura en el servidor...
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle2 className="h-10 w-10 text-emerald-700 mx-auto" />
          <h1 className="font-editorial text-2xl font-semibold text-navy">
            Cuenta conectada con éxito
          </h1>
          <p className="text-sm text-ink-muted">Redirigiendo al panel de Google Drive...</p>
        </>
      )}

      {status === 'error' && (
        <>
          <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
          <h1 className="font-editorial text-2xl font-semibold text-navy">
            No se pudo conectar Google Drive
          </h1>
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3.5">
            {errorMessage}
          </p>
          <div className="pt-2">
            <Link to="/admin/google-drive">
              <Button variant="primary">Volver a configuración</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
