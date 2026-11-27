import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { m } from 'motion/react';
import {
  BookCheck,
  Bookmark,
  BookOpen,
  Camera,
  Download,
  History,
  KeyRound,
  LogOut,
  Settings,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { PasswordStrength } from '../auth/PasswordStrength';
import { usePersonalLibrary } from '../library/useLibraryData';
import { AvatarUploaderModal } from './AvatarUploaderModal';
import {
  removeUserAvatar,
  updateUserProfile,
  uploadUserAvatar,
} from '../../services/profileService';
import { Avatar } from '../../components/ui/Avatar';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { AnimatedCounter } from '../../components/ui/AnimatedCounter';
import { useToast } from '../../components/feedback/ToastProvider';
import { formatFullDate } from '../../utils/format';
import {
  SCROLL_REVEAL_VARIANTS,
  STAGGER_CONTAINER_VARIANTS,
  STAGGER_ITEM_VARIANTS,
  VIEWPORT_ONCE,
} from '../../utils/motion';
import type { UserType } from '../../types';

const profileSchema = z.object({
  first_name: z.string().min(2, 'Ingresa tu nombre.'),
  last_name: z.string().min(2, 'Ingresa tus apellidos.'),
  phone: z.string().max(30).optional().or(z.literal('')),
  institution: z.string().max(120).optional().or(z.literal('')),
  career: z.string().max(120).optional().or(z.literal('')),
  user_type: z.enum(['estudiante', 'profesor', 'investigador']),
  bio: z.string().max(400, 'La biografía no debe superar los 400 caracteres.').optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres.')
      .regex(/[A-Za-z]/, 'Incluye al menos una letra.')
      .regex(/\d/, 'Incluye al menos un número.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

const USER_TYPE_LABELS: Record<UserType, string> = {
  estudiante: 'Estudiante',
  profesor: 'Profesor / Docente',
  investigador: 'Investigador jurídico',
};

export function ProfilePage() {
  const {
    profile,
    userId,
    isDemoSession,
    isSupabaseConfigured,
    refreshProfile,
    updatePassword,
    signOut,
  } = useAuth();
  const { snapshot } = usePersonalLibrary();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: profile?.first_name ?? '',
      last_name: profile?.last_name ?? '',
      phone: profile?.phone ?? '',
      institution: profile?.institution ?? '',
      career: profile?.career ?? '',
      user_type: profile?.user_type ?? 'estudiante',
      bio: profile?.bio ?? '',
    },
  });

  useEffect(() => {
    if (!profile) return;
    reset({
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      phone: profile.phone ?? '',
      institution: profile.institution ?? '',
      career: profile.career ?? '',
      user_type: profile.user_type ?? 'estudiante',
      bio: profile.bio ?? '',
    });
  }, [profile, reset]);

  const {
    register: registerPwd,
    watch: watchPwd,
    handleSubmit: handleSubmitPwd,
    reset: resetPwd,
    formState: { errors: pwdErrors, isSubmitting: submittingPwd },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const newPwdValue = watchPwd('password', '');

  const onSaveProfile = async (values: ProfileFormValues) => {
    if (!userId) return;
    try {
      await updateUserProfile(userId, {
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        phone: values.phone?.trim() || null,
        institution: values.institution?.trim() || null,
        career: values.career?.trim() || null,
        user_type: values.user_type,
        bio: values.bio?.trim() || null,
      });
      await refreshProfile();
      notify('Perfil actualizado correctamente');
    } catch {
      notify('No se pudo guardar el perfil.', 'error');
    }
  };

  const onChangePassword = async ({ password }: PasswordFormValues) => {
    try {
      await updatePassword(password);
      resetPwd();
      notify('Contraseña actualizada correctamente');
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.',
        'error'
      );
    }
  };

  const completedCount = snapshot.progress.filter((p) => p.progress_percent >= 100).length;
  const inProgressCount = snapshot.progress.filter(
    (p) => p.progress_percent > 0 && p.progress_percent < 100
  ).length;
  const consultedCount = new Set(snapshot.history.map((h) => h.book_id)).size;

  const stats = [
    { label: 'Guardados', value: snapshot.library.length, icon: Bookmark },
    { label: 'Consultados', value: consultedCount, icon: History },
    { label: 'Descargados', value: snapshot.downloads.length, icon: Download },
    { label: 'Completados', value: completedCount, icon: BookCheck },
    { label: 'En progreso', value: inProgressCount, icon: BookOpen },
  ];

  const fullName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || 'Tu perfil';

  return (
    <div className="max-w-4xl space-y-8">
      {/* Profile Header */}
      <section className="rounded-2xl border border-line bg-surface-secondary/50 p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar
              src={profile?.avatar_url}
              firstName={profile?.first_name}
              lastName={profile?.last_name}
              email={profile?.email}
              size="xl"
            />
            <button
              type="button"
              onClick={() => setAvatarModalOpen(true)}
              aria-label="Cambiar foto de perfil"
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-navy text-white border-2 border-white inline-flex items-center justify-center hover:bg-navy-secondary shadow-sm transition-colors"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-navy truncate">
                {fullName}
              </h1>
              {profile?.user_type && (
                <Badge variant="gold">{USER_TYPE_LABELS[profile.user_type]}</Badge>
              )}
              {isDemoSession && <Badge variant="outline">Modo local</Badge>}
            </div>
            <p className="text-sm text-ink-muted truncate">{profile?.email}</p>
            {profile?.created_at && (
              <p className="text-xs text-ink-subtle">
                Miembro desde {formatFullDate(profile.created_at)}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1.5">
              <Button variant="secondary" size="sm" onClick={() => setAvatarModalOpen(true)}>
                {profile?.avatar_url ? 'Cambiar foto' : 'Subir foto'}
              </Button>
              {profile?.avatar_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={removingAvatar}
                  onClick={async () => {
                    if (!userId) return;
                    setRemovingAvatar(true);
                    try {
                      await removeUserAvatar(userId);
                      await refreshProfile();
                      notify('Foto de perfil eliminada');
                    } finally {
                      setRemovingAvatar(false);
                    }
                  }}
                  className="text-red-700 hover:bg-red-50 hover:text-red-800"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex sm:flex-col gap-2 shrink-0">
          <Link to="/configuracion">
            <Button variant="secondary" size="sm" className="w-full">
              <Settings className="h-4 w-4" />
              Preferencias
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-700 hover:bg-red-50 hover:text-red-800"
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </section>

      {/* Discreet Academic Activity Indicators */}
      <m.section
        variants={STAGGER_CONTAINER_VARIANTS}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_ONCE}
        className="space-y-3"
      >
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-subtle">
          Actividad académica
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <m.div
              key={label}
              variants={STAGGER_ITEM_VARIANTS}
              className="rounded-xl border border-line bg-white px-4 py-3.5 flex flex-col justify-between gap-2"
            >
              <Icon className="h-4 w-4 text-gold-dark" />
              <div>
                <p className="text-xl font-semibold text-navy tabular-nums">
                  <AnimatedCounter value={value} />
                </p>
                <p className="text-xs text-ink-muted">{label}</p>
              </div>
            </m.div>
          ))}
        </div>
      </m.section>

      {/* Personal Information Form */}
      <m.section
        variants={SCROLL_REVEAL_VARIANTS}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_ONCE}
        className="rounded-2xl border border-line bg-white p-6 space-y-5"
      >
        <div>
          <h2 className="text-lg font-semibold text-navy">Información personal</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Mantén actualizados tus datos académicos y de contacto.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSaveProfile)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre"
              error={errors.first_name?.message}
              {...register('first_name')}
            />
            <Input
              label="Apellidos"
              error={errors.last_name?.message}
              {...register('last_name')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Correo electrónico"
              value={profile?.email ?? ''}
              disabled
              hint="El correo se administra desde tu cuenta de acceso."
            />
            <Input
              label="Teléfono (opcional)"
              placeholder="809-000-0000"
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Universidad o institución"
              placeholder="UASD, PUCMM, UNPHU..."
              error={errors.institution?.message}
              {...register('institution')}
            />
            <Input
              label="Carrera o especialidad"
              placeholder="Derecho Procesal Penal"
              error={errors.career?.message}
              {...register('career')}
            />
            <div className="space-y-1.5">
              <label htmlFor="user_type" className="block text-sm font-medium text-navy">
                Tipo de usuario
              </label>
              <select
                id="user_type"
                className="w-full h-[42px] rounded-lg border border-line-strong bg-white px-3 text-sm text-ink focus:border-navy focus:outline-none"
                {...register('user_type')}
              >
                <option value="estudiante">Estudiante</option>
                <option value="profesor">Profesor</option>
                <option value="investigador">Investigador</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="bio" className="block text-sm font-medium text-navy">
              Biografía académica (opcional)
            </label>
            <textarea
              id="bio"
              rows={3}
              placeholder="Áreas de interés, líneas de investigación o cátedras..."
              className="w-full rounded-lg border border-line-strong bg-white p-3 text-sm text-ink placeholder:text-ink-subtle focus:border-navy focus:outline-none"
              {...register('bio')}
            />
            {errors.bio && (
              <p className="text-xs text-red-600" role="alert">
                {errors.bio.message}
              </p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" loading={isSubmitting} disabled={!isDirty}>
              Guardar cambios
            </Button>
          </div>
        </form>
      </m.section>

      {/* Change Password */}
      <m.section
        variants={SCROLL_REVEAL_VARIANTS}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_ONCE}
        className="rounded-2xl border border-line bg-white p-6 space-y-5"
      >
        <div className="flex items-start gap-3">
          <span className="h-9 w-9 rounded-xl bg-surface-secondary text-navy inline-flex items-center justify-center shrink-0">
            <KeyRound className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-navy">Seguridad y contraseña</h2>
            <p className="text-xs text-ink-muted mt-0.5">
              {isSupabaseConfigured
                ? 'Actualiza tu contraseña periódicamente para proteger tu cuenta.'
                : 'El cambio de contraseña se habilita al conectar tu proyecto de Supabase.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitPwd(onChangePassword)} className="space-y-4 max-w-md">
          <div>
            <Input
              label="Nueva contraseña"
              type="password"
              autoComplete="new-password"
              disabled={!isSupabaseConfigured}
              error={pwdErrors.password?.message}
              {...registerPwd('password')}
            />
            <PasswordStrength password={newPwdValue} />
          </div>
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            autoComplete="new-password"
            disabled={!isSupabaseConfigured}
            error={pwdErrors.confirmPassword?.message}
            {...registerPwd('confirmPassword')}
          />
          <Button
            type="submit"
            variant="secondary"
            loading={submittingPwd}
            disabled={!isSupabaseConfigured}
          >
            Cambiar contraseña
          </Button>
        </form>
      </m.section>

      <AvatarUploaderModal
        open={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        onUpload={async (blob) => {
          if (!userId) return;
          await uploadUserAvatar(userId, blob);
          await refreshProfile();
          notify('Foto de perfil actualizada');
        }}
      />
    </div>
  );
}
