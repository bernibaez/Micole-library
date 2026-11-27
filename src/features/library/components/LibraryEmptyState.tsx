import { Link } from 'react-router-dom';
import { BookPlus, RotateCcw } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { LexMascot } from '../../../components/mascot/LexMascot';
import { LexNotFoundMascot } from '../../../components/mascot/LexNotFoundMascot';
import type { LibraryTabId } from './LibraryTabs';

interface LibraryEmptyStateProps {
  variant: LibraryTabId | 'collection' | 'search';
  collectionName?: string;
  searchQuery?: string;
  onClearSearch?: () => void;
  onManageCollectionBooks?: () => void;
}

const COPY: Record<
  LibraryTabId,
  { title: string; description: string; mascot: 'welcome' | 'search' }
> = {
  all: {
    title: 'Tu próxima lectura te espera',
    description:
      'Explora el catálogo y guarda los documentos jurídicos que más te interesen para seguir tu progreso.',
    mascot: 'welcome',
  },
  reading: {
    title: 'Sin lecturas en curso',
    description:
      'Cuando abras un documento en el visor PDF, aparecerá aquí para retomarlo exactamente donde lo dejaste.',
    mascot: 'welcome',
  },
  favorites: {
    title: 'Aún no tienes favoritos',
    description:
      'Marca tus leyes, sentencias y obras clave como favoritas para consultarlas rápidamente.',
    mascot: 'welcome',
  },
  pending: {
    title: 'No hay lecturas pendientes',
    description:
      'Guarda documentos del catálogo o márcalos como pendientes para organizar tu plan de estudio.',
    mascot: 'welcome',
  },
  completed: {
    title: 'Sin documentos completados',
    description:
      'Los libros que termines de leer o marques como completados aparecerán en esta sección.',
    mascot: 'welcome',
  },
  downloads: {
    title: 'Aún no hay descargas registradas',
    description:
      'Los PDFs que descargues desde la biblioteca aparecerán aquí para un acceso inmediato.',
    mascot: 'welcome',
  },
};

export function LibraryEmptyState({
  variant,
  collectionName,
  searchQuery,
  onClearSearch,
  onManageCollectionBooks,
}: LibraryEmptyStateProps) {
  const isSearch = variant === 'search';
  const isCollection = variant === 'collection';

  const title = isSearch
    ? 'Sin resultados en tu biblioteca'
    : isCollection
      ? `La colección "${collectionName ?? ''}" aún está vacía`
      : COPY[variant].title;

  const description = isSearch
    ? `No encontramos documentos que coincidan con "${searchQuery}". Prueba con otro título, autor o materia.`
    : isCollection
      ? 'Añade libros, legislación o jurisprudencia a esta colección para tenerlos siempre a mano.'
      : COPY[variant].description;

  return (
    <div className="flex flex-col items-center justify-center text-center py-10 sm:py-14 px-6 rounded-3xl border border-[#E5E3DD] bg-white shadow-subtle">
      {isSearch ? (
        <LexNotFoundMascot className="mb-3 scale-90" />
      ) : (
        <LexMascot
          autoGreet={false}
          sizeClassName="h-[118px] sm:h-[134px]"
          className="mb-3"
        />
      )}

      <h3 className="font-editorial text-xl sm:text-2xl font-semibold text-[#111E32] tracking-tight">
        {title}
      </h3>
      <p className="text-sm text-[#667085] max-w-md mt-1.5 leading-relaxed">{description}</p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
        {isSearch && onClearSearch ? (
          <Button
            variant="primary"
            size="md"
            onClick={onClearSearch}
            className="rounded-full bg-[#111E32] hover:bg-[#192B45] px-5"
          >
            <RotateCcw className="h-4 w-4 text-[#E5C784]" aria-hidden="true" />
            Limpiar búsqueda
          </Button>
        ) : (
          <>
            {isCollection && onManageCollectionBooks && (
              <Button
                variant="primary"
                size="md"
                onClick={onManageCollectionBooks}
                className="rounded-full bg-[#111E32] hover:bg-[#192B45] px-5"
              >
                <BookPlus className="h-4 w-4 text-[#E5C784]" aria-hidden="true" />
                Añadir documentos
              </Button>
            )}
            <Link to="/explorar">
              <Button
                variant={isCollection ? 'secondary' : 'primary'}
                size="md"
                className="rounded-full px-5"
              >
                Explorar catálogo
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
