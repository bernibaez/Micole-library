import { m } from 'motion/react';
import { Bookmark, CheckCircle2, Download } from 'lucide-react';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { EASE_EDITORIAL } from '../../../utils/motion';
import { cn } from '../../../utils/cn';
import type { LibraryStatus, ReadingProgress as ReadingProgressType } from '../../../types';

interface ReadingProgressBarProps {
  percent: number;
  className?: string;
}

export function ReadingProgressBar({ percent, className }: ReadingProgressBarProps) {
  const reducedMotion = useReducedMotion();
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));

  return (
    <div
      className={cn('h-1.5 w-full rounded-full bg-[#ECE9E1] overflow-hidden', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progreso de lectura: ${clamped}%`}
    >
      <m.div
        initial={reducedMotion ? false : { width: 0 }}
        animate={{ width: `${Math.max(clamped > 0 ? 4 : 0, clamped)}%` }}
        transition={{ duration: 0.32, ease: EASE_EDITORIAL }}
        className="h-full rounded-full bg-gradient-to-r from-[#C5AA70] to-[#DFC17F]"
      />
    </div>
  );
}

interface ReadingStatusLineProps {
  status: LibraryStatus;
  progress?: ReadingProgressType;
  isFavorite?: boolean;
  isDownloaded?: boolean;
  showBar?: boolean;
}

export function ReadingStatusLine({
  status,
  progress,
  isFavorite = false,
  isDownloaded = false,
  showBar = true,
}: ReadingStatusLineProps) {
  const percent = progress ? Math.min(100, Math.round(progress.progress_percent)) : 0;
  const isCompleted = status === 'completed' || percent >= 100;
  const isReading = !isCompleted && (status === 'reading' || percent > 0);

  return (
    <div className="space-y-1.5 pt-1">
      {isReading && showBar && <ReadingProgressBar percent={percent} className="h-[4px]" />}

      <div className="flex items-center justify-between gap-1.5 min-h-[16px]">
        {isCompleted ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Completado</span>
          </span>
        ) : isReading ? (
          <span className="text-[11px] font-medium text-[#8F7236] tabular-nums truncate">
            {percent > 0 ? `${percent}%` : 'En lectura'}
            {progress?.current_page ? ` · Pág. ${progress.current_page}` : ''}
          </span>
        ) : (
          <span className="text-[11px] text-[#667085] truncate">Pendiente</span>
        )}

        <span className="inline-flex items-center gap-1.5 shrink-0">
          {isDownloaded && (
            <span title="Descargado" aria-label="Descargado" className="text-[#667085]">
              <Download className="h-3 w-3" aria-hidden="true" />
            </span>
          )}
          {isFavorite && (
            <span title="Favorito" aria-label="En favoritos" className="text-[#C5AA70]">
              <Bookmark className="h-3 w-3 fill-current" aria-hidden="true" />
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
