import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { m } from 'motion/react';
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { useAuth } from './AuthContext';
import { AuthInput } from './components/AuthInput';
import { AuthButton } from './components/AuthButton';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { STAGGER_CONTAINER_VARIANTS, STAGGER_ITEM_VARIANTS } from '../../utils/motion';

const schema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido.'),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const reducedMotion = useReducedMotion();
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }: FormValues) => {
    if (isSubmitting) return;
    setServerError(null);
    try {
      await sendPasswordReset(email);
      setSentEmail(email);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'No se pudo enviar el enlace.');
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
          Recuperar contraseña
        </h1>
        <p className="text-sm text-[#667085] leading-relaxed">
          Te enviaremos un enlace seguro para restablecer el acceso a tu cuenta.
        </p>
      </m.div>

      {sentEmail ? (
        <m.div
          initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 space-y-3"
        >
          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>Enlace enviado</span>
          </div>
          <p className="text-xs sm:text-[13px] text-emerald-900/80 leading-relaxed">
            Si existe una cuenta asociada a <strong>{sentEmail}</strong>, recibirás un correo con
            instrucciones para definir una nueva contraseña.
          </p>
          <Link to="/iniciar-sesion" className="block pt-2">
            <AuthButton type="button">Volver a iniciar sesión</AuthButton>
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
            <m.div variants={STAGGER_ITEM_VARIANTS}>
              <AuthInput
                id="forgot-email"
                label="Correo electrónico"
                type="email"
                autoComplete="email"
                placeholder="Correo electrónico"
                leftIcon={<Mail className="h-[18px] w-[18px]" />}
                error={errors.email?.message}
                {...register('email')}
              />
            </m.div>

            <m.div variants={STAGGER_ITEM_VARIANTS} className="pt-1">
              <AuthButton type="submit" loading={isSubmitting}>
                Enviar enlace de recuperación
              </AuthButton>
            </m.div>
          </form>

          <m.p variants={STAGGER_ITEM_VARIANTS} className="text-center text-sm text-[#667085]">
            ¿Recordaste tu contraseña?{' '}
            <Link
              to="/iniciar-sesion"
              className="font-semibold text-[#8B6E32] hover:text-[#6E5624] transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5AA70]"
            >
              Iniciar sesión
            </Link>
          </m.p>
        </>
      )}
    </m.div>
  );
}
