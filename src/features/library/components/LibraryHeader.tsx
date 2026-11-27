import { FolderPlus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface LibraryHeaderProps {
  onCreateCollection: () => void;
}

export function LibraryHeader({ onCreateCollection }: LibraryHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3.5 pb-1">
      <div className="space-y-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A7D43]">
          Espacio personal
        </p>
        <h1 className="font-editorial text-[28px] sm:text-[34px] font-semibold text-[#111E32] tracking-tight leading-[1.12]">
          Mi biblioteca
        </h1>
        <p className="text-sm text-[#667085] leading-relaxed">
          Tus libros guardados, lecturas en curso y colecciones personalizadas
        </p>
      </div>

      <Button
        variant="primary"
        size="md"
        onClick={onCreateCollection}
        className="rounded-full bg-[#111E32] hover:bg-[#192B45] px-5 h-10 sm:h-11 self-start sm:self-auto shrink-0 shadow-subtle"
      >
        <FolderPlus className="h-4 w-4 text-[#E5C784]" aria-hidden="true" />
        <span>Nueva colección</span>
      </Button>
    </header>
  );
}
