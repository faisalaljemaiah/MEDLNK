"use client";

import { useRef, useState, useTransition } from "react";
import { clsx } from "clsx";
import { MoreIcon } from "@/components/icons";
import { blockUserAction, unblockUserAction } from "@/app/actions/blocks";
import { reportProfileAction } from "@/app/actions/reports";
import { REPORT_REASONS } from "@/lib/report-reasons";

type View = "menu" | "report" | "reported";

/**
 * Replaces the profile page's old loose "Block" text link with a single
 * overflow trigger at the far right of the action row — Report and Block
 * live behind one "..." the way most social apps keep account-level
 * moderation out of the primary action buttons.
 */
export function ProfileOverflowMenu({
  profileId,
  initialBlocked,
  path,
}: {
  profileId: string;
  initialBlocked: boolean;
  path: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [blocked, setBlocked] = useState(initialBlocked);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function close() {
    setOpen(false);
    // Reset to the menu view after the close animation would have finished,
    // so reopening later doesn't land back on a stale report form.
    setTimeout(() => setView("menu"), 200);
  }

  function toggleBlock() {
    if (
      !blocked &&
      !window.confirm(
        "Block this account? They won't be able to message or follow you, and you won't see their posts.",
      )
    ) {
      return;
    }
    setError(null);
    const next = !blocked;
    setBlocked(next);
    startTransition(async () => {
      const result = next
        ? await blockUserAction(profileId, path)
        : await unblockUserAction(profileId, path);
      if ("error" in result) {
        setBlocked(!next);
        setError(result.error);
        return;
      }
      close();
    });
  }

  function submitReport(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await reportProfileAction(profileId, formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setView("reported");
      formRef.current?.reset();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="More options"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-text transition-transform duration-150 ease-out active:scale-90"
      >
        <MoreIcon width={16} height={16} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="More options"
          className="fixed inset-0 z-30 flex items-end justify-center"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="animate-enter absolute inset-0 bg-[rgb(var(--shadow-tint)/0.4)] backdrop-blur-sm"
          />
          <div className="animate-enter relative w-full max-w-md rounded-t-2xl border-t border-line bg-surface p-4 pb-8 shadow-[0_-4px_32px_rgb(var(--shadow-tint)/0.2)]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden="true" />

            {view === "menu" && (
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setView("report")}
                  className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-text transition-colors duration-150 ease-out hover:bg-surface-2"
                >
                  Report this account
                </button>
                <button
                  type="button"
                  onClick={toggleBlock}
                  disabled={isPending}
                  className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-danger transition-colors duration-150 ease-out hover:bg-danger/5 disabled:opacity-60"
                >
                  {blocked ? "Unblock this account" : "Block this account"}
                </button>
                {error && <p className="px-3 text-xs text-danger">{error}</p>}
              </div>
            )}

            {view === "report" && (
              <form ref={formRef} action={submitReport} className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-medium text-text">Report this account</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Goes to Asyashare moderators. They aren&apos;t told who reported it.
                  </p>
                </div>

                <fieldset className="flex flex-col gap-1.5">
                  <legend className="sr-only">Reason</legend>
                  {REPORT_REASONS.map((reason, i) => (
                    <label
                      key={reason.value}
                      className={clsx(
                        "flex cursor-pointer gap-2.5 rounded-lg border p-2.5",
                        reason.urgent ? "border-warning/40 bg-warning/5" : "border-line",
                      )}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={reason.value}
                        defaultChecked={i === 0}
                        required
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
                      />
                      <span>
                        <span className="block text-sm text-text">{reason.label}</span>
                        <span className="block text-xs text-muted">{reason.hint}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>

                <textarea
                  name="details"
                  placeholder="Anything else the moderators should know? (optional)"
                  className="min-h-16 resize-y rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
                />

                {error && <p className="text-xs text-danger">{error}</p>}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-danger px-3.5 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {isPending ? "Sending…" : "Send report"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("menu")}
                    className="rounded-lg border border-line px-3.5 py-2 text-sm text-muted"
                  >
                    Back
                  </button>
                </div>
              </form>
            )}

            {view === "reported" && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-text">
                  Thanks — this has gone to the moderators.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="self-start rounded-lg border border-line px-3.5 py-2 text-sm text-muted"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
