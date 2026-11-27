import { Skeleton } from '../../../components/ui/Skeleton';

export function LibrarySkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Cargando tu biblioteca">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-9 w-52 rounded-xl" />
          <Skeleton className="h-4 w-80 max-w-full rounded-lg" />
        </div>
        <Skeleton className="h-10 w-40 rounded-full" />
      </div>

      {/* Collections strip skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-40 rounded-full" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[66px] w-[220px] shrink-0 rounded-2xl" />
          ))}
        </div>
      </div>

      {/* Continue reading skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-56 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[138px] rounded-2xl" />
          ))}
        </div>
      </div>

      {/* Tabs + toolbar skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[2/3] w-full rounded-book" />
              <Skeleton className="h-3.5 w-5/6 rounded" />
              <Skeleton className="h-3 w-2/3 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
