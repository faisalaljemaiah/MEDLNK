"use client";

import { useState } from "react";
import { ReactionBar } from "@/components/reaction-bar";
import { DiveDeepSheet } from "@/components/dive-deep-sheet";
import type { FeedCase } from "@/lib/cases";

export function CaseCard({ feedCase, path }: { feedCase: FeedCase; path: string }) {
  const [open, setOpen] = useState(false);

  return (
    <article
      id={`case-${feedCase.id}`}
      className="border-b border-line px-4 py-5"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 font-label text-xs text-muted">
          {(feedCase.author?.full_name ?? "?").charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text">
            {feedCase.author?.full_name ?? "Unknown clinician"}
            {feedCase.author?.verified && (
              <span className="ml-1 text-positive">✓</span>
            )}
          </p>
          <p className="font-label text-xs text-muted">
            @{feedCase.author?.handle ?? "unknown"} · {feedCase.author?.role}
          </p>
        </div>
        <p className="ml-auto shrink-0 font-label text-xs text-muted">
          {feedCase.case_number}
        </p>
      </div>

      <h3 className="mt-3 font-headline text-lg text-text">
        {feedCase.title}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        {feedCase.short_caption}
      </p>

      {feedCase.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {feedCase.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-line px-2.5 py-0.5 font-label text-xs text-muted"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-sm font-medium text-accent hover:underline"
      >
        Let&apos;s dive deep →
      </button>

      <div className="mt-4">
        <ReactionBar
          caseId={feedCase.id}
          counts={feedCase.counts}
          viewerReactions={feedCase.viewerReactions}
          path={path}
          onOpenComments={() => setOpen(true)}
        />
      </div>

      {open && <DiveDeepSheet feedCase={feedCase} onClose={() => setOpen(false)} />}
    </article>
  );
}
