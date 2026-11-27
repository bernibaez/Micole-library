import { m } from 'motion/react';
import { Bell, BookOpen, LayoutGrid, Moon, Sparkles, Sun } from 'lucide-react';
import { usePreferencesQuery } from '../library/useLibraryData';
import { useToast } from '../../components/feedback/ToastProvider';
import { SCROLL_REVEAL_VARIANTS, VIEWPORT_ONCE } from '../../utils/motion';
import { cn } from '../../utils/cn';
import type { ReaderFitMode, ReaderTheme } from '../../types';

export function SettingsPage() {
  const { preferences, updatePreferences } = usePreferencesQuery();
  const { notify } = useToast();

  const handleUpdate = async (patch: Parameters<typeof updatePreferences>[0]) => {
    await updatePreferences(patch);
    notify('Preferencia guardada');
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark">
          Preferencias
        </p>
        <h1 className="font-editorial text-3xl font-semibold text-navy tracking-tight">
          Configuración
        </h1>
        <p className="text-sm text-ink-muted">
          Personaliza tu experiencia de lectura y exploración en MICOLE LIBRARY.
        </p>
      </div>

      {/* Reader Preferences */}
      <m.section
        variants={SCROLL_REVEAL_VARIANTS}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_ONCE}
        className="rounded-2xl border border-line bg-white p-6 space-y-6"
      >
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-4 w-4 text-gold-dark" />
          <h2 className="text-base font-semibold text-navy">Lector PDF</h2>
        </div>

        <div className="space-y-2.5">
          <p className="text-sm font-medium text-navy">Tema predeterminado del lector</p>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { value: 'light', label: 'Claro', icon: Sun },
                { value: 'sepia', label: 'Sepia', icon: BookOpen },
                { value: 'dark', label: 'Oscuro', icon: Moon },
              ] as Array<{ value: ReaderTheme; label: string; icon: typeof Sun }>
            ).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => void handleUpdate({ reader_theme: value })}
                className={cn(
                  'rounded-xl border px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors',
                  preferences.reader_theme === value
                    ? 'border-navy bg-navy text-white'
                    : 'border-line-strong bg-white text-ink hover:bg-surface-secondary'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5 pt-2 border-t border-line">
          <p className="text-sm font-medium text-navy">Ajuste de página predeterminado</p>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { value: 'width', label: 'Ajustar al ancho' },
                { value: 'page', label: 'Ajustar a la página completa' },
              ] as Array<{ value: ReaderFitMode; label: string }>
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => void handleUpdate({ reader_fit_mode: value })}
                className={cn(
                  'rounded-xl border px-4 py-3 text-sm font-medium transition-colors',
                  preferences.reader_fit_mode === value
                    ? 'border-navy bg-navy text-white'
                    : 'border-line-strong bg-white text-ink hover:bg-surface-secondary'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </m.section>

      {/* Catalog & Interface Preferences */}
      <m.section
        variants={SCROLL_REVEAL_VARIANTS}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_ONCE}
        className="rounded-2xl border border-line bg-white p-6 space-y-5"
      >
        <div className="flex items-center gap-2.5">
          <LayoutGrid className="h-4 w-4 text-gold-dark" />
          <h2 className="text-base font-semibold text-navy">Catálogo e interfaz</h2>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-navy">Vista predeterminada del catálogo</p>
            <p className="text-xs text-ink-muted">Elige entre portadas en cuadrícula o vista detallada en lista.</p>
          </div>
          <div className="inline-flex rounded-xl border border-line-strong p-0.5 bg-surface-secondary">
            {(['grid', 'list'] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => void handleUpdate({ catalog_view: view })}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  preferences.catalog_view === view
                    ? 'bg-white text-navy shadow-sm'
                    : 'text-ink-muted hover:text-navy'
                )}
              >
                {view === 'grid' ? 'Cuadrícula' : 'Lista'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-4 border-t border-line">
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-ink-muted mt-0.5" />
            <div>
              <p className="text-sm font-medium text-navy">Reducir animaciones</p>
              <p className="text-xs text-ink-muted">
                Minimiza transiciones y movimiento en la interfaz.
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={preferences.reduce_motion}
            onChange={(e) => void handleUpdate({ reduce_motion: e.target.checked })}
            aria-label="Reducir animaciones"
            className="h-5 w-5 accent-navy rounded cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between gap-4 pt-4 border-t border-line">
          <div className="flex items-start gap-2.5">
            <Bell className="h-4 w-4 text-ink-muted mt-0.5" />
            <div>
              <p className="text-sm font-medium text-navy">Notificaciones por correo</p>
              <p className="text-xs text-ink-muted">
                Recibe avisos cuando se incorporen nuevas leyes o recursos destacados.
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={preferences.email_notifications}
            onChange={(e) => void handleUpdate({ email_notifications: e.target.checked })}
            aria-label="Notificaciones por correo"
            className="h-5 w-5 accent-navy rounded cursor-pointer"
          />
        </div>
      </m.section>
    </div>
  );
}
