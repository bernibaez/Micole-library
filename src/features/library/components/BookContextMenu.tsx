import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, m } from 'motion/react';
import {
  Bookmark,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FolderMinus,
  FolderPlus,
  Trash2,
} from 'lucide-react';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { TRANSITION_MICRO } from '../../../utils/motion';
import { cn } from '../../../utils/cn';
import type { Book, LibraryStatus, ReadingProgress } from '../../../types';

export interface BookContextMenuState {
  book: Book;
  anchorRect: DOMRect | null;
}

interface BookContextMenuProps {
  state: BookContextMenuState | null;
  onClose: () => void;
  status: LibraryStatus;
  progress?: ReadingProgress;
  inLibrary: boolean;
  isFavorite: boolean;
  activeCollectionName?: string | null;
  onAddToCollection: (book: Book) => void;
  onRemoveFromCollection?: (book: Book) => void;
  onUpdateStatus: (book: Book, status: LibraryStatus) => void;
  onToggleFavorite: (bookId: string) => void;
  onToggleLibrary: (bookId: string) => void;
  onDownload: (book: Book) => void;
}

export function BookContextMenu({
  state,
  onClose,
  status,
  progress,
  inLibrary,
  isFavorite,
  activeCollectionName,
  onAddToCollection,
  onRemoveFromCollection,
  onUpdateStatus,
  onToggleFavorite,
  onToggleLibrary,
  onDownload,
}: BookContextMenuProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const reducedMotion = useReducedMotion();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state || isMobile) return;
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onScroll = () => onClose();
    document.addEventListener('mousedown', onOutside);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [isMobile, onClose, state]);

  if (!state) return null;

  const { book, anchorRect } = state;
  const percent = progress ? Math.round(progress.progress_percent) : 0;
  const isCompleted = status === 'completed' || percent >= 100;
  const isInProgress = !isCompleted && Boolean(progress && progress.current_page > 1);
  const canRead = Boolean((book.file_url || book.drive_file_id) && book.allow_preview !== false);
  const canDownload = Boolean(
    (book.file_url || book.drive_file_id) && book.allow_download !== false
  );

  const actions: Array<{
    id: string;
    label: string;
    icon: typeof BookOpen;
    danger?: boolean;
    accent?: boolean;
    dividerBefore?: boolean;
    onClick: () => void;
  }> = [];

  if (canRead) {
    actions.push({
      id: 'read',
      label: isInProgress
        ? `Continuar lectura (Pág. ${progress?.current_page})`
        : 'Abrir documento',
      icon: BookOpen,
      accent: true,
      onClick: () => {
        onClose();
        navigate(
          isInProgress
            ? `/leer/${book.id}?pagina=${progress?.current_page ?? 1}`
            : `/leer/${book.id}`
        );
      },
    });
  } else {
    actions.push({
      id: 'detail',
      label: 'Ver ficha del documento',
      icon: ExternalLink,
      onClick: () => {
        onClose();
        navigate(`/libro/${book.id}`);
      },
    });
  }

  actions.push({
    id: 'collection',
    label: 'Añadir a una colección',
    icon: FolderPlus,
    onClick: () => {
      onClose();
      onAddToCollection(book);
    },
  });

  if (activeCollectionName && onRemoveFromCollection) {
    actions.push({
      id: 'remove-from-col',
      label: `Quitar de "${activeCollectionName}"`,
      icon: FolderMinus,
      onClick: () => {
        onClose();
        onRemoveFromCollection(book);
      },
    });
  }

  if (status !== 'pending' || isCompleted || isInProgress) {
    actions.push({
      id: 'pending',
      label: 'Marcar como pendiente',
      icon: Clock,
      dividerBefore: true,
      onClick: () => {
        onClose();
        onUpdateStatus(book, 'pending');
      },
    });
  }

  if (!isCompleted) {
    actions.push({
      id: 'completed',
      label: 'Marcar como completado',
      icon: CheckCircle2,
      dividerBefore: status === 'pending' && !isInProgress,
      onClick: () => {
        onClose();
        onUpdateStatus(book, 'completed');
      },
    });
  }

  if (canDownload) {
    actions.push({
      id: 'download',
      label: 'Descargar PDF',
      icon: Download,
      dividerBefore: true,
      onClick: () => {
        onClose();
        onDownload(book);
      },
    });
  }

  actions.push({
    id: 'favorite',
    label: isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos',
    icon: Bookmark,
    dividerBefore: !canDownload,
    onClick: () => {
      onClose();
      onToggleFavorite(book.id);
    },
  });

  if (inLibrary) {
    actions.push({
      id: 'remove-library',
      label: 'Quitar de mi biblioteca',
      icon: Trash2,
      danger: true,
      onClick: () => {
        onClose();
        onToggleLibrary(book.id);
      },
    });
  }

  if (isMobile) {
    return (
      <BottomSheet open={Boolean(state)} onClose={onClose} title={book.title}>
        <div className="p-3 space-y-1">
          {actions.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id}>
                {item.dividerBefore && <div className="my-1.5 border-t border-[#E5E3DD]" />}
                <button
                  type="button"
                  onClick={item.onClick}
                  className={cn(
                    'w-full min-h-[48px] px-3.5 rounded-xl flex items-center gap-3 text-sm font-medium text-left transition-colors',
                    item.danger
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-[#111E32] hover:bg-[#F6F5F1]'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      item.danger
                        ? 'text-red-500'
                        : item.accent
                          ? 'text-[#9A7D43]'
                          : 'text-[#667085]'
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </BottomSheet>
    );
  }

  // Desktop floating dropdown anchored cleanly inside viewport bounds
  const menuWidth = 248;
  const estimatedHeight = actions.length * 40 + 28;
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;

  let left = anchorRect ? anchorRect.right - menuWidth : viewportW / 2 - menuWidth / 2;
  let top = anchorRect ? anchorRect.bottom + 8 : viewportH / 2 - estimatedHeight / 2;

  if (left < 12) left = 12;
  if (left + menuWidth > viewportW - 12) left = viewportW - menuWidth - 12;
  if (top + estimatedHeight > viewportH - 12 && anchorRect) {
    top = Math.max(12, anchorRect.top - estimatedHeight - 8);
  }

  return (
    <AnimatePresence>
      <m.div
        ref={menuRef}
        role="menu"
        aria-label={`Acciones para ${book.title}`}
        initial={reducedMotion ? false : { opacity: 0, y: 6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reducedMotion ? undefined : { opacity: 0, y: 4, scale: 0.97 }}
        transition={TRANSITION_MICRO}
        style={{ position: 'fixed', top, left, width: menuWidth }}
        className="z-50 rounded-2xl border border-[#E5E3DD] bg-white text-[#111E32] shadow-popover p-1.5 text-[13px] font-medium"
      >
        <div className="px-3 py-1.5 border-b border-[#E5E3DD] mb-1">
          <p className="text-xs font-semibold text-[#111E32] truncate">{book.title}</p>
          {book.author && <p className="text-[11px] text-[#667085] truncate">{book.author}</p>}
        </div>

        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id}>
              {item.dividerBefore && <div className="my-1 border-t border-[#E5E3DD]" />}
              <button
                type="button"
                role="menuitem"
                onClick={item.onClick}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors',
                  item.danger
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-[#111E32] hover:bg-[#F6F5F1]'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    item.danger
                      ? 'text-red-500'
                      : item.accent
                        ? 'text-[#9A7D43]'
                        : 'text-[#667085]'
                  )}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </button>
            </div>
          );
        })}
      </m.div>
    </AnimatePresence>
  );
}
