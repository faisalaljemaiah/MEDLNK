import type { SupabaseClient } from "@supabase/supabase-js";
import type { BadgeTier, Database } from "@/lib/database.types";
import { getBlockedPairIds } from "@/lib/blocks";

type Client = SupabaseClient<Database>;

export type FollowListPerson = {
  id: string;
  handle: string | null;
  full_name: string | null;
  role: string | null;
  specialty: string | null;
  avatar_url: string | null;
  verified: boolean;
  badge_tier: BadgeTier | null;
  /** Whether the viewer (not the profile whose list this is) already
   *  follows this person — drives each row's own FollowButton state. */
  viewerFollows: boolean;
};

type CandidateRow = {
  id: string;
  handle: string | null;
  full_name: string | null;
  role: string | null;
  specialty: string | null;
  avatar_url: string | null;
  verified: boolean;
  badge_tier: BadgeTier | null;
  is_admin: boolean;
};

/**
 * Turns already-filtered candidate rows into the shape every list/search
 * result renders — attaching whether the viewer already follows each one,
 * in a single batched query rather than one round trip per row. Shared by
 * getFollowList and searchPeople so "does the viewer already follow this
 * person" is computed exactly one way.
 */
async function withViewerFollowState(
  supabase: Client,
  people: CandidateRow[],
  viewerId: string | null,
): Promise<FollowListPerson[]> {
  if (people.length === 0) return [];

  const { data: viewerFollowingRows } = viewerId
    ? await supabase
        .from("follows")
        .select("followee_id")
        .eq("follower_id", viewerId)
        .in(
          "followee_id",
          people.map((p) => p.id),
        )
    : { data: [] as { followee_id: string }[] | null };

  const viewerFollowingSet = new Set(
    (viewerFollowingRows ?? []).map((r) => r.followee_id),
  );

  return people.map((p) => ({
    id: p.id,
    handle: p.handle,
    full_name: p.full_name,
    role: p.role,
    specialty: p.specialty,
    avatar_url: p.avatar_url,
    verified: p.verified,
    badge_tier: p.badge_tier,
    viewerFollows: viewerFollowingSet.has(p.id),
  }));
}

/**
 * The people behind tapping either count on a profile page: who follows
 * `profileId` ("followers"), or who `profileId` follows ("following").
 *
 * Admin accounts are excluded the same way getRecommendedPeople
 * (src/lib/home.ts) excludes them — an admin has no public profile page to
 * link a row to. A viewer in a mutual block with someone in the raw list
 * doesn't see that row either, same enforcement as everywhere else
 * blocking applies (getBlockedPairIds, src/lib/blocks.ts) — this table's
 * own RLS (follows_select_all, 0004) is intentionally public, so that
 * filtering has to happen here rather than at the database.
 */
export async function getFollowList(
  supabase: Client,
  profileId: string,
  direction: "followers" | "following",
  viewerId: string | null,
): Promise<FollowListPerson[]> {
  // "followers" reads follows rows where profileId is the one being
  // followed, and returns the follower on the other side of each row (and
  // vice versa for "following") — so the embedded profile has to come
  // through the *other* column's foreign key each time.
  const matchColumn = direction === "followers" ? "followee_id" : "follower_id";
  const otherFk =
    direction === "followers" ? "follows_follower_id_fkey" : "follows_followee_id_fkey";

  const [{ data, error }, blockedIds] = await Promise.all([
    supabase
      .from("follows")
      .select(
        `profile:profiles!${otherFk}(id,handle,full_name,role,specialty,avatar_url,verified,badge_tier,is_admin)`,
      )
      .eq(matchColumn, profileId)
      .order("created_at", { ascending: false }),
    viewerId ? getBlockedPairIds(supabase, viewerId) : Promise.resolve(new Set<string>()),
  ]);

  if (error) return [];

  const people = ((data ?? []) as unknown as { profile: CandidateRow | null }[])
    .map((row) => row.profile)
    .filter((p): p is CandidateRow => p !== null)
    .filter((p) => !p.is_admin && !blockedIds.has(p.id));

  return withViewerFollowState(supabase, people, viewerId);
}

const SEARCH_LIMIT = 500;
const SEARCH_RESULTS_LIMIT = 30;

/**
 * The member-directory search behind Discover's "People" tab — by name,
 * handle, role, or specialty. Same "filter in JS over one bounded fetch"
 * convention as case search (src/app/(app)/search/page.tsx) and the admin
 * directory (src/lib/admin-directory.ts): building a dynamic `.or()`
 * filter string from raw member input would be injection-adjacent for
 * PostgREST's comma/dot/paren mini-language, so the match happens here
 * instead. An empty query returns nothing — unlike the admin directory,
 * this is reachable by every member, so it's a search box, not a browse-all
 * listing of the entire membership.
 */
export async function searchPeople(
  supabase: Client,
  query: string,
  viewerId: string | null,
): Promise<FollowListPerson[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const [{ data, error }, blockedIds] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,handle,full_name,role,specialty,avatar_url,verified,badge_tier,is_admin")
      .not("handle", "is", null)
      .order("created_at", { ascending: false })
      .limit(SEARCH_LIMIT),
    viewerId ? getBlockedPairIds(supabase, viewerId) : Promise.resolve(new Set<string>()),
  ]);

  if (error) return [];

  const people = (data as CandidateRow[])
    .filter((p) => p.id !== viewerId && !p.is_admin && !blockedIds.has(p.id))
    .filter((p) => {
      const haystack = [p.full_name, p.handle, p.role, p.specialty]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, SEARCH_RESULTS_LIMIT);

  return withViewerFollowState(supabase, people, viewerId);
}
