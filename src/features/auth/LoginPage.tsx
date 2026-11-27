import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { m } from 'motion/react';
import { AlertCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { getRememberMePreference, useAuth } from './AuthContext';
import { AuthInput } from './components/AuthInput';
import { AuthButton } from './components/AuthButton';
import { GoogleAuthButton } from './components/GoogleAuthButton';
import { useToast } from '../../components/feedback/ToastProvider';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { STAGGER_CONTAINER_VARIANTS, STAGGER_ITEM_VARIANTS } from '../../utils/motion';

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido.'),
  password: z.string().min(6, 'Ingresa tu contraseña (mínimo 6 caracteres).'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { signInWithEmail, signInWithGoogle, enterDemoSession, isSupabaseConfigured } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(() => getRememberMePreference());
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
    if (isSubmitting) return;
    setServerError(null);
    try {
      await signInWithEmail(values.email, values.password, { rememberMe });
      notify('Sesión iniciada correctamente');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    }
  };

  const handleGoogle = async () => {
    if (googleLoading) return;
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
    <m.div
      variants={STAGGER_CONTAINER_VARIANTS}
      initial={reducedMotion ? false : 'hidden'}
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <m.div variants={STAGGER_ITEM_VARIANTS} className="text-center space-y-1.5">
        <h1 className="text-[26px] sm:text-[31px] font-bold text-[#111E32] tracking-[-0.02em] leading-tight">
          Bienvenido de nuevo
        </h1>
        <p className="text-sm text-[#667085]">Inicia sesión en tu cuenta para continuar</p>
      </m.div>

      {serverError && (
        <m.div
          initial={reducedMotion ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 flex items-start gap-2.5"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{serverError}</span>
        </m.div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <m.div variants={STAGGER_ITEM_VARIANTS}>
          <AuthInput
            id="login-email"
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            placeholder="Correo electrónico"
            leftIcon={<Mail className="h-[18px] w-[18px]" />}
            error={errors.email?.message}
            {...register('email')}
          />
        </m.div>

        <m.div variants={STAGGER_ITEM_VARIANTS}>
          <AuthInput
            id="login-password"
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Contraseña"
            leftIcon={<Lock className="h-[18px] w-[18px]" />}
            error={errors.password?.message}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-[#667085] hover:text-[#111E32] transition-colors rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5AA70]"
              >
                {showPassword ? (
                  <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
                ) : (
                  <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
                )}
              </button>
            }
            {...register('password')}
          />
        </m.div>

        {/* Remember me + Forgot password */}
        <m.div
          variants={STAGGER_ITEM_VARIANTS}
          className="flex items-center justify-between gap-2 pt-0.5"
        >
          <label
            htmlFor="login-remember"
            className="inline-flex items-center gap-2.5 min-h-[44px] cursor-pointer select-none text-[13px] text-[#667085] hover:text-[#111E32] transition-colors"
          >
            <input
              id="login-remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-[#CBD2DF] text-[#111E32] accent-[#111E32] focus:ring-2 focus:ring-[#C5AA70]"
            />
            <span>Recordarme</span>
          </label>

          <Link
            to="/recuperar-contrasena"
            className="inline-flex items-center min-h-[44px] text-[13px] font-medium text-[#8B6E32] hover:text-[#6E5624] transition-colors rounded-lg px-1 -mr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5AA70]"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </m.div>

        <m.div variants={STAGGER_ITEM_VARIANTS} className="pt-1">
          <AuthButton type="submit" loading={isSubmitting}>
            Iniciar sesión
          </AuthButton>
        </m.div>
      </form>

      {/* Divider */}
      <m.div variants={STAGGER_ITEM_VARIANTS} className="relative flex items-center py-1">
        <div className="flex-1 border-t border-[#E2E5EB]" />
        <span className="px-3.5 text-xs text-[#667085]">O inicia sesión con</span>
        <div className="flex-1 border-t border-[#E2E5EB]" />
      </m.div>

      {/* Google + Optional Local Demo */}
      <m.div variants={STAGGER_ITEM_VARIANTS} className="space-y-3">
        <GoogleAuthButton loading={googleLoading} onClick={handleGoogle} />

        {!isSupabaseConfigured && (
          <button
            type="button"
            onClick={async () => {
              await enterDemoSession();
              notify('Sesión local activada para probar tu biblioteca', 'info');
              navigate(redirectTo, { replace: true });
            }}
            className="w-full min-h-[44px] text-center text-xs font-medium text-[#667085] hover:text-[#111E32] transition-colors rounded-xl"
          >
            Continuar en modo demostración local
          </button>
        )}
      </m.div>

      {/* Register link */}
      <m.p variants={STAGGER_ITEM_VARIANTS} className="text-center text-sm text-[#667085] pt-1">
        ¿No tienes una cuenta?{' '}
        <Link
          to="/crear-cuenta"
          className="font-semibold text-[#8B6E32] hover:text-[#6E5624] transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5AA70]"
        >
          Regístrate
        </Link>
      </m.p>
    </m.div>
  );
}
