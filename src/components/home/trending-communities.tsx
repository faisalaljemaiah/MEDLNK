import Link from "next/link";
import type { TrendingCommunity } from "@/lib/home";

/**
 * MEDLNK has no dedicated communities table — each "community" here is a
 * specialty with real recent case activity (see getTrendingCommunities),
 * linked into the existing /search?specialty= filter rather than a new page.
 */
export function TrendingCommunities({
  communities,
}: {
  communities: TrendingCommunity[];
}) {
  if (communities.length === 0) return null;

  return (
    <section className="mx-4 mt-4 rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-slate-900/[0.03]">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="flex size-6 items-center justify-center rounded-full bg-accent-soft text-xs"
        >
          🌐
        </span>
        <p className="font-label text-xs uppercase tracking-wide text-muted">
          Trending communities
        </p>
      </div>
      <ul className="mt-2.5 flex flex-col divide-y divide-line">
        {communities.map((c) => (
          <li key={c.specialty}>
            <Link
              href={`/search?specialty=${encodeURIComponent(c.specialty)}`}
              className="flex items-center justify-between gap-3 py-2.5 transition-colors duration-150 ease-out hover:text-accent"
            >
              <span className="min-w-0 truncate text-sm font-medium text-text">
                {c.specialty}
              </span>
              <span className="shrink-0 font-label text-xs text-muted">
                {c.memberCount} {c.memberCount === 1 ? "clinician" : "clinicians"}
                {" · "}
                {c.caseCount} {c.caseCount === 1 ? "case" : "cases"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
