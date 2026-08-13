import Link from "next/link";
import { UnavailableNotice } from "@/components/unavailable-notice";
import type { CaseComparisonView, ComparedCase } from "@/lib/comparisons";

/**
 * The two cases a `case_vs_case` post compares (spec §15).
 *
 * The sides are links into the real cases rather than restatements of them, so
 * a reader can go and read either write-up in full and the original authors
 * keep the credit. The discriminator — what actually changes the management —
 * sits under them, because it only means anything once you've seen both.
 */
export function CaseComparison({
  comparison,
}: {
  /** null = the read failed; undefined = this post has no comparison attached. */
  comparison: CaseComparisonView | null | undefined;
}) {
  if (comparison === undefined) return null;

  if (comparison === null) {
    return (
      <section className="mt-5">
        <UnavailableNotice feature="Case vs case" />
      </section>
    );
  }

  return (
    <section className="mt-5">
      <p className="font-label text-xs uppercase tracking-wide text-muted">
        Side by side
      </p>

      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <Side kase={comparison.left} />
        <Side kase={comparison.right} />
      </div>

      <div className="mt-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
        <p className="font-label text-xs uppercase tracking-wide text-accent">
          What changes the management
        </p>
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-text">
          {comparison.discriminator}
        </p>
      </div>
    </section>
  );
}

function Side({ kase }: { kase: ComparedCase | null }) {
  // A side can be absent even though the row exists: the sides are references,
  // and cases' own RLS decides whether this reader may see them. Saying so is
  // better than rendering an empty card that looks like a bug.
  if (!kase) {
    return (
      <div className="rounded-xl border border-line bg-surface-2/50 p-3.5">
        <p className="text-sm text-muted">
          This case is no longer available.
        </p>
      </div>
    );
  }

  return (
    <Link
      href={kase.case_number ? `/case/${kase.case_number}` : "#"}
      className="block rounded-xl border border-line bg-surface p-3.5 transition-transform duration-150 ease-out active:scale-[0.99]"
    >
      <p className="font-label text-xs text-muted">
        {kase.case_number}
        {kase.specialty ? ` · ${kase.specialty}` : ""}
      </p>
      <p className="mt-1 font-headline text-base text-text">{kase.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        {kase.short_caption}
      </p>
    </Link>
  );
}
