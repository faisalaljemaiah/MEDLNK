import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile } from "@/lib/database.types";
import { getFeedCases, type FeedCase } from "@/lib/cases";
import { isClinicalReaction } from "@/lib/reaction-types";

type Client = SupabaseClient<Database>;

export type ProfilePageData = {
  profile: Profile;
  cases: FeedCase[];
  /** Cases the viewer gave any clinical-value reaction to (0010 replaced likes). */
  markedCases: FeedCase[];
  savedCases: FeedCase[];
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

  return {
    profile,
    cases,
    markedCases,
    savedCases,
    followerCount: followerCount ?? 0,
    followingCount: followingCount ?? 0,
    viewerFollows: Boolean(viewerFollowRow.data),
    isOwnProfile,
  };
}
