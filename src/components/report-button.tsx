"use client";

import { useRef, useState, useTransition } from "react";
import { clsx } from "clsx";
import { reportCaseAction, reportCommentAction } from "@/app/actions/reports";
import { REPORT_REASONS } from "@/lib/report-reasons";

export type ReportTarget = { kind: "case" | "comment"; id: string };

const NOUN: Record<ReportTarget["kind"], string> = {
  case: "case",
  comment: "reply",
};

/**
 * Reporting lives behind a quiet text link rather than a prominent button: it
 * should be findable on everything without inviting use, and without competing
 * with the reactions that are the normal thing to do here.
 */
export function ReportButton({
  target,
  className,
}: {
  target: ReportTarget;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const noun = NOUN[target.kind];

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result =
        target.kind === "case"
          ? await reportCaseAction(target.id, formData)
          : await reportCommentAction(target.id, formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setDone(true);
      setOpen(false);
      formRef.current?.reset();
    });
  }

  if (done) {
    return (
      <p className="text-xs text-muted">
        Thanks — this has gone to the moderators.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "text-xs text-muted underline-offset-2 hover:text-danger hover:underline"
        }
      >
        Report this {noun}
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4"
    >
      <div>
        <p className="text-sm font-medium text-text">Report this {noun}</p>
        <p className="mt-0.5 text-xs text-muted">
          Goes to Asyashare moderators. The author isn&apos;t told who reported it.
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
          onClick={() => setOpen(false)}
          className="rounded-lg border border-line px-3.5 py-2 text-sm text-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
