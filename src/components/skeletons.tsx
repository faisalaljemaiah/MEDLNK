/**
 * Shown by the route-level loading.tsx while a server component streams in.
 * Shapes mirror CaseCard so the swap to real content doesn't jump the layout.
 */
export function CaseCardSkeleton() {
  return (
    <div className="border-b border-line px-4 py-5">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 shrink-0 rounded-full bg-surface-2" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-32 rounded bg-surface-2" />
          <div className="h-2.5 w-44 rounded bg-surface-2" />
        </div>
      </div>

      <div className="mt-4 h-4 w-3/4 rounded bg-surface-2" />
      <div className="mt-2.5 space-y-1.5">
        <div className="h-3 w-full rounded bg-surface-2" />
        <div className="h-3 w-2/3 rounded bg-surface-2" />
      </div>

      <div className="mt-3.5 flex gap-2">
        <div className="h-5 w-20 rounded-full bg-surface-2" />
        <div className="h-5 w-24 rounded-full bg-surface-2" />
        <div className="h-5 w-16 rounded-full bg-surface-2" />
      </div>

      <div className="mt-4 flex gap-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-5 w-5 rounded bg-surface-2" />
        ))}
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <CaseCardSkeleton key={i} />
      ))}
    </div>
  );
}
