"use client";

import { useRef, useState, useTransition } from "react";
import { answerSpecialistAction } from "@/app/actions/specialists";

/**
 * Shown to anyone; the database decides whether it works.
 *
 * Hiding this form from non-specialists would be a UI hint, not a control —
 * 0012's insert policy is what makes the specialty badge on an answer true, and
 * the error below is what a mismatched profile gets told.
 */
export function SpecialistAnswerForm({
  requestId,
  specialty,
  path,
}: {
  requestId: string;
  specialty: string;
  path: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const acknowledgeRef = useRef<HTMLInputElement>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await answerSpecialistAction(requestId, path, formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      if ("warning" in result) {
        setWarning(result.warning);
        return;
      }
      setWarning(null);
      if (acknowledgeRef.current) acknowledgeRef.current.value = "false";
      formRef.current?.reset();
    });
  }

  function postAnyway() {
    if (acknowledgeRef.current) acknowledgeRef.current.value = "true";
    setWarning(null);
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={submit} className="mt-3 flex flex-col gap-2.5">
      <input
        type="hidden"
        name="acknowledge_warning"
        ref={acknowledgeRef}
        defaultValue="false"
      />

      <textarea
        name="body"
        required
        placeholder={`Answer as ${specialty} — educational discussion, not patient-specific advice.`}
        className="min-h-20 resize-y rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
      />

      {error && <p className="text-xs text-danger">{error}</p>}

      {warning && (
        <div className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3">
          <p className="text-sm text-warning">⚠ {warning}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={postAnyway}
              className="rounded-lg border border-warning/50 px-3 py-1.5 text-sm text-warning"
            >
              Answer anyway
            </button>
            <button
              type="button"
              onClick={() => setWarning(null)}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted"
            >
              Let me edit it
            </button>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-transform duration-150 ease-out active:scale-95 disabled:opacity-60"
      >
        {isPending ? "Sending…" : "Answer"}
      </button>
    </form>
  );
}
