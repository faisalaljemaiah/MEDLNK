"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { toggleFollowCaseAction } from "@/app/actions/interactive";
import { Avatar } from "@/components/avatar";
import type { CaseFollowerProfile } from "@/lib/interactive";

export function CaseFollowButton({
  caseId,
  initialFollowing,
  initialCount,
  followedFollowers = [],
  signedIn,
  path,
}: {
  caseId: string;
  initialFollowing: boolean;
  initialCount: number;
  /** People the viewer follows who also follow this case — shown as a
   *  small avatar stack next to the count. Empty when signed out. */
  followedFollowers?: CaseFollowerProfile[];
  signedIn: boolean;
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
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          disabled={isPending || !signedIn}
          aria-pressed={following}
          className={clsx(
            "rounded-full border px-4 py-1.5 text-sm font-medium transition-[color,background-color,transform] duration-150 ease-out active:scale-95 disabled:opacity-60",
            following
              ? "border-accent bg-accent/10 text-accent"
              : "border-line text-text hover:border-accent hover:text-accent",
          )}
        >
          {following ? "Following case" : "Follow case"}
          <span className="ml-1.5 font-normal text-muted">{count}</span>
        </button>

        {/* Social proof: people the viewer already follows who follow this
            case too, same idea as "3 people you follow like this" — just
            scoped to a case instead of a post. */}
        {followedFollowers.length > 0 && (
          <div className="flex items-center -space-x-2">
            {followedFollowers.slice(0, 3).map((f) => (
              <Link
                key={f.id}
                href={f.handle ? `/u/${f.handle}` : "#"}
                title={f.full_name ?? undefined}
                className="rounded-full ring-2 ring-surface transition-transform duration-150 ease-out hover:z-10 hover:scale-110"
              >
                <Avatar avatarUrl={f.avatar_url} name={f.full_name} size="xs" />
              </Link>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {!signedIn && (
        <p className="text-xs text-muted">
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>{" "}
          to follow this case.
        </p>
      )}
      {signedIn && following && !error && (
        <p className="text-xs text-muted">
          You&apos;ll be notified when the author posts an update.
        </p>
      )}
    </div>
  );
}
