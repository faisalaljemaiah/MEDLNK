import Link from "next/link";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { getTrendingCommunities, getMyCommunities } from "@/lib/home";
import { UsersIcon } from "@/components/icons";

type CommunitiesSearchParams = { tab?: string };

/**
 * MEDLNK has no dedicated communities table (see trending-communities.tsx's
 * own comment) — this page is a proper front-end over the same
 * specialty-derived grouping that already powers the Home widget, not a
 * new entity. "Join" isn't a real action here; clicking a community goes
 * straight to /search?specialty=, the same destination the Home widget's
 * links already use.
 */
export default async function CommunitiesPage({
  searchParams,
}: {
  searchParams: Promise<CommunitiesSearchParams>;
}) {
  const { tab: rawTab } = await searchParams;
  const supabase = await createClient();
  const user = await getViewer();
  const tab = rawTab === "mine" && user ? "mine" : "all";

  const [all, mine] = await Promise.all([
    getTrendingCommunities(supabase, user?.id ?? null, 500),
    user ? getMyCommunities(supabase, user.id) : Promise.resolve([]),
  ]);

  const list = tab === "mine" ? mine : all;

  return (
    <div>
      <h1 className="px-4 pt-4 font-headline text-xl text-text">Communities</h1>
      <p className="px-4 pt-1 text-sm text-muted">
        Every specialty with real activity on MEDLNK — clicking one opens
        what&apos;s actually been posted there.
      </p>

      {user && (
        <div className="mt-4 flex border-b border-line">
          <Link
            href="/communities?tab=mine"
            className={clsx(
              "flex-1 border-b-2 py-2.5 text-center text-sm font-medium transition-colors duration-150",
              tab === "mine"
                ? "border-text text-text"
                : "border-transparent text-muted hover:text-text",
            )}
          >
            My Communities
          </Link>
          <Link
            href="/communities"
            className={clsx(
              "flex-1 border-b-2 py-2.5 text-center text-sm font-medium transition-colors duration-150",
              tab === "all"
                ? "border-text text-text"
                : "border-transparent text-muted hover:text-text",
            )}
          >
            All Communities
          </Link>
        </div>
      )}

      {list.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted">
          {tab === "mine"
            ? "Post a case, or set your specialty in your profile, to see your communities here."
            : "No specialty has real activity yet."}
        </p>
      ) : (
        <div className={clsx("flex flex-col", !user && "mt-4")}>
          {list.map((c) => (
            <Link
              key={c.specialty}
              href={`/search?specialty=${encodeURIComponent(c.specialty)}`}
              className="flex items-center justify-between gap-3 border-t border-line px-4 py-3.5 first:border-t-0 transition-colors duration-150 ease-out hover:bg-surface-2"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <UsersIcon width={16} height={16} strokeWidth={2} />
                </span>
                <p className="truncate text-sm font-medium text-text">
                  {c.specialty}
                </p>
              </div>
              <p className="shrink-0 font-label text-xs text-muted">
                {c.memberCount} {c.memberCount === 1 ? "clinician" : "clinicians"}
                {" · "}
                {c.caseCount} {c.caseCount === 1 ? "case" : "cases"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
