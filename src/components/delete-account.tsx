"use client";

import { useState, useTransition } from "react";
import { deleteAccountAction } from "@/app/actions/account";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/database.types";

export function DeleteAccount({ locale = "en" }: { locale?: Locale }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left text-sm font-medium text-danger hover:underline"
      >
        {t(locale, "settings.deleteAccount")}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-danger/40 bg-danger/5 p-3">
      <p className="text-xs leading-relaxed text-text">
        {t(locale, "settings.deleteAccountWarning")}
      </p>
      <label className="text-xs text-muted">
        {t(locale, "settings.deleteAccountConfirmPrefix")}{" "}
        <span className="font-medium text-text">DELETE</span>{" "}
        {t(locale, "settings.deleteAccountConfirmSuffix")}
      </label>
      <input
        type="text"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        className="rounded-lg border border-line bg-bg px-3 py-2 text-sm text-text"
        autoComplete="off"
      />
      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await deleteAccountAction(confirmation);
              if (result && "error" in result) {
                setError(result.error);
              }
            })
          }
          className="rounded-full bg-danger px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending
            ? t(locale, "settings.deleteAccountDeleting")
            : t(locale, "settings.deleteAccountPermanently")}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirmation("");
            setError(null);
          }}
          className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-text"
        >
          {t(locale, "common.cancel")}
        </button>
      </div>
    </div>
  );
}
