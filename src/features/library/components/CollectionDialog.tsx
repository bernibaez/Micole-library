import { useState } from 'react';
import { Check } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { COLLECTION_COLORS, COLLECTION_ICONS } from './collectionMeta';
import { cn } from '../../../utils/cn';
import type { UserCollection } from '../../../types';

const SUGGESTED_NAMES = [
  'Derecho Penal',
  'Derecho Procesal Penal',
  'Exámenes',
  'Jurisprudencia',
  'Legislación dominicana',
];

export interface CollectionFormPayload {
  name: string;
  description: string;
  color: string;
  icon: string;
}

interface CollectionDialogProps {
  open: boolean;
  editingCollection?: UserCollection | null;
  onClose: () => void;
  onSubmit: (payload: CollectionFormPayload) => Promise<unknown>;
}

function CollectionDialogForm({
  editingCollection,
  onClose,
  onSubmit,
}: Omit<CollectionDialogProps, 'open'>) {
  const [name, setName] = useState(editingCollection?.name ?? '');
  const [description, setDescription] = useState(editingCollection?.description ?? '');
  const [color, setColor] = useState(editingCollection?.color ?? COLLECTION_COLORS[0].hex);
  const [icon, setIcon] = useState(editingCollection?.icon ?? COLLECTION_ICONS[0].id);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(editingCollection);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        color,
        icon,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-5">
      <div className="space-y-2">
        <Input
          label="Nombre de la colección"
          placeholder="Ej. Derecho Procesal Penal"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        {!isEditing && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {SUGGESTED_NAMES.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setName(suggestion)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-[#E5E3DD] bg-[#F6F5F1] text-[#667085] hover:text-[#111E32] hover:border-[#C5AA70] transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="collection-desc" className="block text-xs font-medium text-[#111E32]">
          Descripción (opcional)
        </label>
        <textarea
          id="collection-desc"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Notas breves sobre el propósito de esta colección..."
          className="w-full rounded-xl border border-[#E5E3DD] bg-white px-3 py-2 text-sm text-[#111E32] placeholder:text-[#667085]/70 focus:border-[#111E32] focus:outline-none"
        />
      </div>

      {/* Icon Picker */}
      <div className="space-y-2">
        <span className="block text-xs font-medium text-[#111E32]">Icono representativo</span>
        <div className="grid grid-cols-5 gap-2">
          {COLLECTION_ICONS.map(({ id, label, Icon }) => {
            const active = icon === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setIcon(id)}
                title={label}
                aria-label={`Icono ${label}`}
                aria-pressed={active}
                className={cn(
                  'h-10 rounded-xl border inline-flex items-center justify-center transition-all',
                  active
                    ? 'border-[#111E32] text-white shadow-subtle'
                    : 'border-[#E5E3DD] bg-white text-[#667085] hover:text-[#111E32] hover:border-[#C5AA70]'
                )}
                style={active ? { backgroundColor: color } : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Picker */}
      <div className="space-y-2">
        <span className="block text-xs font-medium text-[#111E32]">Color editorial</span>
        <div className="flex flex-wrap items-center gap-2.5">
          {COLLECTION_COLORS.map(({ hex, name: colorName }) => {
            const active = color.toUpperCase() === hex.toUpperCase();
            return (
              <button
                key={hex}
                type="button"
                onClick={() => setColor(hex)}
                title={colorName}
                aria-label={`Color ${colorName}`}
                aria-pressed={active}
                className={cn(
                  'h-8 w-8 rounded-full inline-flex items-center justify-center border-2 transition-transform',
                  active ? 'border-[#C5AA70] scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                )}
                style={{ backgroundColor: hex }}
              >
                {active && <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E3DD]">
        <Button type="button" variant="secondary" size="sm" onClick={onClose} className="rounded-full">
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          loading={submitting}
          disabled={!name.trim()}
          className="rounded-full bg-[#111E32] hover:bg-[#192B45] px-5"
        >
          {isEditing ? 'Guardar cambios' : 'Crear colección'}
        </Button>
      </div>
    </form>
  );
}

export function CollectionDialog({
  open,
  editingCollection = null,
  onClose,
  onSubmit,
}: CollectionDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingCollection ? 'Editar colección' : 'Nueva colección'}
      description={
        editingCollection
          ? 'Actualiza el nombre, icono o color de esta colección personal.'
          : 'Agrupa libros, leyes y jurisprudencia por asignatura, caso o examen.'
      }
      size="sm"
    >
      {open && (
        <CollectionDialogForm
          key={editingCollection?.id ?? 'new'}
          editingCollection={editingCollection}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      )}
    </Modal>
  );
}
