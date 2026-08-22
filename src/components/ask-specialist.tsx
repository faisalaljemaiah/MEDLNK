"use client";

import { useRef, useState, useTransition } from "react";
import { askSpecialistAction } from "@/app/actions/specialists";

/**
 * Behind a quiet trigger, like reporting: asking a specialty to look at a case
 * is a real request on other clinicians' time, so it shouldn't be the most
 * prominent thing on the page.
 */
export function AskSpecialist({
  caseId,
  path,
  defaultSpecialty,
}: {
  caseId: string;
  path: string;
  /** The case's own specialty, as the obvious first suggestion. */
  defaultSpecialty: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const acknowledgeRef = useRef<HTMLInputElement>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await askSpecialistAction(caseId, path, formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      if ("warning" in result) {
        setWarning(result.warning);
        return;
      }
      setWarning(null);
      setOpen(false);
      if (acknowledgeRef.current) acknowledgeRef.current.value = "false";
      formRef.current?.reset();
    });
  }

  function askAnyway() {
    if (acknowledgeRef.current) acknowledgeRef.current.value = "true";
    setWarning(null);
    formRef.current?.requestSubmit();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-line px-3.5 py-1.5 font-label text-xs text-muted transition-transform duration-150 ease-out active:scale-95 hover:text-text"
      >
        Ask a specialist
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="flex w-full flex-col gap-3 rounded-xl border border-line bg-surface p-4"
    >
      <input
        type="hidden"
        name="acknowledge_warning"
        ref={acknowledgeRef}
        defaultValue="false"
      />

      <div>
        <p className="text-sm font-medium text-text">Ask a specialist</p>
        <p className="mt-0.5 text-xs text-muted">
          Everyone whose profile lists that specialty is told a question is
          waiting. One ask per specialty per case.
        </p>
      </div>

      <input
        type="text"
        name="specialty"
        required
        defaultValue={defaultSpecialty ?? ""}
        placeholder="Specialty — e.g. Cardiology"
        className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />

      <textarea
        name="question"
        required
        placeholder="What specifically do you want their view on? No patient identifiers."
        className="min-h-20 resize-y rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />

      {error && <p className="text-xs text-danger">{error}</p>}

      {warning && (
        <div className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
          <p className="text-sm text-warning">⚠ {warning}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={askAnyway}
              className="rounded-lg border border-warning/50 px-3.5 py-2 text-sm text-warning"
            >
              Ask anyway
            </button>
            <button
              type="button"
              onClick={() => setWarning(null)}
              className="rounded-lg border border-line px-3.5 py-2 text-sm text-muted"
            >
              Let me edit it
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-on-accent disabled:opacity-60"
        >
          {isPending ? "Asking…" : "Send to specialty"}
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
