import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Community,
  CommunityMemberStatus,
  Database,
} from "@/lib/database.types";
type Client = SupabaseClient<Database>;

export type CommunityCard = Community & {
  memberCount: number;
  /** null when the viewer isn't signed in, or hasn't joined/saved it. */
  viewerStatus: CommunityMemberStatus | null;
};

export type MyCommunities = {
  joined: CommunityCard[];
  saved: CommunityCard[];
};

/** Joined-only member count plus the viewer's own status for each row, cheap
 *  enough for the small community lists this app has today (see 0031's
 *  "no denormalized counter" call — matches every other count in this
 *  codebase, e.g. follower counts). */
async function withMembership(
  supabase: Client,
  communities: Community[],
  viewerId: string | null,
): Promise<CommunityCard[]> {
  if (communities.length === 0) return [];

  const { data: members } = await supabase
    .from("community_members")
    .select("community_id, user_id, status")
    .in(
      "community_id",
      communities.map((c) => c.id),
    );

  const countByCommunity = new Map<string, number>();
  const viewerStatusByCommunity = new Map<string, CommunityMemberStatus>();
  for (const m of members ?? []) {
    if (m.status === "joined") {
      countByCommunity.set(
        m.community_id,
        (countByCommunity.get(m.community_id) ?? 0) + 1,
      );
    }
    if (viewerId && m.user_id === viewerId) {
      viewerStatusByCommunity.set(m.community_id, m.status);
    }
  }

  return communities.map((c) => ({
    ...c,
    memberCount: countByCommunity.get(c.id) ?? 0,
    viewerStatus: viewerStatusByCommunity.get(c.id) ?? null,
  }));
}

/** Discovery bubbles on the Discover page — every community, most-joined first. */
export async function getDiscoverCommunities(
  supabase: Client,
  viewerId: string | null,
  limit = 12,
): Promise<CommunityCard[]> {
  const { data: communities } = await supabase
    .from("communities")
    .select("*")
    .order("created_at", { ascending: false });

  const cards = await withMembership(supabase, communities ?? [], viewerId);
  return cards.sort((a, b) => b.memberCount - a.memberCount).slice(0, limit);
}

/** The Messages "Communities" tab — what this viewer joined vs. only saved. */
export async function getMyCommunities(
  supabase: Client,
  userId: string,
): Promise<MyCommunities> {
  const { data: memberships } = await supabase
    .from("community_members")
    .select("community_id, status")
    .eq("user_id", userId);

  if (!memberships || memberships.length === 0) return { joined: [], saved: [] };

  const { data: communities } = await supabase
    .from("communities")
    .select("*")
    .in(
      "id",
      memberships.map((m) => m.community_id),
    );

  const cards = await withMembership(supabase, communities ?? [], userId);
  return {
    joined: cards.filter((c) => c.viewerStatus === "joined"),
    saved: cards.filter((c) => c.viewerStatus === "saved"),
  };
}

export async function getCommunityBySlug(
  supabase: Client,
  slug: string,
  viewerId: string | null,
): Promise<CommunityCard | null> {
  const { data: community } = await supabase
    .from("communities")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!community) return null;
  const [card] = await withMembership(supabase, [community], viewerId);
  return card;
}

/**
 * UI-convenience check for the "Create a community" entry point — the real
 * gate is the communities_insert_eligible RLS policy (0031_communities.sql),
 * this just lets the page show the right state without a failed insert.
 * Same live count-query style as the follower count on src/lib/profile.ts.
 */
export async function getCommunityCreationEligibility(
  supabase: Client,
  userId: string,
): Promise<{ eligible: boolean; followerCount: number }> {
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("followee_id", userId);

  const followerCount = count ?? 0;
  return { eligible: followerCount >= 100, followerCount };
}
