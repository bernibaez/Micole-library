import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { m } from 'motion/react';
import { AlertCircle, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { PasswordStrength } from './PasswordStrength';
import { useAuth } from './AuthContext';
import { AuthInput } from './components/AuthInput';
import { AuthButton } from './components/AuthButton';
import { GoogleAuthButton } from './components/GoogleAuthButton';
import { useToast } from '../../components/feedback/ToastProvider';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { STAGGER_CONTAINER_VARIANTS, STAGGER_ITEM_VARIANTS } from '../../utils/motion';

const registerSchema = z
  .object({
    firstName: z.string().min(2, 'Ingresa tu nombre (mínimo 2 caracteres).'),
    lastName: z.string().min(2, 'Ingresa tus apellidos (mínimo 2 caracteres).'),
    email: z.string().email('Ingresa un correo electrónico válido.'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres.')
      .regex(/[A-Za-z]/, 'Incluye al menos una letra.')
      .regex(/\d/, 'Incluye al menos un número.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  });

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  });

  const passwordValue = watch('password', '');

  const onSubmit = async (values: RegisterValues) => {
    if (isSubmitting) return;
    setServerError(null);
    try {
      const { requiresEmailConfirmation } = await signUpWithEmail({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
      });

      if (requiresEmailConfirmation) {
        navigate(`/confirmar-correo?email=${encodeURIComponent(values.email)}`);
      } else {
        notify('Cuenta creada correctamente');
        navigate('/', { replace: true });
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.');
    }
  };

  const handleGoogle = async () => {
    if (googleLoading) return;
    setServerError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle('/');
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
      className="space-y-5"
    >
      <m.div variants={STAGGER_ITEM_VARIANTS} className="text-center space-y-1.5">
        <h1 className="text-[26px] sm:text-[31px] font-bold text-[#111E32] tracking-[-0.02em] leading-tight">
          Crear cuenta
        </h1>
        <p className="text-sm text-[#667085]">Organiza tus lecturas y sincroniza tu progreso</p>
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
        <m.div
          variants={STAGGER_ITEM_VARIANTS}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3.5"
        >
          <AuthInput
            id="register-first-name"
            label="Nombre"
            type="text"
            autoComplete="given-name"
            placeholder="Nombre"
            leftIcon={<User className="h-[18px] w-[18px]" />}
            error={errors.firstName?.message}
            {...register('firstName')}
          />

          <AuthInput
            id="register-last-name"
            label="Apellidos"
            type="text"
            autoComplete="family-name"
            placeholder="Apellidos"
            leftIcon={<User className="h-[18px] w-[18px]" />}
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </m.div>

        <m.div variants={STAGGER_ITEM_VARIANTS}>
          <AuthInput
            id="register-email"
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            placeholder="Correo electrónico"
            leftIcon={<Mail className="h-[18px] w-[18px]" />}
            error={errors.email?.message}
            {...register('email')}
          />
        </m.div>

        <m.div variants={STAGGER_ITEM_VARIANTS} className="space-y-1">
          <AuthInput
            id="register-password"
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Contraseña (mín. 8 caracteres)"
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
          <PasswordStrength password={passwordValue} />
        </m.div>

        <m.div variants={STAGGER_ITEM_VARIANTS}>
          <AuthInput
            id="register-confirm-password"
            label="Confirmar contraseña"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Confirmar contraseña"
            leftIcon={<Lock className="h-[18px] w-[18px]" />}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </m.div>

        <m.div variants={STAGGER_ITEM_VARIANTS} className="pt-1">
          <AuthButton type="submit" loading={isSubmitting}>
            Crear cuenta
          </AuthButton>
        </m.div>
      </form>

      <m.div variants={STAGGER_ITEM_VARIANTS} className="relative flex items-center py-0.5">
        <div className="flex-1 border-t border-[#E2E5EB]" />
        <span className="px-3.5 text-xs text-[#667085]">O regístrate con</span>
        <div className="flex-1 border-t border-[#E2E5EB]" />
      </m.div>

      <m.div variants={STAGGER_ITEM_VARIANTS}>
        <GoogleAuthButton loading={googleLoading} onClick={handleGoogle} />
      </m.div>

      <m.p variants={STAGGER_ITEM_VARIANTS} className="text-center text-sm text-[#667085] pt-0.5">
        ¿Ya tienes una cuenta?{' '}
        <Link
          to="/iniciar-sesion"
          className="font-semibold text-[#8B6E32] hover:text-[#6E5624] transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5AA70]"
        >
          Iniciar sesión
        </Link>
      </m.p>
    </m.div>
  );
}
