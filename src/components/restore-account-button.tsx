"use client";

import { useState, useTransition } from "react";
import { restoreAccountAction } from "@/app/actions/account";

/**
 * A plain `<form action={restoreAccountAction}>` doesn't type-check —
 * restoreAccountAction can return `{ error }` on failure, and a form
 * action's type only allows `void | Promise<void>`. Wrapped the same way
 * DeleteAccount (src/components/delete-account.tsx) already handles the
 * other half of this same action pair, so a failed restore says so instead
 * of silently doing nothing.
 */
export function RestoreAccountButton() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await restoreAccountAction();
            if (result && "error" in result) {
              setError(result.error);
            }
          })
        }
        className="w-full rounded-full bg-accent px-5 py-3 text-center text-sm font-medium text-accent-foreground transition-transform duration-150 ease-out active:scale-95 disabled:opacity-60"
      >
        {isPending ? "Restoring…" : "Restore my account"}
      </button>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
