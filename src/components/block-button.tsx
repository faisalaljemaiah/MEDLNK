"use client";

import { useState, useTransition } from "react";
import { blockUserAction, unblockUserAction } from "@/app/actions/blocks";

/** Settings' "Blocked accounts" list — a plain one-way unblock, no confirm
 *  dialog and no re-block toggle (that lives on the profile page itself). */
export function UnblockButton({
  blockedId,
  path,
}: {
  blockedId: string;
  path: string;
}) {
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (removed) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await unblockUserAction(blockedId, path);
            if ("error" in result) {
              setError(result.error);
            } else {
              setRemoved(true);
            }
          })
        }
        className="text-xs font-medium text-accent hover:underline disabled:opacity-60"
      >
        Unblock
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function BlockButton({
  blockedId,
  initialBlocked,
  path,
}: {
  blockedId: string;
  initialBlocked: boolean;
  path: string;
}) {
  const [blocked, setBlocked] = useState(initialBlocked);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    if (!blocked && !window.confirm("Block this account? They won't be able to message or follow you, and you won't see their posts.")) {
      return;
    }
    setError(null);
    const next = !blocked;
    setBlocked(next);
    startTransition(async () => {
      const result = next
        ? await blockUserAction(blockedId, path)
        : await unblockUserAction(blockedId, path);
      if ("error" in result) {
        setBlocked(!next);
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
        className="text-xs text-muted hover:text-danger disabled:opacity-60"
      >
        {blocked ? "Unblock" : "Block"}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
