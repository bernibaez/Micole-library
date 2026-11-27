import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { DOCUMENT_TYPE_LABELS, VALIDITY_STATUS_LABELS } from '../../utils/format';

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  category: string;
  author: string;
  year: string;
  type: string;
  validity: string;
  subject: string;
  sort: string;
  categories: string[];
  authors: string[];
  years: number[];
  subjects: string[];
  onChange: (key: string, value: string) => void;
  onClearAll: () => void;
}

export function FilterSheet({
  open,
  onClose,
  category,
  author,
  year,
  type,
  validity,
  subject,
  sort,
  categories,
  authors,
  years,
  subjects,
  onChange,
  onClearAll,
}: FilterSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Filtros y ordenamiento">
      <div className="p-5 space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="sheet-category"
            className="text-xs font-semibold text-navy uppercase tracking-wider"
          >
            Categoría
          </label>
          <select
            id="sheet-category"
            value={category}
            onChange={(e) => onChange('categoria', e.target.value)}
            className="w-full h-11 rounded-xl border border-line-strong bg-white px-3 text-sm text-ink"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label
              htmlFor="sheet-type"
              className="text-xs font-semibold text-navy uppercase tracking-wider"
            >
              Tipo
            </label>
            <select
              id="sheet-type"
              value={type}
              onChange={(e) => onChange('tipo', e.target.value)}
              className="w-full h-11 rounded-xl border border-line-strong bg-white px-3 text-sm text-ink"
            >
              <option value="">Todos</option>
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="sheet-validity"
              className="text-xs font-semibold text-navy uppercase tracking-wider"
            >
              Vigencia
            </label>
            <select
              id="sheet-validity"
              value={validity}
              onChange={(e) => onChange('vigencia', e.target.value)}
              className="w-full h-11 rounded-xl border border-line-strong bg-white px-3 text-sm text-ink"
            >
              <option value="">Todas</option>
              {Object.entries(VALIDITY_STATUS_LABELS)
                .filter(([k]) => k !== 'no_aplica')
                .map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {subjects.length > 0 && (
          <div className="space-y-1.5">
            <label
              htmlFor="sheet-subject"
              className="text-xs font-semibold text-navy uppercase tracking-wider"
            >
              Materia
            </label>
            <select
              id="sheet-subject"
              value={subject}
              onChange={(e) => onChange('materia', e.target.value)}
              className="w-full h-11 rounded-xl border border-line-strong bg-white px-3 text-sm text-ink"
            >
              <option value="">Todas las materias</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label
              htmlFor="sheet-author"
              className="text-xs font-semibold text-navy uppercase tracking-wider"
            >
              Autor
            </label>
            <select
              id="sheet-author"
              value={author}
              onChange={(e) => onChange('autor', e.target.value)}
              className="w-full h-11 rounded-xl border border-line-strong bg-white px-3 text-sm text-ink"
            >
              <option value="">Todos</option>
              {authors.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="sheet-year"
              className="text-xs font-semibold text-navy uppercase tracking-wider"
            >
              Año
            </label>
            <select
              id="sheet-year"
              value={year}
              onChange={(e) => onChange('anio', e.target.value)}
              className="w-full h-11 rounded-xl border border-line-strong bg-white px-3 text-sm text-ink"
            >
              <option value="">Todos</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="sheet-sort"
            className="text-xs font-semibold text-navy uppercase tracking-wider"
          >
            Ordenar por
          </label>
          <select
            id="sheet-sort"
            value={sort}
            onChange={(e) => onChange('orden', e.target.value)}
            className="w-full h-11 rounded-xl border border-line-strong bg-white px-3 text-sm text-ink"
          >
            <option value="relevance">Relevancia</option>
            <option value="recent">Más recientes</option>
            <option value="popular">Popularidad</option>
            <option value="title">Título (A-Z)</option>
          </select>
        </div>

        <div className="pt-3 flex items-center gap-2.5 border-t border-line">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              onClearAll();
              onClose();
            }}
          >
            Limpiar filtros
          </Button>
          <Button variant="primary" className="flex-1" onClick={onClose}>
            Ver resultados
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
