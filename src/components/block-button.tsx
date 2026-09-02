"use client";

import { useState, useTransition } from "react";
import { unblockUserAction } from "@/app/actions/blocks";

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
