import Link from "next/link";
import type { FeedCase } from "@/lib/cases";

/**
 * Real, currently-discussed cases — not a fabricated events calendar.
 * MEDLNK has no events feature; this fills the same "what's happening right
 * now" role in the right rail with data that actually exists.
 */
export function ActiveDiscussions({ cases }: { cases: FeedCase[] }) {
  if (cases.length === 0) return null;

  return (
    <section className="mx-4 mt-4 rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-slate-900/[0.03]">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="flex size-6 items-center justify-center rounded-full bg-accent-soft text-xs"
        >
          💬
        </span>
        <p className="font-label text-xs uppercase tracking-wide text-muted">
          Active discussions
        </p>
      </div>
      <ul className="mt-2.5 flex flex-col divide-y divide-line">
        {cases.map((c) => (
          <li key={c.id}>
            <Link
              href={c.case_number ? `/case/${c.case_number}` : "#"}
              className="flex items-center justify-between gap-3 py-2.5 transition-colors duration-150 ease-out hover:text-accent"
            >
              <span className="min-w-0 truncate text-sm text-text">
                {c.title}
              </span>
              <span className="shrink-0 font-label text-xs text-muted">
                {c.counts.comments} {c.counts.comments === 1 ? "reply" : "replies"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
