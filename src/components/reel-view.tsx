import { ReelSlide } from "@/components/reel-slide";
import type { FeedCase } from "@/lib/cases";

export function ReelView({ cases, path }: { cases: FeedCase[]; path: string }) {
  if (cases.length === 0) {
    return (
      <div className="flex h-[calc(100dvh-56px)] w-full shrink-0 items-center justify-center bg-bg text-sm text-muted">
        No cases yet — be the first to share one.
      </div>
    );
  }

  return (
    <div className="no-scrollbar h-[calc(100dvh-56px)] w-full shrink-0 snap-y snap-mandatory overflow-y-scroll">
      {cases.map((c) => (
        <ReelSlide key={c.id} feedCase={c} path={path} />
      ))}
    </div>
  );
}
