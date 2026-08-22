"use client";

import { useRef, useState, useTransition } from "react";
import { publishCaseUpdateAction } from "@/app/actions/interactive";
import type { CaseUpdate } from "@/lib/database.types";

/**
 * Case Evolution: the stages a case moved through, oldest first, with an
 * inline composer for the author to add the next one.
 */
export function CaseTimeline({
  caseId,
  updates,
  isAuthor,
  path,
  presentationLabel = "Initial presentation",
}: {
  caseId: string;
  updates: CaseUpdate[];
  isAuthor: boolean;
  path: string;
  presentationLabel?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [composing, setComposing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await publishCaseUpdateAction(caseId, formData, path);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setComposing(false);
    });
  }

  if (updates.length === 0 && !isAuthor) return null;

  return (
    <section className="mt-6 border-t border-line pt-4">
      <p className="font-label text-xs uppercase tracking-wide text-muted">
        How this case unfolded
      </p>

      <ol className="mt-3 flex flex-col">
        <TimelineRow
          stage={presentationLabel}
          body={null}
          isFirst
          isLast={updates.length === 0}
        />
        {updates.map((update, i) => (
          <TimelineRow
            key={update.id}
            stage={update.stage}
            body={update.body}
            timestamp={update.created_at}
            isLast={i === updates.length - 1}
          />
        ))}
      </ol>

      {isAuthor && (
        <div className="mt-3">
          {composing ? (
            <form
              ref={formRef}
              action={handleSubmit}
              className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3"
            >
              <input
                type="text"
                name="stage"
                placeholder="Stage — e.g. Troponin result, Diagnosis, Outcome"
                required
                className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <textarea
                name="body"
                placeholder="What changed, and what it meant."
                required
                className="min-h-20 resize-y rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-on-accent disabled:opacity-60"
                >
                  {isPending ? "Publishing…" : "Publish update"}
                </button>
                <button
                  type="button"
                  onClick={() => setComposing(false)}
                  className="rounded-lg border border-line px-3.5 py-2 text-sm text-muted"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-muted">
                Everyone following this case will be notified.
              </p>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setComposing(true)}
              className="rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-text hover:border-accent hover:text-accent"
            >
              + Add an update
            </button>
          )}
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </div>
      )}
    </section>
  );
}

function TimelineRow({
  stage,
  body,
  timestamp,
  isFirst,
  isLast,
}: {
  stage: string;
  body: string | null;
  timestamp?: string;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  return (
    <li className="flex gap-3">
      {/* Rail: a dot per stage, joined by a line that stops at the last one. */}
      <div className="flex flex-col items-center">
        <span
          aria-hidden
          className={
            isFirst
              ? "mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-accent"
              : "mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-accent bg-surface"
          }
        />
        {!isLast && <span aria-hidden className="w-px flex-1 bg-line" />}
      </div>

      <div className={isLast ? "pb-0" : "pb-4"}>
        <p className="font-label text-xs uppercase tracking-wide text-text">
          {stage}
        </p>
        {body && (
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text">
            {body}
          </p>
        )}
        {timestamp && (
          <p className="mt-1 font-label text-xs text-muted">
            {new Date(timestamp).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </p>
        )}
      </div>
    </li>
  );
}
