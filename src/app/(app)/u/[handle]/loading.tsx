import { FeedSkeleton } from "@/components/skeletons";

// The profile header is a different shape from a case card, so it gets its
// own placeholder rather than falling back to the group-level feed skeleton.
export default function Loading() {
  return (
    <div>
      <div className="animate-pulse px-4 py-6" aria-busy="true" aria-label="Loading">
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 shrink-0 rounded-full bg-surface-2" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 rounded bg-surface-2" />
            <div className="h-3 w-52 rounded bg-surface-2" />
            <div className="h-3 w-32 rounded bg-surface-2" />
            <div className="mt-3 flex gap-4">
              <div className="h-3 w-20 rounded bg-surface-2" />
              <div className="h-3 w-20 rounded bg-surface-2" />
            </div>
          </div>
        </div>
      </div>
      <FeedSkeleton count={2} />
    </div>
  );
}
