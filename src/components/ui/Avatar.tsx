import { cn } from '../../utils/cn';
import { getInitials } from '../../utils/format';

interface AvatarProps {
  src?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  xs: 'h-7 w-7 text-[11px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

export function Avatar({ src, firstName, lastName, email, size = 'md', className }: AvatarProps) {
  const initials = getInitials(firstName, lastName, email);

  if (src) {
    return (
      <img
        src={src}
        alt={`Foto de perfil de ${firstName || email || 'usuario'}`}
        className={cn(
          'rounded-full object-cover border border-line bg-surface-secondary shrink-0',
          sizeMap[size],
          className
        )}
      />
    );
  }

  return (
    <span
      aria-label={`Avatar de ${firstName || email || 'usuario'}`}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-navy text-white font-semibold tracking-tight border border-navy/10 shrink-0 select-none',
        sizeMap[size],
        className
      )}
    >
      {initials}
    </span>
  );
}
