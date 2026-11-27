import { cn } from '../../utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('editorial-shimmer rounded-xl', className)}
    />
  );
}

export function BookCardSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="aspect-[2/3] w-full rounded-book" />
      <Skeleton className="h-3.5 w-4/5 rounded-md" />
      <Skeleton className="h-3 w-3/5 rounded-md" />
    </div>
  );
}

export function BookGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div
      aria-label="Cargando recursos"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-7"
    >
      {Array.from({ length: count }, (_, idx) => (
        <BookCardSkeleton key={idx} />
      ))}
    </div>
  );
}

export function HomeDashboardSkeleton() {
  return (
    <div aria-label="Cargando biblioteca" className="space-y-10">
      {/* Header + Search Skeleton */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-9 w-56" />
        </div>
        <Skeleton className="h-12 w-full lg:max-w-[520px] rounded-full" />
      </div>

      {/* Featured Reading Card Skeleton */}
      <div className="rounded-3xl bg-white border border-line/85 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
        <Skeleton className="w-[118px] aspect-[2/3] rounded-book shrink-0" />
        <div className="flex-1 w-full space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-2 w-full max-w-md rounded-full" />
          <div className="flex gap-2.5 pt-2">
            <Skeleton className="h-10 w-40 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
          </div>
        </div>
      </div>

      {/* Shelf Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <BookGridSkeleton count={6} />
      </div>
    </div>
  );
}

export function BookDetailSkeleton() {
  return (
    <div aria-label="Cargando ficha del recurso" className="space-y-8 py-2">
      <Skeleton className="h-5 w-24" />
      <div className="grid grid-cols-1 md:grid-cols-[210px_1fr] lg:grid-cols-[248px_1fr] gap-8 lg:gap-12">
        <Skeleton className="aspect-[2/3] w-44 sm:w-52 md:w-full mx-auto md:mx-0 rounded-book" />
        <div className="space-y-5">
          <div className="space-y-2.5">
            <Skeleton className="h-3.5 w-44" />
            <Skeleton className="h-10 w-4/5" />
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-6 w-40 rounded-full" />
          </div>
          <div className="flex gap-2.5">
            <Skeleton className="h-11 w-36 rounded-full" />
            <Skeleton className="h-11 w-32 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <div className="pt-6 border-t border-line grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-2.5">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
