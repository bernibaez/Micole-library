import { ReadingProgressCard } from './ReadingProgressCard';
import type { Book, ReadingProgress } from '../../../types';

interface ContinueReadingItem {
  book: Book;
  progress: ReadingProgress;
}

interface ContinueReadingSectionProps {
  items: ContinueReadingItem[];
  onOpenMenu: (book: Book, anchorRect: DOMRect | null) => void;
}

export function ContinueReadingSection({ items, onOpenMenu }: ContinueReadingSectionProps) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="continue-reading-heading" className="space-y-3.5">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="continue-reading-heading"
          className="font-editorial text-lg sm:text-xl font-semibold text-[#111E32] tracking-tight"
        >
          Continúa donde lo dejaste
        </h2>
        <span className="text-xs text-[#667085] tabular-nums">
          {items.length} {items.length === 1 ? 'lectura en curso' : 'lecturas en curso'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.slice(0, 3).map(({ book, progress }, idx) => (
          <ReadingProgressCard
            key={book.id}
            book={book}
            progress={progress}
            index={idx}
            onOpenMenu={onOpenMenu}
          />
        ))}
      </div>
    </section>
  );
}
