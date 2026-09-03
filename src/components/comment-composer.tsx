"use client";

import { useRef, useState, useTransition } from "react";
import { clsx } from "clsx";
import { addCommentAction } from "@/app/actions/comments";
import { COMMENT_LABELS } from "@/lib/comment-labels";
import type { CommentLabel } from "@/lib/database.types";

/**
 * Label first, then the reply.
 *
 * Choosing "I'd do it differently" before typing changes what gets typed —
 * it asks the commenter to decide what kind of contribution they're making,
 * which is the whole point of §25. The label is optional: an unlabelled reply
 * is still a reply, and forcing a taxonomy on someone with a quick question
 * would just cost the question.
 */
export function CommentComposer({
  caseId,
  path,
}: {
  caseId: string;
  path: string;
}) {
  const [label, setLabel] = useState<CommentLabel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const acknowledgeRef = useRef<HTMLInputElement>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addCommentAction(caseId, path, formData);

      if ("error" in result) {
        setError(result.error);
        return;
      }
      if ("warning" in result) {
        setWarning(result.warning);
        return;
      }

      setWarning(null);
      setLabel(null);
      if (acknowledgeRef.current) acknowledgeRef.current.value = "false";
      formRef.current?.reset();
    });
  }

  function postAnyway() {
    // The acknowledgement rides on the form, so the second submit carries the
    // same body and label the author already wrote.
    if (acknowledgeRef.current) acknowledgeRef.current.value = "true";
    setWarning(null);
    formRef.current?.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="mt-4 flex flex-col gap-3 rounded-xl border border-line bg-surface p-4"
    >
      <input
        type="hidden"
        name="acknowledge_warning"
        ref={acknowledgeRef}
        defaultValue="false"
      />
      <input type="hidden" name="label" value={label ?? ""} />

      <div>
        <p className="font-label text-xs uppercase tracking-wide text-muted">
          What kind of reply is this?
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {COMMENT_LABELS.map((l) => {
            const active = label === l.value;
            return (
              <button
                key={l.value}
                type="button"
                // Second press clears it — the picker is optional, so it needs
                // a way back to "no label" that isn't reloading the page.
                onClick={() => setLabel(active ? null : l.value)}
                aria-pressed={active}
                title={l.hint}
                className={clsx(
                  "rounded-full border px-3 py-1.5 font-label text-xs transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-95",
                  active
                    ? l.badgeClass
                    : "border-line text-muted hover:text-text",
                )}
              >
                {l.label}
              </button>
            );
          })}
        </div>
      </div>

      <textarea
        name="body"
        required
        placeholder="Educational discussion only — no patient identifiers, and nothing patient-specific."
        className="min-h-24 resize-y rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />

      {error && <p className="text-xs text-danger">{error}</p>}

      {warning && (
        <div className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
          <p className="text-sm text-warning">⚠ {warning}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={postAnyway}
              className="rounded-lg border border-warning/50 px-3.5 py-2 text-sm text-warning"
            >
              Post anyway
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

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Educational discussion, never patient-specific advice.
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-transform duration-150 ease-out active:scale-95 disabled:opacity-60"
        >
          {isPending ? "Posting…" : "Reply"}
        </button>
      </div>
    </form>
  );
}
