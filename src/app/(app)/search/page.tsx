import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { getFeedCases, getActiveDiscussions, type FeedCase } from "@/lib/cases";
import { searchProfiles, type PersonResult } from "@/lib/profile";
import { getTrendingTopics } from "@/lib/home";
import { CASE_TYPES, caseTypeMeta } from "@/lib/case-types";
import { SPECIALTIES } from "@/lib/specialties";
import { CaseCard } from "@/components/case-card";
import { Avatar } from "@/components/avatar";
import { CompassIcon, ReelIcon, TrendingUpIcon, UsersIcon } from "@/components/icons";

type SearchParams = {
  q?: string;
  specialty?: string;
  type?: string;
  tag?: string;
  cat?: string;
};

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "cases", label: "Cases" },
  { key: "questions", label: "Questions" },
  { key: "discussions", label: "Discussions" },
  { key: "people", label: "People" },
] as const;
type Category = (typeof CATEGORIES)[number]["key"];

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
 *
 * Categories (IA redesign) are entry points onto data that already exists
 * rather than a new content model: Questions is a shortcut onto the existing
 * type filter (case_type = what_would_you_do), Discussions reuses
 * getActiveDiscussions (cases sorted by comment count, src/lib/cases.ts),
 * People is the one genuinely new query (searchProfiles, src/lib/profile.ts).
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q, specialty, type, tag, cat: rawCat } = await searchParams;
  const query = q?.trim().toLowerCase() ?? "";
  const specialtyFilter = specialty?.trim() ?? "";
  const tagFilter = tag?.trim().toLowerCase().replace(/^#/, "") ?? "";
  const cat: Category = CATEGORIES.some((c) => c.key === rawCat)
    ? (rawCat as Category)
    : "all";
  const typeFilter =
    cat === "questions" ? "what_would_you_do" : (type?.trim() ?? "");

  const supabase = await createClient();
  const user = await getViewer();

  const [allCases, topics] = await Promise.all([
    cat === "people" ? Promise.resolve([]) : getFeedCases(supabase, user?.id ?? null),
    getTrendingTopics(supabase, user?.id ?? null, 6),
  ]);

  // Built from what's actually posted rather than a hardcoded list, so the
  // dropdown can't offer a specialty with nothing behind it.
  const specialties = [
    ...new Set(allCases.map((c) => c.specialty).filter(Boolean)),
  ].sort() as string[];

  const hasFilter =
    Boolean(query || specialtyFilter || typeFilter || tagFilter) ||
    cat === "questions" ||
    cat === "discussions" ||
    cat === "people";

  function matchesQuery(c: FeedCase) {
    if (!query) return true;
    const haystack = [c.title, c.short_caption, c.specialty ?? "", ...c.tags]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  }

  let results: FeedCase[] = [];
  let people: PersonResult[] = [];

  if (cat === "discussions") {
    results = (await getActiveDiscussions(supabase, user?.id ?? null, 20)).filter(
      matchesQuery,
    );
  } else if (cat === "people") {
    people = await searchProfiles(supabase, query, 30);
  } else {
    results = hasFilter
      ? allCases.filter((c) => {
          if (specialtyFilter && c.specialty !== specialtyFilter) return false;
          if (typeFilter && (c.case_type ?? "clinical_case") !== typeFilter) {
            return false;
          }
          if (tagFilter && !c.tags.some((t) => t.toLowerCase() === tagFilter)) {
            return false;
          }
          return matchesQuery(c);
        })
      : [];
    // "All" surfaces a few matching people alongside cases rather than
    // requiring a separate trip to the People tab for the same query.
    if (cat === "all" && query) {
      people = await searchProfiles(supabase, query, 3);
    }
  }

  const activeCount = [specialtyFilter, typeFilter, tagFilter].filter(
    Boolean,
  ).length;

  // Preserves every other active filter, only ever touches ?specialty= —
  // clicking the already-active pill clears it instead of re-submitting it.
  const specialtyHref = (value: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (value) params.set("specialty", value);
    if (typeFilter && cat !== "questions") params.set("type", typeFilter);
    if (tagFilter) params.set("tag", tagFilter);
    if (cat !== "all") params.set("cat", cat);
    const qs = params.toString();
    return qs ? `/search?${qs}` : "/search";
  };

  // Switching categories keeps the free-text query but drops the
  // case-specific filters (specialty/type/tag) — they don't apply the same
  // way to Discussions or People, so carrying them across would silently
  // narrow a tab the reader didn't ask to narrow.
  const catHref = (key: Category) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (key !== "all") params.set("cat", key);
    const qs = params.toString();
    return qs ? `/search?${qs}` : "/search";
  };

  const resultCount = cat === "people" ? people.length : results.length;
  const resultNoun = cat === "people" ? "clinician" : "case";

  return (
    <div>
      {/* This is the bottom nav's Discover slot (see bottom-nav.tsx) — same
          route as before (/search), so every existing internal link
          (trending pills, specialty pills, filter chips) keeps working
          unchanged. Only the on-screen framing changed. */}
      <div className="flex items-center justify-between px-4 pt-4">
        <h1 className="font-headline text-xl text-text">Discover</h1>
        <Link
          href="/reel"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-accent"
        >
          <ReelIcon width={14} height={14} strokeWidth={2} />
          Reel
        </Link>
      </div>

      {/* A GET form, so every search is a shareable URL and the results stay
          server-rendered. */}
      <form action="/search" className="flex flex-col gap-2.5 px-4 py-4">
        <input type="hidden" name="cat" value={cat} />
        {/* Same standing AI-hue rim as <AIButton>/the compose nav button —
            .ai-glow, globals.css — so search reads as part of the same
            visual language rather than a plain bordered field. */}
        <div className="ai-glow ai-glow-round w-full">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search cases, medications, conditions or clinicians…"
            autoFocus
            className="w-full rounded-full bg-surface px-4 py-2.5 text-text placeholder:text-muted focus:outline-none"
          />
        </div>

        {cat !== "people" && cat !== "discussions" && (
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

            {cat !== "questions" && (
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
            )}

            <input
              type="text"
              name="tag"
              defaultValue={tagFilter}
              placeholder="#tag"
              aria-label="Tag"
              className="min-w-0 flex-1 rounded-full border border-line bg-surface px-3.5 py-2 font-label text-xs text-text placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>
        )}

        <button
          type="submit"
          className="shrink-0 self-start rounded-full bg-accent px-4 py-2 font-label text-xs text-white transition-transform duration-150 ease-out active:scale-95"
        >
          Search
        </button>
      </form>

      {/* Category tabs — All / Cases / Questions / Discussions / People. */}
      <div className="no-scrollbar overflow-x-auto px-4 pb-3">
        <div className="flex w-max gap-2">
          {CATEGORIES.map((c) => (
            <Link
              key={c.key}
              href={catHref(c.key)}
              aria-pressed={cat === c.key}
              className={
                cat === c.key
                  ? "shrink-0 whitespace-nowrap rounded-full border border-accent bg-accent px-3.5 py-1.5 font-label text-xs text-white transition-transform duration-150 ease-out active:scale-95"
                  : "shrink-0 whitespace-nowrap rounded-full border border-line bg-surface px-3.5 py-1.5 font-label text-xs text-text transition-colors duration-150 ease-out hover:border-accent/40 hover:text-accent active:scale-95"
              }
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Landing state (no filter yet, All tab): a taste of what's active
          before the reader types anything — a real, small "here's what's
          happening" moment instead of a blank search box. */}
      {!hasFilter && cat === "all" && topics.length > 0 && (
        <div className="px-4 pb-3">
          <p className="mb-2 flex items-center gap-1.5 font-label text-xs uppercase tracking-wide text-muted">
            <TrendingUpIcon width={13} height={13} strokeWidth={2.25} />
            Trending this week
          </p>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <Link
                key={topic.id}
                href={`/search?tag=${encodeURIComponent(topic.name)}`}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-text transition-colors duration-150 ease-out hover:border-accent/40 hover:text-accent active:scale-95"
              >
                {topic.name}
                <span className="font-label text-xs text-muted">{topic.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {cat !== "people" && cat !== "discussions" && (
        <>
          {/* Curated discipline shortcuts — separate from the <select>
              above, which only ever lists specialties that already have
              posts behind them. These jump straight to a discipline even
              before anyone has posted in it yet (see src/lib/specialties.ts). */}
          <div className="px-4 pb-3">
            {!hasFilter && (
              <p className="mb-2 font-label text-xs uppercase tracking-wide text-muted">
                Browse by specialty
              </p>
            )}
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
        </>
      )}

      {hasFilter && (
        <p className="px-4 pb-3 text-xs text-muted">
          {resultCount} {resultCount === 1 ? resultNoun : `${resultNoun}s`}
          {activeCount > 0 && cat !== "people" && (
            <>
              {" · "}
              {[
                specialtyFilter,
                typeFilter && cat !== "questions" ? caseTypeMeta(typeFilter).label : "",
                tagFilter ? `#${tagFilter}` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </>
          )}
        </p>
      )}

      {/* "All" preview of matching people, above the case results — only
          when it's not competing with the People tab's own full list. */}
      {cat === "all" && query && people.length > 0 && (
        <div className="border-b border-line px-4 pb-3">
          <p className="mb-2 flex items-center gap-1.5 font-label text-xs uppercase tracking-wide text-muted">
            <UsersIcon width={13} height={13} strokeWidth={2.25} />
            People
          </p>
          <div className="flex flex-col gap-2">
            {people.map((p) => (
              <Link
                key={p.id}
                href={`/u/${p.handle}`}
                className="flex items-center gap-3 transition-colors duration-150 ease-out hover:text-accent"
              >
                <Avatar avatarUrl={p.avatar_url} name={p.full_name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">
                    {p.full_name ?? "Unknown clinician"}
                    {p.verified && <span className="ml-1 text-positive">✓</span>}
                  </p>
                  <p className="truncate font-label text-xs text-muted">
                    {[p.role, p.specialty].filter(Boolean).join(" · ") || `@${p.handle}`}
                  </p>
                </div>
              </Link>
            ))}
            <Link
              href={catHref("people")}
              className="text-xs font-medium text-accent hover:underline"
            >
              See all people →
            </Link>
          </div>
        </div>
      )}

      {cat === "people" ? (
        !hasFilter || !query ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            Search by name, handle or specialty to find clinicians.
          </p>
        ) : people.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            Nothing matches that search.
          </p>
        ) : (
          <div className="flex flex-col">
            {people.map((p) => (
              <Link
                key={p.id}
                href={`/u/${p.handle}`}
                className="flex items-center gap-3 border-t border-line px-4 py-3 first:border-t-0 transition-colors duration-150 ease-out hover:bg-surface-2"
              >
                <Avatar avatarUrl={p.avatar_url} name={p.full_name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">
                    {p.full_name ?? "Unknown clinician"}
                    {p.verified && <span className="ml-1 text-positive">✓</span>}
                  </p>
                  <p className="truncate font-label text-xs text-muted">
                    {[p.role, p.specialty].filter(Boolean).join(" · ") || `@${p.handle}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : !hasFilter ? (
        <p className="px-4 py-10 text-center text-sm text-muted">
          Search by title, tag or specialty — or narrow by specialty, post type
          and tag without typing anything.
        </p>
      ) : results.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted">
          {cat === "discussions"
            ? "Nothing being discussed yet."
            : "Nothing matches those filters."}
        </p>
      ) : (
        results.map((c) => (
          <CaseCard key={c.id} feedCase={c} path="/search" viewerId={user?.id ?? null} />
        ))
      )}
    </div>
  );
}
