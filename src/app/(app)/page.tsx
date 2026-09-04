import { ViewTransition } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer, getViewerProfile } from "@/lib/auth";
import {
  getFeedCases,
  getFeedCasesByType,
  getFollowedCases,
  getCasesByFollowedPeople,
  getTrendingCases,
  getActiveDiscussions,
  getFollowedAuthorIds,
  rankForYou,
  type FeedCase,
} from "@/lib/cases";
import { feedFilter } from "@/lib/feed-filters";
import { getLiveSafetyAlerts } from "@/lib/safety-alerts";
import {
  getTrendingTopics,
  getTrendingCommunities,
  getRecommendedPeople,
} from "@/lib/home";
import { CaseCard } from "@/components/case-card";
import { FeedFilterBar } from "@/components/feed-filter-bar";
import { SafetyAlertBanner } from "@/components/safety-alert-banner";
import { UnavailableNotice } from "@/components/unavailable-notice";
import { TrendingStrip } from "@/components/home/trending-strip";
import { QuickActions } from "@/components/home/quick-actions";
import { HomeFeedTabs, type HomeFeedView } from "@/components/home/feed-tabs";
import { TrendingCommunities } from "@/components/home/trending-communities";
import { ActiveDiscussions } from "@/components/home/active-discussions";
import { RecommendedPeople } from "@/components/home/recommended-people";
import { ProfilePhotoNudge } from "@/components/home/profile-photo-nudge";
import { TargetIcon } from "@/components/icons";
import { t } from "@/lib/i18n";

