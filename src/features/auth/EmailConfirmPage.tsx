import { Link, useSearchParams } from 'react-router-dom';
import { m } from 'motion/react';
import { CheckCircle2, MailCheck } from 'lucide-react';
import { useAuth } from './AuthContext';
import { AuthButton } from './components/AuthButton';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { STAGGER_CONTAINER_VARIANTS, STAGGER_ITEM_VARIANTS } from '../../utils/motion';

export function EmailConfirmPage() {
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const reducedMotion = useReducedMotion();
  const email = searchParams.get('email');

  return (
    <m.div
      variants={STAGGER_CONTAINER_VARIANTS}
      initial={reducedMotion ? false : 'hidden'}
      animate="visible"
      className="space-y-6"
    >
      <m.div variants={STAGGER_ITEM_VARIANTS} className="text-center space-y-1.5">
        <h1 className="text-[26px] sm:text-[31px] font-bold text-[#111E32] tracking-[-0.02em] leading-tight">
          {isAuthenticated ? 'Correo confirmado' : 'Confirma tu correo electrónico'}
        </h1>
        <p className="text-sm text-[#667085] leading-relaxed">
          {isAuthenticated
            ? 'Tu cuenta ha sido verificada y ya puedes disfrutar de todas las herramientas de MICOLE LIBRARY.'
            : 'Hemos enviado un enlace de verificación para activar tu cuenta personal.'}
        </p>
      </m.div>

      <m.div
        variants={STAGGER_ITEM_VARIANTS}
        className="rounded-2xl border border-[#E2E5EB] bg-[#F8F9FB] p-6 space-y-4"
      >
        <div className="h-12 w-12 rounded-xl bg-[#111E32] text-[#E5C784] inline-flex items-center justify-center">
          {isAuthenticated ? (
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          ) : (
            <MailCheck className="h-6 w-6" aria-hidden="true" />
          )}
        </div>

        {isAuthenticated ? (
          <p className="text-sm text-[#667085] leading-relaxed">
            Tu dirección de correo está verificada. Ya puedes organizar colecciones, marcar páginas
            y sincronizar tu lectura.
          </p>
        ) : (
          <p className="text-sm text-[#667085] leading-relaxed">
            Revisa la bandeja de entrada{' '}
            {email ? (
              <>
                de <strong className="text-[#111E32]">{email}</strong>
              </>
            ) : (
              'de tu correo'
            )}{' '}
            (y la carpeta de correo no deseado) y haz clic en el enlace de confirmación.
          </p>
        )}

        <div className="space-y-3 pt-2">
          <Link to={isAuthenticated ? '/mi-biblioteca' : '/iniciar-sesion'} className="block">
            <AuthButton type="button">
              {isAuthenticated ? 'Ir a mi biblioteca' : 'Ir a iniciar sesión'}
            </AuthButton>
          </Link>
          <Link
            to="/explorar"
            className="flex items-center justify-center w-full h-[50px] rounded-full bg-white border border-[#E2E5EB] hover:bg-[#F8F9FB] text-[#111E32] text-sm font-semibold transition-colors"
          >
            Explorar catálogo
          </Link>
        </div>
      </m.div>
    </m.div>
  );
}
