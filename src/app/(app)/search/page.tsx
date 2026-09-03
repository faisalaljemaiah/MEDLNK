import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { getFeedCases } from "@/lib/cases";
import { getDiscoverCommunities } from "@/lib/communities";
import { CASE_TYPES, caseTypeMeta } from "@/lib/case-types";
import { SPECIALTIES } from "@/lib/specialties";
import { CaseCard } from "@/components/case-card";
import { CommunityBubbles } from "@/components/community-bubbles";
import { CompassIcon, ReelIcon } from "@/components/icons";

type SearchParams = {
  q?: string;
  specialty?: string;
  type?: string;
  tag?: string;
};

/**
 * Filters are applied in JS over the one feed query, same as the free-text
 * match already was. That keeps search at a single round trip and keeps it
 * working whether or not the case_type column exists yet on the hosted
 * project — a column predicate would make PostgREST reject the whole request.
 *
 * This is the same tradeoff getFeedCases makes and it expires at the same
 * point: when "fetch every case" stops being viable, this becomes a Postgres
 * text search with real predicates, and the filter list below is the spec for
 * what those predicates need to cover.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q, specialty, type, tag } = await searchParams;
  const query = q?.trim().toLowerCase() ?? "";
  const specialtyFilter = specialty?.trim() ?? "";
  const typeFilter = type?.trim() ?? "";
  const tagFilter = tag?.trim().toLowerCase().replace(/^#/, "") ?? "";

  const hasFilter = Boolean(
    query || specialtyFilter || typeFilter || tagFilter,
  );

  const supabase = await createClient();
  const user = await getViewer();

  const [allCases, communities] = await Promise.all([
    getFeedCases(supabase, user?.id ?? null),
    getDiscoverCommunities(supabase, user?.id ?? null),
  ]);

  // Built from what's actually posted rather than a hardcoded list, so the
  // dropdown can't offer a specialty with nothing behind it.
  const specialties = [
    ...new Set(allCases.map((c) => c.specialty).filter(Boolean)),
  ].sort() as string[];

  const results = hasFilter
    ? allCases.filter((c) => {
        if (specialtyFilter && c.specialty !== specialtyFilter) return false;
        if (typeFilter && (c.case_type ?? "clinical_case") !== typeFilter) {
          return false;
        }
        if (tagFilter && !c.tags.some((t) => t.toLowerCase() === tagFilter)) {
          return false;
        }
        if (!query) return true;

        const haystack = [c.title, c.short_caption, c.specialty ?? "", ...c.tags]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
    : [];

  const activeCount = [specialtyFilter, typeFilter, tagFilter].filter(
    Boolean,
  ).length;

  // Preserves every other active filter, only ever touches ?specialty= —
  // clicking the already-active pill clears it instead of re-submitting it.
  const specialtyHref = (value: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (value) params.set("specialty", value);
    if (typeFilter) params.set("type", typeFilter);
    if (tagFilter) params.set("tag", tagFilter);
    const qs = params.toString();
    return qs ? `/search?${qs}` : "/search";
  };

  return (
    <div>
      {/* This is the bottom nav's Discover slot (see bottom-nav.tsx) — same
          route as before (/search), so every existing internal link
          (trending pills, specialty pills, filter chips) keeps working
          unchanged. Only the on-screen framing changed. */}
      <div className="flex items-center justify-between px-4 pt-4">
        <h1 className="font-headline text-xl text-text">Discover</h1>
        <Link
          href="/spool"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-accent"
        >
          <ReelIcon width={14} height={14} strokeWidth={2} />
          Speel
        </Link>
      </div>

      <CommunityBubbles communities={communities} path="/search" />

      {/* A GET form, so every search is a shareable URL and the results stay
          server-rendered. */}
      <form action="/search" className="flex flex-col gap-2.5 px-4 py-4">
        {/* Same rim mechanic as <AIButton>/the compose nav button
            (.ai-glow, globals.css), but in Asyashare's own Caribbean green
            and white (.ai-glow-brand) rather than the AI-hue sweep —
            search isn't an AI feature, and every search bar in the app
            (this one, the admin dashboard's) now shares this same look. */}
        <div className="ai-glow ai-glow-round ai-glow-brand w-full">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search cases, tags, specialties…"
            autoFocus
            className="w-full rounded-full bg-surface px-4 py-2.5 text-text placeholder:text-muted focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            name="specialty"
            defaultValue={specialtyFilter}
            aria-label="Specialty"
            className="min-w-0 flex-1 rounded-full border border-line bg-surface px-3.5 py-2 font-label text-xs text-text focus:border-accent focus:outline-none"
          >
            <option value="">Any specialty</option>
            {specialties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            name="type"
            defaultValue={typeFilter}
            aria-label="Post type"
            className="min-w-0 flex-1 rounded-full border border-line bg-surface px-3.5 py-2 font-label text-xs text-text focus:border-accent focus:outline-none"
          >
            <option value="">Any type</option>
            {CASE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            name="tag"
            defaultValue={tagFilter}
            placeholder="#tag"
            aria-label="Tag"
            className="min-w-0 flex-1 rounded-full border border-line bg-surface px-3.5 py-2 font-label text-xs text-text placeholder:text-muted focus:border-accent focus:outline-none"
          />

          <button
            type="submit"
            className="shrink-0 rounded-full bg-accent px-4 py-2 font-label text-xs text-white transition-transform duration-150 ease-out active:scale-95"
          >
            Search
          </button>
        </div>
      </form>

      {/* Curated discipline shortcuts — separate from the <select> above,
          which only ever lists specialties that already have posts behind
          them. These jump straight to a discipline even before anyone has
          posted in it yet (see src/lib/specialties.ts). */}
      <div className="px-4 pb-3">
        <div className="flex flex-wrap gap-2">
          {SPECIALTIES.map((s) => {
            const active = specialtyFilter === s;
            return (
              <Link
                key={s}
                href={specialtyHref(active ? "" : s)}
                aria-pressed={active}
                className={
                  active
                    ? "whitespace-nowrap rounded-full border border-accent bg-accent px-3 py-1.5 font-label text-xs text-white transition-transform duration-150 ease-out active:scale-95"
                    : "whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 font-label text-xs text-text transition-colors duration-150 ease-out hover:border-accent/40 hover:text-accent active:scale-95"
                }
              >
                {s}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="px-4 pb-3">
        <Link
          href="/exchange"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
        >
          <CompassIcon width={13} height={13} strokeWidth={2.25} />
          Browse the Global Case Exchange →
        </Link>
      </div>

      {hasFilter && (
        <p className="px-4 pb-3 text-xs text-muted">
          {results.length} {results.length === 1 ? "case" : "cases"}
          {activeCount > 0 && (
            <>
              {" · "}
              {[
                specialtyFilter,
                typeFilter ? caseTypeMeta(typeFilter).label : "",
                tagFilter ? `#${tagFilter}` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </>
          )}
        </p>
      )}

      {!hasFilter ? (
        <p className="px-4 py-10 text-center text-sm text-muted">
          Search by title, tag or specialty — or narrow by specialty, post type
          and tag without typing anything.
        </p>
      ) : results.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted">
          Nothing matches those filters.
        </p>
      ) : (
        results.map((c) => (
          <CaseCard key={c.id} feedCase={c} path="/search" viewerId={user?.id ?? null} />
        ))
      )}
    </div>
  );
}
