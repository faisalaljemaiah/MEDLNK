"use client";

import { useEffect, useState } from "react";
import {
  getDiveDeepDataAction,
  type DiveDeepData,
} from "@/app/actions/recap";
import type { FeedCase } from "@/lib/cases";

export function DiveDeepSheet({
  feedCase,
  onClose,
}: {
  feedCase: FeedCase;
  onClose: () => void;
}) {
  const [data, setData] = useState<DiveDeepData | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDiveDeepDataAction(feedCase.id).then((result) => {
      if (!cancelled) setData(result);
    });
    return () => {
      cancelled = true;
    };
  }, [feedCase.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0"
      />
      <div className="relative z-10 flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-y-auto rounded-t-2xl border-t border-line bg-surface px-5 pb-8 pt-3">
        <div className="mx-auto mb-4 h-1.5 w-10 shrink-0 rounded-full bg-line" />

        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-label text-xs uppercase tracking-wide text-muted">
              {feedCase.case_number ?? "CASE"}
              {feedCase.specialty ? ` · ${feedCase.specialty}` : ""}
            </p>
            <h2 className="font-headline text-xl text-text">
              {feedCase.title}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {feedCase.author?.full_name ?? "Unknown clinician"}
              {feedCase.author?.verified && (
                <span className="ml-1 text-positive">✓ verified</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-line px-3 py-1 text-sm text-muted hover:text-text"
          >
            Close
          </button>
        </div>

        <section className="mb-5 rounded-xl border border-accent-2/30 bg-accent-2/10 p-4">
          <p className="font-label text-xs uppercase tracking-wide text-accent-2">
            AI recap
          </p>
          {data === null ? (
            <p className="mt-1 text-sm text-muted">Loading…</p>
          ) : data.recapSummary ? (
            <p className="mt-1 text-sm text-text">{data.recapSummary}</p>
          ) : (
            <p className="mt-1 text-sm text-muted">
              No AI recap yet for this case.
            </p>
          )}
        </section>

        <div className="flex flex-col gap-5">
          <DiveDeepBlock label="Presentation" text={feedCase.full_body.presentation} />
          <DiveDeepBlock label="What was tricky" text={feedCase.full_body.tricky} />
          <div>
            <p className="font-label text-xs uppercase tracking-wide text-muted">
              What we did
            </p>
            <ul className="mt-1.5 flex list-disc flex-col gap-1.5 pl-5 text-sm text-text">
              {feedCase.full_body.actions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          </div>
          <DiveDeepBlock label="The lesson" text={feedCase.full_body.lesson} />
        </div>

        {feedCase.tags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {feedCase.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-line px-2.5 py-1 font-label text-xs text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <section className="mt-6 border-t border-line pt-4">
          <p className="font-label text-xs uppercase tracking-wide text-muted">
            Similar cases
          </p>
          {data === null ? (
            <p className="mt-2 text-sm text-muted">Loading…</p>
          ) : data.similar.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Nothing similar yet — check back as more cases are posted.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {data.similar.map((s) => (
                <li key={s.id} className="text-sm text-accent">
                  {s.case_number ? `${s.case_number} · ` : ""}
                  {s.title}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function DiveDeepBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="font-label text-xs uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-text">{text}</p>
    </div>
  );
}
