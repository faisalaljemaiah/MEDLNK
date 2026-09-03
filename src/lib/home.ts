import type { SupabaseClient } from "@supabase/supabase-js";
import type { BadgeTier, Database } from "@/lib/database.types";
import type { ContributionStats } from "@/lib/profile";
import { getFeedCases } from "@/lib/cases";
import {
  computeReputationScore,
  computeReputationTier,
  type ReputationTier,
} from "@/lib/reputation";

type Client = SupabaseClient<Database>;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
function weekAgoIso(): string {
  return new Date(Date.now() - WEEK_MS).toISOString();
}

/**
 * A week of weighted activity that reads as "fully active" on the dial.
 * Not derived from anything — same kind of documented, arbitrary-but-stated
 * threshold as the tier cutoffs in reputation.ts. Every number that feeds
 * into it is real (posts/comments/reactions actually made this week); this
 * constant only decides where 100% falls on the dial.
 */
const ACTIVE_WEEK_THRESHOLD = 15;

export type HomeStats = {
  reputationScore: number;
  reputationTier: ReputationTier;
  connections: number;
  connectionsThisWeek: number;
  casesShared: number;
  casesThisWeek: number;
  /** Distinct specialties represented in the feed right now — Asyashare's unit
   *  of "community" is a specialty, not a dedicated communities table. */
  communities: number;
  activity: {
    percent: number;
    postsThisWeek: number;
    commentsThisWeek: number;
    reactionsThisWeek: number;
  };
};

/**
 * The Home dashboard's stat row — every number is a real count, most via
 * direct queries rather than getFeedCases's fetch-everything pattern, since
 * these are exact totals rather than aggregates over a bounded feed page.
 * Returns null on a failed read; the caller decides how to degrade.
 */
