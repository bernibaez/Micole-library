import { LibraryBookCard, type LibraryBookEntry } from './LibraryBookCard';
import type { Book } from '../../../types';

interface LibraryBookGridProps {
  entries: LibraryBookEntry[];
  onOpenMenu: (book: Book, anchorRect: DOMRect | null) => void;
}

export function LibraryBookGrid({ entries, onOpenMenu }: LibraryBookGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-4 sm:gap-x-5 gap-y-6 sm:gap-y-7 items-start">
      {entries.map((entry, idx) => (
        <LibraryBookCard
          key={entry.book.id}
          entry={entry}
          index={idx}
          onOpenMenu={onOpenMenu}
        />
      ))}
    </div>
  );
}
