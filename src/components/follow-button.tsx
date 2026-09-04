"use client";

import { useState, useTransition } from "react";
import { toggleFollowAction } from "@/app/actions/reactions";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/database.types";

export function FollowButton({
  followeeId,
  initialFollowing,
  path,
  locale = "en",
}: {
  followeeId: string;
  initialFollowing: boolean;
  path: string;
  locale?: Locale;
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
            ? "rounded-full border border-line px-4 py-1.5 text-sm font-medium text-text transition-[background-color,border-color,transform] duration-150 ease-out active:scale-95 disabled:opacity-60"
            : "rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground transition-[background-color,transform] duration-150 ease-out active:scale-95 disabled:opacity-60"
        }
      >
        {following ? t(locale, "common.following") : t(locale, "common.follow")}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
