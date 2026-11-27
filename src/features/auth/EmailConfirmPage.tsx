import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, MailCheck } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './AuthContext';
import { Button } from '../../components/ui/Button';

export function EmailConfirmPage() {
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const email = searchParams.get('email');

  return (
    <AuthLayout
      title={isAuthenticated ? 'Correo confirmado' : 'Confirma tu correo electrónico'}
      subtitle={
        isAuthenticated
          ? 'Tu cuenta ha sido verificada y ya puedes disfrutar de todas las herramientas de MICOLE LIBRARY.'
          : 'Hemos enviado un enlace de verificación para activar tu cuenta personal.'
      }
    >
      <div className="rounded-2xl border border-line bg-surface-secondary/60 p-6 space-y-4">
        <div className="h-12 w-12 rounded-xl bg-navy text-gold inline-flex items-center justify-center">
          {isAuthenticated ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : (
            <MailCheck className="h-6 w-6" />
          )}
        </div>

        {isAuthenticated ? (
          <p className="text-sm text-ink-muted leading-relaxed">
            Tu dirección de correo está verificada. Ya puedes organizar colecciones, marcar páginas
            y sincronizar tu lectura.
          </p>
        ) : (
          <p className="text-sm text-ink-muted leading-relaxed">
            Revisa la bandeja de entrada {email ? <>de <strong>{email}</strong></> : 'de tu correo'}{' '}
            (y la carpeta de correo no deseado) y haz clic en el enlace de confirmación.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <Link to={isAuthenticated ? '/mi-biblioteca' : '/iniciar-sesion'} className="flex-1">
            <Button variant="primary" className="w-full">
              {isAuthenticated ? 'Ir a mi biblioteca' : 'Ir a iniciar sesión'}
            </Button>
          </Link>
          <Link to="/explorar" className="flex-1">
            <Button variant="secondary" className="w-full">
              Explorar catálogo
            </Button>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
