import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile } from "@/lib/database.types";
import { getFeedCases, type FeedCase } from "@/lib/cases";
import { isClinicalReaction } from "@/lib/reaction-types";

type Client = SupabaseClient<Database>;

/**
 * What this clinician has contributed (spec §12).
 *
 * Contribution, not popularity: how much they've taught and how much of it was
 * patient-safety work. Follower count is deliberately not part of this block —
 * it already sits above, and mixing it in would turn a teaching record into a
 * leaderboard, which is the opposite of what this network is for.
 *
 * The three signal totals are what *other* clinicians said the work was worth,
 * so they can't be self-awarded.
 */
export type ContributionStats = {
  casesShared: number;
  /** near_miss + safety_alert — the patient-safety formats. */
  safetyPosts: number;
  /** Cases published with a question attached: teaching, not just telling. */
  teachingCases: number;
  repliesWritten: number;
  signal: {
    interesting: number;
    changed_thinking: number;
    patient_safety: number;
  };
};

export type ProfilePageData = {
  profile: Profile;
  cases: FeedCase[];
  /** Cases the viewer gave any clinical-value reaction to (0010 replaced likes). */
  markedCases: FeedCase[];
  savedCases: FeedCase[];
  stats: ContributionStats;
  followerCount: number;
  followingCount: number;
  viewerFollows: boolean;
  isOwnProfile: boolean;
};

export async function getProfileByHandle(
  supabase: Client,
  handle: string,
  viewerId: string | null,
): Promise<ProfilePageData | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", handle)
    .maybeSingle();

  if (!profile) return null;

  // The follow counts and the case list don't depend on each other, so they go
  // out together — awaiting the counts first would add a round trip (~260ms)
  // to every profile view for no reason.
  const [
    { count: followerCount },
    { count: followingCount },
    viewerFollowRow,
    allCases,
    replyCountRes,
  ] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("followee_id", profile.id),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profile.id),
    viewerId && viewerId !== profile.id
      ? supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", viewerId)
          .eq("followee_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    getFeedCases(supabase, viewerId),
    // The only stat not derivable from allCases, so it rides along here rather
    // than costing a round trip of its own.
    supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id),
  ]);

  const isOwnProfile = viewerId === profile.id;
  const cases = allCases.filter((c) => c.author_id === profile.id);
  // viewerReactions reflects viewerId's own reactions, so these are only
  // meaningful (and only ever rendered) when isOwnProfile is true.
  // Any of the three, not one specific one: a reader looking for "that case I
  // marked" doesn't remember which button they pressed, only that they did.
  const markedCases = isOwnProfile
    ? allCases.filter((c) => c.viewerReactions.some(isClinicalReaction))
    : [];
  const savedCases = isOwnProfile
    ? allCases.filter((c) => c.viewerReactions.includes("save"))
    : [];

  // Everything but the reply count falls out of the case list already in hand.
  //
  // Note these are counted from what the *viewer* can see: a moderator-removed
  // case is visible to its author and to admins and not to anyone else, so an
  // author's own contribution total can legitimately exceed what a visitor
  // sees. That is the honest number in each direction — inflating a visitor's
  // view would mean counting content we won't show them.
  const stats: ContributionStats = {
    casesShared: cases.length,
    safetyPosts: cases.filter(
      (c) => c.case_type === "near_miss" || c.case_type === "safety_alert",
    ).length,
    teachingCases: cases.filter((c) => c.case_type === "what_would_you_do")
      .length,
    repliesWritten: (replyCountRes as { count: number | null }).count ?? 0,
    signal: cases.reduce(
      (acc, c) => ({
        interesting: acc.interesting + c.counts.interesting,
        changed_thinking: acc.changed_thinking + c.counts.changed_thinking,
        patient_safety: acc.patient_safety + c.counts.patient_safety,
      }),
      { interesting: 0, changed_thinking: 0, patient_safety: 0 },
    ),
  };

  return {
    profile,
    cases,
    markedCases,
    savedCases,
    stats,
    followerCount: followerCount ?? 0,
    followingCount: followingCount ?? 0,
    viewerFollows: Boolean(viewerFollowRow.data),
    isOwnProfile,
  };
}
