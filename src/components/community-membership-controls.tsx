"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  joinCommunityAction,
  leaveCommunityAction,
  saveCommunityAction,
} from "@/app/actions/communities";
import type { CommunityCard } from "@/lib/communities";

/** The community detail page's own join/save/leave controls — the modal
 *  (community-join-modal.tsx) covers the same three actions for the bubble
 *  popup, but this page isn't opened from a click-to-confirm flow, so it
 *  doesn't need the "would you like to join…" framing, just the controls. */
export function CommunityMembershipControls({
  community,
  path,
}: {
  community: CommunityCard;
  path: string;
}) {
  const [status, setStatus] = useState(community.viewerStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: (id: string, path: string) => Promise<{ error: string } | { ok: true }>, next: typeof status) {
    setError(null);
    startTransition(async () => {
      const result = await action(community.id, path);
      if ("error" in result) setError(result.error);
      else setStatus(next);
    });
  }

  if (status === "joined") {
    return (
      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(leaveCommunityAction, null)}
          className="rounded-full border border-line px-4 py-2.5 text-sm font-medium text-text transition-[border-color,transform] duration-150 ease-out active:scale-[0.97] disabled:opacity-60"
        >
          Leave community
        </button>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(joinCommunityAction, "joined")}
          className="rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-[opacity,transform] duration-150 ease-out active:scale-[0.97] disabled:opacity-60"
        >
          Join now
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            run(status === "saved" ? leaveCommunityAction : saveCommunityAction, status === "saved" ? null : "saved")
          }
          className="text-sm font-medium text-muted hover:text-text disabled:opacity-60"
        >
          {status === "saved" ? "Remove from saved" : "Save for later"}
        </button>
      </div>
      {error && (
        <p className="text-xs text-danger">
          {error.includes("Sign in") ? (
            <>
              <Link href="/login" className="text-accent hover:underline">
                Sign in
              </Link>{" "}
              to join a community.
            </>
          ) : (
            error
          )}
        </p>
      )}
    </div>
  );
}
