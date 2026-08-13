"use client";

import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { toggleFollowCaseAction } from "@/app/actions/interactive";

export function CaseFollowButton({
  caseId,
  initialFollowing,
  initialCount,
  path,
}: {
  caseId: string;
  initialFollowing: boolean;
  initialCount: number;
  path: string;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    setError(null);
    const next = !following;
    setFollowing(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));

    startTransition(async () => {
      const result = await toggleFollowCaseAction(caseId, path);
      if ("error" in result) {
        setFollowing(!next);
        setCount((c) => Math.max(0, c + (next ? -1 : 1)));
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-pressed={following}
        className={clsx(
          "rounded-full border px-4 py-1.5 text-sm font-medium transition-[color,background-color,transform] duration-150 ease-out active:scale-95 disabled:opacity-60",
          following
            ? "border-accent bg-accent/10 text-accent"
            : "border-line text-text hover:border-accent hover:text-accent",
        )}
      >
        {following ? "Following case" : "Follow case"}
        {count > 0 && (
          <span className="ml-1.5 font-normal text-muted">{count}</span>
        )}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
      {following && !error && (
        <p className="text-xs text-muted">
          You&apos;ll be notified when the author posts an update.
        </p>
      )}
    </div>
  );
}
