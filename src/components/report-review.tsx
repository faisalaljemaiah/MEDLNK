"use client";

import { useState, useTransition } from "react";
import { resolveReportAction } from "@/app/actions/reports";

const DECISIONS = [
  { value: "approved", label: "Keep content", className: "border-positive/50 text-positive" },
  { value: "removed", label: "Remove content", className: "border-danger/50 text-danger" },
  { value: "escalated", label: "Escalate", className: "border-accent-2/50 text-accent-2" },
  { value: "reviewed", label: "No action", className: "border-line text-muted" },
] as const;

export function ReportReview({
  reportId,
  viewerHandle,
}: {
  reportId: string;
  /** So the action can also revalidate `/u/[handle]` when it's rendering
   *  the admin dashboard for the caller's own profile. */
  viewerHandle?: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function decide(decision: string, form: HTMLFormElement) {
    setError(null);
    const formData = new FormData(form);
    formData.set("decision", decision);
    if (viewerHandle) formData.set("viewerHandle", viewerHandle);
    startTransition(async () => {
      const result = await resolveReportAction(reportId, formData);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <form
      className="mt-3 flex flex-col gap-2 border-t border-line pt-3"
      onSubmit={(e) => e.preventDefault()}
    >
      <input
        type="text"
        name="note"
        placeholder="Note for the audit log (optional)"
        className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <div className="flex flex-wrap gap-2">
        {DECISIONS.map((d) => (
          <button
            key={d.value}
            type="button"
            disabled={isPending}
            onClick={(e) => decide(d.value, e.currentTarget.form!)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-60 ${d.className}`}
          >
            {d.label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
