import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const SUGGESTED_NAMES = [
  'Derecho Procesal Penal',
  'Material de estudio',
  'Investigación',
  'Exámenes',
  'Jurisprudencia',
];

const COLORS = ['#101D35', '#1C3152', '#C5A15B', '#2F4D44', '#5C3A41', '#3B4259'];

interface CollectionModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: { name: string; description: string; color: string }) => Promise<unknown>;
}

export function CollectionModal({ open, onClose, onCreate }: CollectionModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onCreate({ name: name.trim(), description: description.trim(), color });
      setName('');
      setDescription('');
      setColor(COLORS[0]);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva colección"
      description="Agrupa libros, leyes y jurisprudencia por asignatura o caso."
      size="sm"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <Input
          label="Nombre de la colección"
          placeholder="Ej. Exámenes Procesal Penal"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_NAMES.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setName(suggestion)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-line bg-surface-secondary text-ink-muted hover:text-navy hover:border-line-strong transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="collection-desc" className="block text-sm font-medium text-navy">
            Descripción (opcional)
          </label>
          <textarea
            id="collection-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notas breves sobre el propósito de esta colección..."
            className="w-full rounded-lg border border-line-strong p-2.5 text-sm text-ink focus:border-navy focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <span className="block text-sm font-medium text-navy">Etiqueta de color</span>
          <div className="flex items-center gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className={`h-7 w-7 rounded-full transition-transform ${
                  color === c ? 'ring-2 ring-offset-2 ring-navy scale-105' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" size="sm" loading={submitting} disabled={!name.trim()}>
            Crear colección
          </Button>
        </div>
      </form>
    </Modal>
  );
}
