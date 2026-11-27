import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './AuthContext';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/feedback/ToastProvider';
import { cn } from '../../utils/cn';

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido.'),
  password: z.string().min(6, 'Ingresa tu contraseña (mínimo 6 caracteres).'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { signInWithEmail, signInWithGoogle, enterDemoSession, isSupabaseConfigured } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      await signInWithEmail(values.email, values.password);
      notify('Sesión iniciada correctamente');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    }
  };

  const handleGoogle = async () => {
    setServerError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle(redirectTo);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Error con Google OAuth.');
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Bienvenido de nuevo"
      subtitle="Inicia sesión en tu cuenta para continuar"
    >
      {serverError && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 flex items-start gap-2.5"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
        {/* Soft-filled email field matching reference */}
        <div className="space-y-1">
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="Correo electrónico"
            aria-label="Correo electrónico"
            aria-invalid={Boolean(errors.email) || undefined}
            className={cn(
              'w-full h-[50px] rounded-[14px] bg-[#F3F5F8] border px-4 text-sm text-[#101D35] placeholder:text-[#8E98A8] transition-all duration-150 focus:outline-none focus:bg-white',
              errors.email
                ? 'border-red-400 focus:ring-4 focus:ring-red-100'
                : 'border-transparent focus:border-[#101D35]/30 focus:ring-4 focus:ring-[#101D35]/[0.06]'
            )}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-red-600 pl-1" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Soft-filled password field with eye toggle */}
        <div className="space-y-1">
          <div
            className={cn(
              'flex items-center h-[50px] rounded-[14px] bg-[#F3F5F8] border transition-all duration-150 focus-within:bg-white',
              errors.password
                ? 'border-red-400 focus-within:ring-4 focus-within:ring-red-100'
                : 'border-transparent focus-within:border-[#101D35]/30 focus-within:ring-4 focus-within:ring-[#101D35]/[0.06]'
            )}
          >
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Contraseña"
              aria-label="Contraseña"
              aria-invalid={Boolean(errors.password) || undefined}
              className="w-full min-w-0 bg-transparent px-4 text-sm text-[#101D35] placeholder:text-[#8E98A8] focus:outline-none"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="pr-4 pl-2 text-[#8E98A8] hover:text-[#101D35] transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-600 pl-1" role="alert">
              {errors.password.message}
            </p>
          )}
          <div className="flex justify-end pt-1">
            <Link
              to="/recuperar-contrasena"
              className="text-xs font-medium text-[#7A8496] hover:text-[#101D35] transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full h-[50px] rounded-[14px] text-sm font-semibold mt-1 shadow-[0_12px_24px_-10px_rgba(16,29,53,0.55)]"
          loading={isSubmitting}
        >
          Iniciar sesión
        </Button>
      </form>

      <div className="relative flex items-center py-1">
        <div className="flex-1 border-t border-[#E6E9EF]" />
        <span className="px-3.5 text-xs text-[#8E98A8]">O inicia sesión con</span>
        <div className="flex-1 border-t border-[#E6E9EF]" />
      </div>

      <div className="space-y-2.5">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full h-12 rounded-[14px] border-[#E6E9EF] bg-white hover:bg-[#F8FAFC] font-medium"
          loading={googleLoading}
          onClick={handleGoogle}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continuar con Google
        </Button>

        {!isSupabaseConfigured && (
          <button
            type="button"
            onClick={async () => {
              await enterDemoSession();
              notify('Sesión local activada para probar tu biblioteca', 'info');
              navigate(redirectTo, { replace: true });
            }}
            className="w-full text-center text-xs font-medium text-[#7A8496] hover:text-[#101D35] py-1.5 transition-colors"
          >
            Continuar en modo demostración local
          </button>
        )}
      </div>

      <p className="text-center text-xs text-[#7A8496] pt-1">
        ¿No tienes una cuenta?{' '}
        <Link
          to="/crear-cuenta"
          className="font-semibold text-[#C5A15B] hover:text-[#967638] transition-colors"
        >
          Regístrate
        </Link>
      </p>
    </AuthLayout>
  );
}
