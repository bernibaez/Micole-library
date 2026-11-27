import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const schema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido.'),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }: FormValues) => {
    setServerError(null);
    try {
      await sendPasswordReset(email);
      setSentEmail(email);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'No se pudo enviar el enlace.');
    }
  };

  return (
    <AuthLayout
      title="Recuperar contraseña"
      subtitle="Te enviaremos un enlace seguro para restablecer el acceso a tu cuenta."
    >
      {sentEmail ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Enlace enviado
          </div>
          <p className="text-xs text-emerald-900/80 leading-relaxed">
            Si existe una cuenta asociada a <strong>{sentEmail}</strong>, recibirás un correo con
            instrucciones para definir una nueva contraseña.
          </p>
          <Link to="/iniciar-sesion" className="block pt-1">
            <Button variant="secondary" size="sm" className="w-full">
              Volver a iniciar sesión
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {serverError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-700 flex items-start gap-2.5"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
            <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting}>
              Enviar enlace de recuperación
            </Button>
          </form>

          <p className="text-center text-sm text-ink-muted">
            <Link to="/iniciar-sesion" className="font-semibold text-navy hover:text-gold-dark">
              Volver a iniciar sesión
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
