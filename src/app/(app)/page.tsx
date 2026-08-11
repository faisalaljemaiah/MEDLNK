import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { getFeedCases, getFeedCasesByType, getFollowedCases } from "@/lib/cases";
import { feedFilter } from "@/lib/feed-filters";
import { getLiveSafetyAlerts } from "@/lib/safety-alerts";
import { CaseCard } from "@/components/case-card";
import { FeedFilterBar } from "@/components/feed-filter-bar";
import { SafetyAlertBanner } from "@/components/safety-alert-banner";
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
  const [cases, alerts] = await Promise.all([
    filter.caseTypes
      ? getFeedCasesByType(supabase, viewerId, filter.caseTypes)
      : filter.key === "following" && viewerId
        ? getFollowedCases(supabase, viewerId)
        : getFeedCases(supabase, viewerId),
    getLiveSafetyAlerts(supabase, viewerId),
  ]);

  // The chip row is part of the feed's own URL, so it carries through to the
  // cards: a reaction from a filtered feed revalidates the filtered feed.
  const path = filter.key === "all" ? "/" : `/?filter=${filter.key}`;

  return (
    <div>
      {/* Above the chip row: an alert the reader hasn't acknowledged should not
          be filtered away by whichever chip they last tapped. */}
      <SafetyAlertBanner alerts={alerts} />

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
