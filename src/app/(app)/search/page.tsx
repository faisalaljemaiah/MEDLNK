import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { getFeedCases } from "@/lib/cases";
import { CASE_TYPES, caseTypeMeta } from "@/lib/case-types";
import { CaseCard } from "@/components/case-card";

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

  const allCases = await getFeedCases(supabase, user?.id ?? null);

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

  return (
    <div>
      {/* A GET form, so every search is a shareable URL and the results stay
          server-rendered. */}
      <form action="/search" className="flex flex-col gap-2.5 px-4 py-4">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search cases, tags, specialties…"
          autoFocus
          className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />

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
        results.map((c) => <CaseCard key={c.id} feedCase={c} path="/search" />)
      )}
    </div>
  );
}
