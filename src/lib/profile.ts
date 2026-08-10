import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile } from "@/lib/database.types";
import { getFeedCases, type FeedCase } from "@/lib/cases";

type Client = SupabaseClient<Database>;

export type ProfilePageData = {
  profile: Profile;
  cases: FeedCase[];
  likedCases: FeedCase[];
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

  const [{ count: followerCount }, { count: followingCount }, viewerFollowRow] =
    await Promise.all([
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
    ]);

  const isOwnProfile = viewerId === profile.id;
  const allCases = await getFeedCases(supabase, viewerId);
  const cases = allCases.filter((c) => c.author_id === profile.id);
  // viewerReactions reflects viewerId's own reactions, so these are only
  // meaningful (and only ever rendered) when isOwnProfile is true.
  const likedCases = isOwnProfile
    ? allCases.filter((c) => c.viewerReactions.includes("like"))
    : [];
  const savedCases = isOwnProfile
    ? allCases.filter((c) => c.viewerReactions.includes("save"))
    : [];

  return {
    profile,
    cases,
    likedCases,
    savedCases,
    followerCount: followerCount ?? 0,
    followingCount: followingCount ?? 0,
    viewerFollows: Boolean(viewerFollowRow.data),
    isOwnProfile,
  };
}
