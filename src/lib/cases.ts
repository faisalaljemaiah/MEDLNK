import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Case, Profile, ReactionType } from "@/lib/database.types";

export type FeedAuthor = Pick<
  Profile,
  "id" | "handle" | "full_name" | "role" | "verified" | "avatar_url"
>;

export type ReactionCounts = Record<ReactionType, number> & {
  comments: number;
};

export type FeedCase = Case & {
  author: FeedAuthor | null;
  counts: ReactionCounts;
  viewerReactions: ReactionType[];
};

type Client = SupabaseClient<Database>;

/**
 * One round trip per feed render.
 *
 * Supabase sits ~260ms away, so page latency is set by how many *sequential*
 * queries we issue, not by how much data moves. This pulls the author, every
 * reaction and every comment down as embedded resources alongside the cases,
 * and aggregates in JS — one request instead of a cases query followed by
 * three dependent ones.
 *
 * The embeds are spelled with an explicit foreign-key hint because
 * database.types.ts is hand-written and carries no Relationships metadata for
 * PostgREST to infer from; the row shape is asserted below for the same reason.
 *
 * Counting reactions in JS is still fine at MVP scale. Once reaction volume
 * outgrows "fetch them all", move the counts into a Postgres view or RPC —
 * that keeps this at one round trip while dropping the payload.
 */
const FEED_SELECT =
  "*," +
  "author:profiles!cases_author_id_fkey(id,handle,full_name,role,verified,avatar_url)," +
  "reactions(type,user_id)," +
  "comments(case_id)";

type FeedRow = Case & {
  author: FeedAuthor | null;
  reactions: { type: ReactionType; user_id: string }[] | null;
  comments: { case_id: string }[] | null;
};

function toFeedCase(row: FeedRow, viewerId: string | null): FeedCase {
  const counts: ReactionCounts = { like: 0, repost: 0, save: 0, comments: 0 };
  const viewerReactions: ReactionType[] = [];

  for (const r of row.reactions ?? []) {
    counts[r.type] += 1;
    if (viewerId && r.user_id === viewerId) viewerReactions.push(r.type);
  }
  counts.comments = row.comments?.length ?? 0;

  // Drop the embedded arrays — callers consume the aggregates, not raw rows.
  const rest = { ...row } as Partial<FeedRow>;
  delete rest.reactions;
  delete rest.comments;

  return { ...(rest as Case & { author: FeedAuthor | null }), counts, viewerReactions };
}

export async function getFeedCases(
  supabase: Client,
  viewerId: string | null,
): Promise<FeedCase[]> {
  const { data } = await supabase
    .from("cases")
    .select(FEED_SELECT)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as FeedRow[];
  return rows.map((row) => toFeedCase(row, viewerId));
}

export async function getCaseById(
  supabase: Client,
  caseId: string,
  viewerId: string | null,
): Promise<FeedCase | null> {
  const { data } = await supabase
    .from("cases")
    .select(FEED_SELECT)
    .eq("id", caseId)
    .maybeSingle();

  if (!data) return null;
  return toFeedCase(data as unknown as FeedRow, viewerId);
}

export async function getCaseByCaseNumber(
  supabase: Client,
  caseNumber: string,
  viewerId: string | null,
): Promise<FeedCase | null> {
  // Resolved in a single query — looking up the id first and then re-fetching
  // the case would double the round trips for every case permalink.
  const { data } = await supabase
    .from("cases")
    .select(FEED_SELECT)
    .eq("case_number", caseNumber)
    .maybeSingle();

  if (!data) return null;
  return toFeedCase(data as unknown as FeedRow, viewerId);
}