// Following is the default tab for a signed-in viewer (a layout change, not
// a behavior change to the tabs themselves — /?view=foryou still reaches the
// personalized feed that used to be the default).
function parseView(raw: string | undefined, hasViewer: boolean): HomeFeedView {
  if (raw === "trending") return "trending";
  if (raw === "foryou") return "foryou";
  if (hasViewer) return "following";
  return "foryou";
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; view?: string }>;
}) {
  const [{ filter: rawFilter, view: rawView }, supabase, user, cookieStore] =
    await Promise.all([searchParams, createClient(), getViewer(), cookies()]);

  // A first-time, signed-out visit to the bare domain (someone searching
  // "Asyashare" and clicking through, not a deep link to a specific case)
  // lands on the marketing splash instead of straight into the feed shell.
  // The signed-out feed itself is unchanged and still reachable — /welcome's
  // own "Browse without an account" sets this cookie (browseAsGuestAction,
  // src/app/actions/guest.ts) precisely so this redirect only ever fires
  // once per browser, not on every page after that choice is made.
  if (!user && cookieStore.get("medlnk_guest")?.value !== "1") {
    redirect("/welcome");
  }

  const viewerId = user?.id ?? null;
  const view = parseView(rawView, Boolean(user));
  const filter = feedFilter(rawFilter, Boolean(user));

  // Everything the surrounding sections need, none of it dependent on which
  // feed tab is active, so it all goes out together.
  const [
    alerts,
    profile,
    topics,
    communities,
    discussions,
    people,
    followedAuthorIds,
  ] = await Promise.all([
    getLiveSafetyAlerts(supabase, viewerId),
    user ? getViewerProfile() : Promise.resolve(null),
    getTrendingTopics(supabase, viewerId),
    getTrendingCommunities(supabase, viewerId),
    getActiveDiscussions(supabase, viewerId),
    user ? getRecommendedPeople(supabase, user.id) : Promise.resolve(null),
    user ? getFollowedAuthorIds(supabase, user.id) : Promise.resolve(new Set<string>()),
  ]);

  let cases: FeedCase[] | null;
  if (view === "following" && user) {
    cases = await getCasesByFollowedPeople(supabase, user.id);
  } else if (view === "trending") {
    cases = await getTrendingCases(supabase, viewerId);
  } else if (filter.caseTypes) {
    cases = await getFeedCasesByType(supabase, viewerId, filter.caseTypes);
  } else if (filter.key === "following" && viewerId) {
    cases = await getFollowedCases(supabase, viewerId);
  } else {
    cases = await getFeedCases(supabase, viewerId);
  }

  // Personalize "For You" regardless of which chip is active — even inside
  // "Near miss" or "Cases I follow", a specialty match should still surface
  // first. Trending and the people-based Following tab already rank
  // themselves (by engagement, and by definition) and stay untouched.
  const personalized = view === "foryou" && user;
  if (personalized && cases) {
    cases = rankForYou(cases, profile?.specialty ?? null, followedAuthorIds);
  }

  const locale = profile?.locale ?? "en";

  // The chip row and the tabs both live in the URL, so a reaction from any
  // combination of the two revalidates the exact feed it happened on.
  const path =
    view !== "foryou"
      ? `/?view=${view}`
      : filter.key === "all"
        ? "/?view=foryou"
        : `/?view=foryou&filter=${filter.key}`;

  const emptyMessage =
    view === "following"
      ? "You're not following anyone yet. Follow a clinician from their profile to see their posts here."
      : view === "trending"
        ? "Nothing trending yet — check back soon."
        : filter.empty;

  // Surfaces the same suggestions the generic bottom-of-page section would,
  // but right inside the moment that explains why: an empty Following tab.
  // Suppresses that bottom section (below) so the reader doesn't see the
  // same handful of faces twice on one page load.
  const showInlineFollowSuggestions =
    view === "following" && cases !== null && cases.length === 0 && Boolean(people?.length);

  return (
    <div>
      {/* Above everything: an alert the reader hasn't acknowledged should not
          be hidden behind whichever tab or chip they last picked. */}
      <SafetyAlertBanner alerts={alerts} />

      {user && profile && !profile.avatar_url && (
        <ProfilePhotoNudge locale={locale} />
      )}

      <div className="animate-enter stagger-1">
        <TrendingStrip topics={topics} />
      </div>

      {user && profile?.verified && (
        <div className="animate-enter stagger-2 mt-3">
          <QuickActions />
        </div>
      )}

      <div className="animate-enter stagger-3 mt-4">
        <HomeFeedTabs active={view} hasViewer={Boolean(user)} locale={locale} />
        {view === "foryou" && (
          <FeedFilterBar active={filter.key} hasViewer={Boolean(user)} />
        )}
      </div>

      {personalized && profile?.specialty && (
        <p className="flex items-center gap-1.5 px-4 pb-1 pt-2 font-label text-xs text-accent">
          <TargetIcon width={13} height={13} strokeWidth={2.25} />
          {t(locale, "greeting.personalized", { specialty: profile.specialty })}
        </p>
      )}

      {/* Switching tabs/chips is a real navigation (see HomeFeedTabs/
          FeedFilterBar), but it stays inside this one page — a crossfade
          says "same place, different content" instead of the harder cut a
          plain server-rendered swap would otherwise give. Falls back to an
          instant swap wherever the browser has no View Transitions support. */}
      <ViewTransition key={`${view}-${filter.key}`} name="feed-content" share="auto" enter="auto" default="none">
        <div>
          {cases === null ? (
            <UnavailableNotice
              feature={view === "following" ? "Your network feed" : "This feed"}
            />
          ) : cases.length === 0 ? (
            <>
              <p className="px-4 py-10 text-center text-sm text-muted">
                {emptyMessage}
              </p>
              {/* The Following tab's own empty state is the moment a follow
                  suggestion actually lands — right where the reader just
                  learned that following nobody means seeing nothing, not
                  buried in the generic "People you may know" row at the
                  bottom of every other tab. That row is suppressed below
                  (showInlineFollowSuggestions) so the same faces don't
                  appear twice on one page. */}
              {showInlineFollowSuggestions && people && (
                <RecommendedPeople
                  people={people}
                  path={path}
                  locale={locale}
                  titleKey="nudge.followSuggestionsTitle"
                  bordered={false}
                />
              )}
            </>
          ) : (
            cases.map((c) => (
              <CaseCard key={c.id} feedCase={c} path={path} viewerId={user?.id ?? null} locale={locale} />
            ))
          )}
        </div>
      </ViewTransition>

      <TrendingCommunities communities={communities} locale={locale} />
      <ActiveDiscussions cases={discussions} locale={locale} />
      {user && people && !showInlineFollowSuggestions && (
        <RecommendedPeople people={people} path="/" locale={locale} />
      )}
    </div>
  );
}
