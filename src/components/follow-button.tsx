"use client";

import { useState, useTransition } from "react";
import { toggleFollowAction } from "@/app/actions/reactions";

export function FollowButton({
  followeeId,
  initialFollowing,
  path,
}: {
  followeeId: string;
  initialFollowing: boolean;
  path: string;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    setError(null);
    const next = !following;
    setFollowing(next);
    startTransition(async () => {
      const result = await toggleFollowAction(followeeId, path);
      if ("error" in result) {
        setFollowing(!next);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        className={
          following
            ? "rounded-full border border-line px-4 py-1.5 text-sm font-medium text-text disabled:opacity-60"
            : "rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60"
        }
      >
        {following ? "Following" : "Follow"}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
