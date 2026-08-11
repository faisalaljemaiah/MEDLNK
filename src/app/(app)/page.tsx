import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { getFeedCases, getFeedCasesByType, getFollowedCases } from "@/lib/cases";
import { feedFilter } from "@/lib/feed-filters";
import { CaseCard } from "@/components/case-card";
import { FeedFilterBar } from "@/components/feed-filter-bar";
import { UnavailableNotice } from "@/components/unavailable-notice";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const [{ filter: rawFilter }, supabase, user] = await Promise.all([
    searchParams,
    createClient(),
    getViewer(),
  ]);

  const filter = feedFilter(rawFilter, Boolean(user));
  const viewerId = user?.id ?? null;

  // null from getFollowedCases means the read failed, not that the viewer
  // follows nothing — those get different screens.
  const cases = filter.caseTypes
    ? await getFeedCasesByType(supabase, viewerId, filter.caseTypes)
    : filter.key === "following" && viewerId
      ? await getFollowedCases(supabase, viewerId)
      : await getFeedCases(supabase, viewerId);

  // The chip row is part of the feed's own URL, so it carries through to the
  // cards: a reaction from a filtered feed revalidates the filtered feed.
  const path = filter.key === "all" ? "/" : `/?filter=${filter.key}`;

  return (
    <div>
      <FeedFilterBar active={filter.key} hasViewer={Boolean(user)} />

      {cases === null ? (
        <UnavailableNotice feature="Following cases" />
      ) : cases.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted">
          {filter.empty}
        </p>
      ) : (
        cases.map((c) => <CaseCard key={c.id} feedCase={c} path={path} />)
      )}
    </div>
  );
}
