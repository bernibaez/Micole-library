import { FolderPlus, Plus } from 'lucide-react';
import { CollectionCard } from './CollectionCard';
import { Button } from '../../../components/ui/Button';
import type { UserCollection } from '../../../types';

interface CollectionsSectionProps {
  collections: UserCollection[];
  selectedCollectionId: string | null;
  onSelectCollection: (collectionId: string | null) => void;
  onCreateCollection: () => void;
  onEditCollection: (collection: UserCollection) => void;
  onManageBooks: (collection: UserCollection) => void;
  onDeleteCollection: (collection: UserCollection) => void;
}

export function CollectionsSection({
  collections,
  selectedCollectionId,
  onSelectCollection,
  onCreateCollection,
  onEditCollection,
  onManageBooks,
  onDeleteCollection,
}: CollectionsSectionProps) {
  return (
    <section aria-labelledby="library-collections-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="library-collections-heading"
          className="text-xs font-semibold uppercase tracking-[0.14em] text-[#667085]"
        >
          Colecciones personalizadas
        </h2>
        {selectedCollectionId && (
          <button
            type="button"
            onClick={() => onSelectCollection(null)}
            className="text-xs font-semibold text-[#9A7D43] hover:text-[#111E32] transition-colors"
          >
            Ver toda mi biblioteca
          </button>
        )}
      </div>

      {collections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D8D4C9] bg-white/70 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <span className="h-10 w-10 rounded-xl bg-[#F6F5F1] border border-[#E5E3DD] text-[#9A7D43] inline-flex items-center justify-center shrink-0">
              <FolderPlus className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#111E32]">
                Organiza tu estudio en colecciones
              </p>
              <p className="text-xs text-[#667085] leading-relaxed">
                Agrupa códigos, jurisprudencia y doctrina por materia, caso o examen.
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={onCreateCollection}
            className="rounded-full shrink-0 self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Crear primera colección
          </Button>
        </div>
      ) : (
        <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          {collections.map((col) => {
            const isSelected = selectedCollectionId === col.id;
            return (
              <CollectionCard
                key={col.id}
                collection={col}
                selected={isSelected}
                onSelect={() => onSelectCollection(isSelected ? null : col.id)}
                onEdit={() => onEditCollection(col)}
                onManageBooks={() => onManageBooks(col)}
                onDelete={() => onDeleteCollection(col)}
              />
            );
          })}

          {/* Dashed card to create a new collection */}
          <button
            type="button"
            onClick={onCreateCollection}
            className="shrink-0 w-[184px] sm:w-[196px] min-h-[66px] rounded-2xl border border-dashed border-[#D5D1C7] bg-white/55 hover:bg-white hover:border-[#C5AA70] px-4 py-3 inline-flex items-center justify-center gap-2.5 text-[#667085] hover:text-[#111E32] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5AA70]"
          >
            <span className="h-8 w-8 rounded-xl bg-[#F6F5F1] border border-[#E5E3DD] text-[#9A7D43] inline-flex items-center justify-center shrink-0">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-xs font-semibold whitespace-nowrap">Nueva colección</span>
          </button>
        </div>
      )}
    </section>
  );
}
