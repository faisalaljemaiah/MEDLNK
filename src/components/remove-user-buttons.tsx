"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeUserAction, removeAndBlockUserAction } from "@/app/actions/admin";

/**
 * The only destructive one-click actions in the admin Users directory —
 * everything else there (Suspend, Reset 2FA) is reversible. window.confirm
 * is the one place that's safe to reach for it: this is a client component
 * specifically so a stray click can't delete someone's account outright.
 */
export function RemoveUserButtons({
  profileId,
  viewerHandle,
  displayName,
}: {
  profileId: string;
  viewerHandle: string | null;
  displayName: string;
}) {
  const router = useRouter();
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (removed) return null;

  function runRemove(block: boolean) {
    const question = block
      ? `Remove ${displayName} and permanently block their email from signing up again? This cannot be undone.`
      : `Remove ${displayName}? Their email can still be used to sign up again. This cannot be undone.`;
    if (!window.confirm(question)) return;

    startTransition(async () => {
      setError(null);
      const action = block ? removeAndBlockUserAction : removeUserAction;
      const result = await action(profileId, viewerHandle);
      if (result && "error" in result) {
        setError(result.error);
      } else {
        // Only this button strip is client-side state — the rest of the
        // card (name, badges, document link) is server-rendered by the
        // parent UsersDirectory, so hiding just this component would leave
        // a now-buttonless ghost card behind. revalidateAdminViews already
        // invalidated /admin server-side; router.refresh() is what
        // actually re-fetches it so the whole row disappears.
        setRemoved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => runRemove(false)}
          className="rounded-lg border border-danger/50 px-3.5 py-2 text-sm font-medium text-danger disabled:opacity-60"
        >
          Remove
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => runRemove(true)}
          className="rounded-lg border border-danger bg-danger px-3.5 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Remove &amp; block
        </button>
      </div>
      {error && (
        <p className="max-w-[16rem] text-right text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
