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

/** Avatar + one or two text lines — the bones shared by most list rows
 *  (notifications, conversations, consult requests, thread headers). */
export function AvatarRowSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 shrink-0 rounded-full bg-surface-2" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-2/5 rounded bg-surface-2" />
        {lines > 1 && <div className="h-2.5 w-3/5 rounded bg-surface-2" />}
      </div>
    </div>
  );
}

export function NotificationsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border-t border-line px-4 py-3 first:border-t-0">
          <AvatarRowSkeleton />
        </div>
      ))}
    </div>
  );
}

export function MessagesSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse flex flex-col gap-2.5 px-4 py-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-line bg-surface p-3.5">
          <AvatarRowSkeleton />
        </div>
      ))}
    </div>
  );
}

export function ConversationSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <div
        className="flex animate-pulse items-center gap-3 border-b border-line px-4 py-3"
        aria-busy="true"
        aria-label="Loading"
      >
        <div className="h-5 w-5 shrink-0 rounded bg-surface-2" />
        <AvatarRowSkeleton lines={1} />
      </div>
      <div className="flex-1 animate-pulse space-y-2 px-4 py-4">
        <div className="flex justify-start">
          <div className="h-8 w-2/5 rounded-2xl bg-surface-2" />
        </div>
        <div className="flex justify-end">
          <div className="h-8 w-1/3 rounded-2xl bg-surface-2" />
        </div>
        <div className="flex justify-start">
          <div className="h-8 w-1/2 rounded-2xl bg-surface-2" />
        </div>
        <div className="flex justify-end">
          <div className="h-8 w-2/5 rounded-2xl bg-surface-2" />
        </div>
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse px-4 py-6">
      <div className="h-5 w-24 rounded bg-surface-2" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="mt-6">
          <div className="mb-2 h-3 w-24 rounded bg-surface-2" />
          <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
            <div className="h-3 w-3/4 rounded bg-surface-2" />
            <div className="h-3 w-1/2 rounded bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CaseDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="flex animate-pulse items-center gap-3 border-b border-line px-4 py-3">
        <div className="h-5 w-5 shrink-0 rounded bg-surface-2" />
        <AvatarRowSkeleton lines={1} />
      </div>
      <div className="animate-pulse px-4 py-5">
        <div className="h-5 w-3/4 rounded bg-surface-2" />
        <div className="mt-3 aspect-[4/3] w-full rounded-xl bg-surface-2" />
        <div className="mt-4 space-y-1.5">
          <div className="h-3 w-full rounded bg-surface-2" />
          <div className="h-3 w-5/6 rounded bg-surface-2" />
          <div className="h-3 w-2/3 rounded bg-surface-2" />
        </div>
        <div className="mt-4 flex gap-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-5 w-5 rounded bg-surface-2" />
          ))}
        </div>
      </div>
      <div className="animate-pulse border-t border-line">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="border-b border-line px-4 py-3">
            <AvatarRowSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SearchSkeleton() {
  return (
    <div>
      <div className="animate-pulse px-4 py-4" aria-busy="true" aria-label="Loading">
        <div className="h-10 w-full rounded-full bg-surface-2" />
        <div className="mt-3 flex gap-2">
          <div className="h-6 w-16 rounded-full bg-surface-2" />
          <div className="h-6 w-20 rounded-full bg-surface-2" />
          <div className="h-6 w-14 rounded-full bg-surface-2" />
        </div>
      </div>
      <FeedSkeleton count={3} />
    </div>
  );
}

export function ExchangeSkeleton() {
  return (
    <div className="animate-pulse px-4 py-4" aria-busy="true" aria-label="Loading">
      <div className="h-5 w-40 rounded bg-surface-2" />
      <div className="mt-1.5 h-3 w-56 rounded bg-surface-2" />
      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-7 w-20 rounded-full bg-surface-2" />
        ))}
      </div>
    </div>
  );
}

export function ConsultsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border-t border-line px-4 py-4 first:border-t-0">
          <div className="h-4 w-2/3 rounded bg-surface-2" />
          <div className="mt-2">
            <AvatarRowSkeleton lines={1} />
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="h-3 w-full rounded bg-surface-2" />
            <div className="h-3 w-3/4 rounded bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LearnSkeleton() {
  return (
    <div className="animate-pulse px-4 py-4" aria-busy="true" aria-label="Loading">
      <div className="h-5 w-24 rounded bg-surface-2" />
      <div className="mt-1.5 h-3 w-64 rounded bg-surface-2" />
      <div className="mt-4 h-16 rounded-xl border border-line bg-surface" />
      <div className="mt-4 h-16 rounded-xl border border-line bg-surface" />
    </div>
  );
}

export function PersonalAnalyticsSkeleton() {
  return (
    <div className="animate-pulse px-4 py-6" aria-busy="true" aria-label="Loading">
      <div className="h-5 w-32 rounded bg-surface-2" />
      <div className="mt-1.5 h-3 w-64 rounded bg-surface-2" />
      <div className="mt-6 h-24 rounded-2xl border border-line bg-surface" />
      <div className="mt-6 flex items-end gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 flex-1 rounded-t bg-surface-2" />
        ))}
      </div>
    </div>
  );
}

export function ComposeSkeleton() {
  return (
    <div className="animate-pulse px-4 py-6" aria-busy="true" aria-label="Loading">
      <div className="h-5 w-48 rounded bg-surface-2" />
      <div className="mt-1.5 h-3 w-64 rounded bg-surface-2" />
      <div className="mt-6 space-y-3">
        <div className="h-10 rounded-xl bg-surface-2" />
        <div className="h-28 rounded-xl bg-surface-2" />
        <div className="h-10 rounded-xl bg-surface-2" />
      </div>
    </div>
  );
}

export function CommunitySkeleton() {
  return (
    <div className="animate-pulse px-4 py-6" aria-busy="true" aria-label="Loading">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 rounded-full bg-surface-2" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 rounded bg-surface-2" />
          <div className="h-3 w-28 rounded bg-surface-2" />
        </div>
      </div>
      <div className="mt-4 h-3 w-full rounded bg-surface-2" />
      <div className="mt-2 h-3 w-2/3 rounded bg-surface-2" />
      <div className="mt-5 h-9 w-32 rounded-full bg-surface-2" />
    </div>
  );
}

export function AdminSkeleton() {
  return (
    <div className="animate-pulse px-4 py-6" aria-busy="true" aria-label="Loading">
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-surface-2" />
        ))}
      </div>
      <div className="mt-6 h-40 rounded-xl bg-surface-2" />
    </div>
  );
}
