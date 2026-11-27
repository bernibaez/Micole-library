import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { m } from 'motion/react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import { PasswordStrength } from './PasswordStrength';
import { useAuth } from './AuthContext';
import { AuthInput } from './components/AuthInput';
import { AuthButton } from './components/AuthButton';
import { useToast } from '../../components/feedback/ToastProvider';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { STAGGER_CONTAINER_VARIANTS, STAGGER_ITEM_VARIANTS } from '../../utils/motion';

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
  const reducedMotion = useReducedMotion();

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
    if (isSubmitting) return;
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
    <m.div
      variants={STAGGER_CONTAINER_VARIANTS}
      initial={reducedMotion ? false : 'hidden'}
      animate="visible"
      className="space-y-6"
    >
      <m.div variants={STAGGER_ITEM_VARIANTS} className="text-center space-y-1.5">
        <h1 className="text-[26px] sm:text-[31px] font-bold text-[#111E32] tracking-[-0.02em] leading-tight">
          Restablecer contraseña
        </h1>
        <p className="text-sm text-[#667085]">
          Define una nueva contraseña segura para tu cuenta de MICOLE LIBRARY.
        </p>
      </m.div>

      {done ? (
        <m.div
          initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 space-y-3"
        >
          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>Contraseña actualizada</span>
          </div>
          <p className="text-xs sm:text-[13px] text-emerald-900/80">
            Tu contraseña ha sido actualizada. Te redirigiremos al inicio de sesión.
          </p>
          <Link to="/iniciar-sesion" className="block pt-1">
            <AuthButton type="button">Ir a iniciar sesión</AuthButton>
          </Link>
        </m.div>
      ) : (
        <>
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
            <m.div variants={STAGGER_ITEM_VARIANTS} className="space-y-1">
              <AuthInput
                id="reset-password"
                label="Nueva contraseña"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Nueva contraseña (mín. 8 caracteres)"
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
              <PasswordStrength password={passwordVal} />
            </m.div>

            <m.div variants={STAGGER_ITEM_VARIANTS}>
              <AuthInput
                id="reset-confirm-password"
                label="Confirmar nueva contraseña"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Confirmar nueva contraseña"
                leftIcon={<Lock className="h-[18px] w-[18px]" />}
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
            </m.div>

            <m.div variants={STAGGER_ITEM_VARIANTS} className="pt-1">
              <AuthButton type="submit" loading={isSubmitting}>
                Guardar nueva contraseña
              </AuthButton>
            </m.div>
          </form>
        </>
      )}
    </m.div>
  );
}