export async function getHomeStats(
  supabase: Client,
  viewerId: string,
): Promise<HomeStats | null> {
  const weekAgo = weekAgoIso();

  const [
    followerRes,
    followerWeekRes,
    casesRes,
    casesWeekRes,
    repliesRes,
    commentsWeekRes,
    reactionsWeekRes,
    allCases,
  ] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("followee_id", viewerId),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("followee_id", viewerId)
      .gte("created_at", weekAgo),
    supabase
      .from("cases")
      .select("*", { count: "exact", head: true })
      .eq("author_id", viewerId),
    supabase
      .from("cases")
      .select("*", { count: "exact", head: true })
      .eq("author_id", viewerId)
      .gte("created_at", weekAgo),
    supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", viewerId),
    supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", viewerId)
      .gte("created_at", weekAgo),
    supabase
      .from("reactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", viewerId)
      .gte("created_at", weekAgo),
    getFeedCases(supabase, viewerId),
  ]);

  if (followerRes.error || casesRes.error) return null;

  const mine = allCases.filter((c) => c.author_id === viewerId);
  const signal = mine.reduce(
    (acc, c) => ({
      interesting: acc.interesting + c.counts.interesting,
      changed_thinking: acc.changed_thinking + c.counts.changed_thinking,
      patient_safety: acc.patient_safety + c.counts.patient_safety,
    }),
    { interesting: 0, changed_thinking: 0, patient_safety: 0 },
  );

  const contribution: ContributionStats = {
    casesShared: casesRes.count ?? 0,
    safetyPosts: mine.filter(
      (c) => c.case_type === "near_miss" || c.case_type === "safety_alert",
    ).length,
    teachingCases: mine.filter((c) => c.case_type === "what_would_you_do")
      .length,
    repliesWritten: repliesRes.count ?? 0,
    signal,
  };

  const communities = new Set(
    allCases.map((c) => c.specialty).filter((s): s is string => Boolean(s)),
  ).size;

  const postsThisWeek = casesWeekRes.count ?? 0;
  const commentsThisWeek = commentsWeekRes.count ?? 0;
  const reactionsThisWeek = reactionsWeekRes.count ?? 0;
  const weightedActivity =
    postsThisWeek * 3 + commentsThisWeek * 2 + reactionsThisWeek * 1;

  return {
    reputationScore: computeReputationScore(contribution),
    reputationTier: computeReputationTier(contribution),
    connections: followerRes.count ?? 0,
    connectionsThisWeek: followerWeekRes.count ?? 0,
    casesShared: contribution.casesShared,
    casesThisWeek: postsThisWeek,
    communities,
    activity: {
      percent: Math.min(
        100,
        Math.round((weightedActivity / ACTIVE_WEEK_THRESHOLD) * 100),
      ),
      postsThisWeek,
      commentsThisWeek,
      reactionsThisWeek,
    },
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export type HomeStreak = {
  days: number;
};

/**
 * The dashboard's activity streak — real, computed from the viewer's own
 * case/comment/reaction timestamps, not a fabricated number. Counts
 * consecutive UTC days with at least one of the three, walking backward from
 * today; a gap of a full day with nothing breaks the streak. "Today" counts
 * even with zero activity so far — the streak isn't broken until a whole day
 * passes with nothing, matching how every other streak feature works.
 */
export async function getHomeStreak(
  supabase: Client,
  viewerId: string,
): Promise<HomeStreak> {
  const since = new Date(Date.now() - 60 * DAY_MS).toISOString();

  const [casesRes, commentsRes, reactionsRes] = await Promise.all([
    supabase
      .from("cases")
      .select("created_at")
      .eq("author_id", viewerId)
      .gte("created_at", since),
    supabase
      .from("comments")
      .select("created_at")
      .eq("user_id", viewerId)
      .gte("created_at", since),
    supabase
      .from("reactions")
      .select("created_at")
      .eq("user_id", viewerId)
      .gte("created_at", since),
  ]);

  const activeDays = new Set<string>();
  for (const rows of [casesRes.data, commentsRes.data, reactionsRes.data]) {
    for (const row of rows ?? []) {
      activeDays.add(row.created_at.slice(0, 10)); // "YYYY-MM-DD" (UTC)
    }
  }

  let days = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (!activeDays.has(key)) {
      // Today not having activity yet doesn't break a streak that's still
      // in progress — every earlier day does.
      if (days === 0 && key === new Date().toISOString().slice(0, 10)) {
        cursor.setUTCDate(cursor.getUTCDate() - 1);
        continue;
      }
      break;
    }
    days += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return { days };
}

export type TrendingTopic = {
  id: string;
  name: string;
  count: number;
  momentum: "up" | "steady";
};

/**
 * Tags with the most recent activity — same derivation as
 * getTrendingCommunities, just grouped by tag instead of specialty, since
 * Asyashare has no dedicated topics table either. momentum is a real signal
 * (more of this tag in the last 3 days than the 3 before that), not a
 * fabricated one.
 */
export async function getTrendingTopics(
  supabase: Client,
  viewerId: string | null,
  limit = 8,
): Promise<TrendingTopic[]> {
  const all = await getFeedCases(supabase, viewerId);
  const now = Date.now();
  const recentCutoff = now - 3 * DAY_MS;
  const priorCutoff = now - 6 * DAY_MS;

  const byTag = new Map<string, { count: number; recent: number; prior: number }>();
  for (const c of all) {
    const createdAt = new Date(c.created_at).getTime();
    for (const tag of c.tags) {
      const entry = byTag.get(tag) ?? { count: 0, recent: 0, prior: 0 };
      entry.count += 1;
      if (createdAt >= recentCutoff) entry.recent += 1;
      else if (createdAt >= priorCutoff) entry.prior += 1;
      byTag.set(tag, entry);
    }
  }

  return [...byTag.entries()]
    .map(([name, v]) => ({
      id: name,
      name,
      count: v.count,
      momentum: (v.recent > v.prior ? "up" : "steady") as "up" | "steady",
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export type TrendingCommunity = {
  specialty: string;
  caseCount: number;
  memberCount: number;
};

/**
 * Specialties with the most recent activity — real, derived from the same
 * `specialty` field cases already carry. Asyashare has no dedicated communities
 * table; this is the honest stand-in rather than a fabricated one.
 */
export async function getTrendingCommunities(
  supabase: Client,
  viewerId: string | null,
  limit = 4,
): Promise<TrendingCommunity[]> {
  const all = await getFeedCases(supabase, viewerId);
  const bySpecialty = new Map<string, { caseCount: number; authors: Set<string> }>();

  for (const c of all) {
    if (!c.specialty) continue;
    const entry = bySpecialty.get(c.specialty) ?? {
      caseCount: 0,
      authors: new Set<string>(),
    };
    entry.caseCount += 1;
    entry.authors.add(c.author_id);
    bySpecialty.set(c.specialty, entry);
  }

  return [...bySpecialty.entries()]
    .map(([specialty, v]) => ({
      specialty,
      caseCount: v.caseCount,
      memberCount: v.authors.size,
    }))
    .sort((a, b) => b.caseCount - a.caseCount)
    .slice(0, limit);
}

export type RecommendedPerson = {
  id: string;
  handle: string;
  full_name: string | null;
  role: string | null;
  specialty: string | null;
  avatar_url: string | null;
  verified: boolean;
  badge_tier: BadgeTier | null;
  followerCount: number;
};

/**
 * "People you may know" — real profiles, excluding the viewer and anyone
 * already followed. Follower counts come from one full read of `follows`
 * aggregated in JS, the same tradeoff getFeedCases makes for reactions: fine
 * at MVP scale, and the place to move to a count() RPC when it isn't.
 *
 * Returns null on a failed read, [] when there's genuinely no one new to
 * recommend — same convention as everywhere else, so an empty row and a
 * broken query don't look identical.
 */
export async function getRecommendedPeople(
  supabase: Client,
  viewerId: string,
  limit = 6,
): Promise<RecommendedPerson[] | null> {
  const [candidatesRes, followsRes] = await Promise.all([
    supabase
      .from("profiles")
      // is_admin excluded — an admin account has no public profile page
      // (src/app/(app)/u/[handle]/page.tsx) to send a recommendation to.
      .select("id,handle,full_name,role,specialty,avatar_url,verified,badge_tier")
      .neq("id", viewerId)
      .not("handle", "is", null)
      .eq("is_admin", false)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("follows").select("follower_id,followee_id"),
  ]);

  if (candidatesRes.error || followsRes.error) return null;

  const followerCounts = new Map<string, number>();
  const alreadyFollowing = new Set<string>();
  for (const row of followsRes.data ?? []) {
    followerCounts.set(
      row.followee_id,
      (followerCounts.get(row.followee_id) ?? 0) + 1,
    );
    if (row.follower_id === viewerId) alreadyFollowing.add(row.followee_id);
  }

  return (candidatesRes.data ?? [])
    .filter((p) => p.handle && !alreadyFollowing.has(p.id))
    .slice(0, limit)
    .map((p) => ({
      id: p.id,
      handle: p.handle as string,
      full_name: p.full_name,
      role: p.role,
      specialty: p.specialty,
      avatar_url: p.avatar_url,
      verified: p.verified,
      badge_tier: p.badge_tier,
      followerCount: followerCounts.get(p.id) ?? 0,
    }));
}
