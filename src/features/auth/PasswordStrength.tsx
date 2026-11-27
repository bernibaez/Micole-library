import { cn } from '../../utils/cn';

function evaluatePassword(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score += 1;

  const labels = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Segura'];
  const colors = [
    'bg-red-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-emerald-500',
    'bg-emerald-600',
  ];

  return {
    score,
    label: labels[score],
    color: colors[score],
  };
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, color } = evaluatePassword(password);

  return (
    <div className="space-y-1.5 pt-1" aria-live="polite">
      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={cn(
              'h-1.5 rounded-full transition-colors duration-200',
              score >= step ? color : 'bg-surface-tertiary'
            )}
          />
        ))}
      </div>
      <p className="text-[11px] text-ink-muted">
        Seguridad de la contraseña: <span className="font-semibold text-navy">{label}</span>
      </p>
    </div>
  );
}
