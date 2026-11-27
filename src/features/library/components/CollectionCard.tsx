import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { BookPlus, FolderOpen, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { CollectionIcon } from './CollectionIcon';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { EASE_EDITORIAL, TRANSITION_MICRO } from '../../../utils/motion';
import { cn } from '../../../utils/cn';
import type { UserCollection } from '../../../types';

interface CollectionCardProps {
  collection: UserCollection;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onManageBooks: () => void;
  onDelete: () => void;
}

export function CollectionCard({
  collection,
  selected,
  onSelect,
  onEdit,
  onManageBooks,
  onDelete,
}: CollectionCardProps) {
  const reducedMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const count = collection.book_ids.length;
  const accentColor = collection.color || '#111E32';

  useEffect(() => {
    if (!menuOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <m.div
      layout={!reducedMotion}
      initial={reducedMotion ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: EASE_EDITORIAL }}
      className={cn(
        'group relative shrink-0 w-[216px] sm:w-[228px] rounded-2xl border px-3.5 py-3 transition-all duration-200 flex items-center gap-3',
        selected
          ? 'bg-[#111E32] border-[#111E32] text-white shadow-[0_10px_24px_-12px_rgba(17,30,50,0.45)]'
          : 'bg-white border-[#E5E3DD] text-[#111E32] hover:border-[#C5AA70]/70 hover:-translate-y-0.5 shadow-subtle'
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex items-center gap-3 flex-1 min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5AA70] rounded-xl"
      >
        <span
          className={cn(
            'h-10 w-10 rounded-xl inline-flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-[1.03]',
            selected ? 'bg-white/12 text-[#E5C784]' : 'text-white'
          )}
          style={selected ? undefined : { backgroundColor: accentColor }}
          aria-hidden="true"
        >
          <CollectionIcon iconId={collection.icon} className="h-[18px] w-[18px]" strokeWidth={1.85} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-semibold truncate leading-snug">
            {collection.name}
          </span>
          <span
            className={cn(
              'block text-xs tabular-nums mt-0.5',
              selected ? 'text-white/70' : 'text-[#667085]'
            )}
          >
            {count} {count === 1 ? 'documento' : 'documentos'}
          </span>
        </span>
      </button>

      {/* Contextual Menu */}
      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={`Opciones de la colección ${collection.name}`}
          aria-expanded={menuOpen}
          className={cn(
            'h-8 w-8 rounded-lg inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5AA70]',
            selected
              ? 'text-white/75 hover:text-white hover:bg-white/10'
              : 'text-[#667085] hover:text-[#111E32] hover:bg-[#F6F5F1]'
          )}
        >
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <m.div
              role="menu"
              initial={reducedMotion ? false : { opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: 4, scale: 0.96 }}
              transition={TRANSITION_MICRO}
              className="absolute right-0 top-9 z-40 w-48 rounded-2xl border border-[#E5E3DD] bg-white text-[#111E32] shadow-popover p-1.5 text-xs font-medium"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onSelect();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#F6F5F1] text-left"
              >
                <FolderOpen className="h-3.5 w-3.5 text-[#667085]" />
                <span>{selected ? 'Salir de colección' : 'Ver documentos'}</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onManageBooks();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#F6F5F1] text-left"
              >
                <BookPlus className="h-3.5 w-3.5 text-[#9A7D43]" />
                <span>Añadir o quitar libros</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#F6F5F1] text-left"
              >
                <Pencil className="h-3.5 w-3.5 text-[#667085]" />
                <span>Editar colección</span>
              </button>

              <div className="my-1 border-t border-[#E5E3DD]" />

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-50 text-red-600 text-left"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Eliminar colección</span>
              </button>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </m.div>
  );
}
