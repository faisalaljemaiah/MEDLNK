"use client";

import { useState, useTransition } from "react";
import { unblockUserAction } from "@/app/actions/blocks";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/database.types";

/** Settings' "Blocked accounts" list — a plain one-way unblock, no confirm
 *  dialog and no re-block toggle (that lives on the profile page itself). */
export function UnblockButton({
  blockedId,
  path,
  locale = "en",
}: {
  blockedId: string;
  path: string;
  locale?: Locale;
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
        {t(locale, "settings.unblock")}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
