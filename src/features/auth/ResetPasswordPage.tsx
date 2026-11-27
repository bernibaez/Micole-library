import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { PasswordStrength } from './PasswordStrength';
import { useAuth } from './AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/feedback/ToastProvider';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres.')
      .regex(/[A-Za-z]/, 'Incluye al menos una letra.')
      .regex(/\d/, 'Incluye al menos un número.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const passwordVal = watch('password', '');

  const onSubmit = async ({ password }: FormValues) => {
    setServerError(null);
    try {
      await updatePassword(password);
      setDone(true);
      notify('Contraseña actualizada correctamente');
      window.setTimeout(() => navigate('/iniciar-sesion', { replace: true }), 1800);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.');
    }
  };

  return (
    <AuthLayout
      title="Restablecer contraseña"
      subtitle="Define una nueva contraseña segura para tu cuenta de MICOLE LIBRARY."
    >
      {done ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Contraseña actualizada
          </div>
          <p className="text-xs text-emerald-900/80">
            Tu contraseña ha sido actualizada. Te redirigiremos al inicio de sesión.
          </p>
          <Link to="/iniciar-sesion" className="block">
            <Button variant="primary" size="sm" className="w-full">
              Ir a iniciar sesión
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
            <div>
              <Input
                label="Nueva contraseña"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                leftIcon={<Lock className="h-4 w-4" />}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="p-1.5 text-ink-muted hover:text-navy"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.password?.message}
                {...register('password')}
              />
              <PasswordStrength password={passwordVal} />
            </div>

            <Input
              label="Confirmar nueva contraseña"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repite tu contraseña"
              leftIcon={<Lock className="h-4 w-4" />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting}>
              Guardar nueva contraseña
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
