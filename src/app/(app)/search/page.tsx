import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { getFeedCases } from "@/lib/cases";
import { CaseCard } from "@/components/case-card";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim().toLowerCase() ?? "";

  const supabase = await createClient();
  const user = await getViewer();

  const results = query
    ? (await getFeedCases(supabase, user?.id ?? null)).filter((c) => {
        const haystack = [
          c.title,
          c.short_caption,
          c.specialty ?? "",
          ...c.tags,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
    : [];

  return (
    <div>
      <form action="/search" className="px-4 py-4">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search cases, tags, specialties…"
          autoFocus
          className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </form>

      {!query ? (
        <p className="px-4 py-10 text-center text-sm text-muted">
          Search by title, tag, or specialty.
        </p>
      ) : results.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted">
          No cases match &quot;{q}&quot;.
        </p>
      ) : (
        results.map((c) => <CaseCard key={c.id} feedCase={c} path="/search" />)
      )}
    </div>
  );
}
