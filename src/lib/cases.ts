import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Case, Profile, ReactionType } from "@/lib/database.types";

export type FeedAuthor = Pick<
  Profile,
  "id" | "handle" | "full_name" | "role" | "verified"
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
 * Loads the feed: cases + their authors + reaction/comment counts + which
 * reactions the current viewer has already made.
 *
 * NB: reaction/comment counts are computed by fetching every row for the
 * visible cases and aggregating in JS. That's fine at MVP scale (dozens of
 * cases, low reaction volume) — once this gets busy, replace it with a
 * Postgres view or RPC that returns pre-aggregated counts so this doesn't
 * scale linearly with total reaction rows.
 *
 * Author lookups are done as a separate query rather than a PostgREST
 * embed (`profiles!cases_author_id_fkey(...)`) to avoid depending on
 * foreign-key relationship metadata in the hand-written Database type.
 */
export async function getFeedCases(
  supabase: Client,
  viewerId: string | null,
): Promise<FeedCase[]> {
  const { data: cases } = await supabase
    .from("cases")
    .select("*")
    .order("created_at", { ascending: false });

  if (!cases || cases.length === 0) return [];

  const caseIds = cases.map((c) => c.id);
  const authorIds = [...new Set(cases.map((c) => c.author_id))];

  const [{ data: authors }, { data: reactions }, { data: comments }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, handle, full_name, role, verified")
        .in("id", authorIds),
      supabase
        .from("reactions")
        .select("case_id, type, user_id")
        .in("case_id", caseIds),
      supabase.from("comments").select("case_id").in("case_id", caseIds),
    ]);

  const authorById = new Map<string, FeedAuthor>(
    (authors ?? []).map((a) => [a.id, a]),
  );

  const counts = new Map<string, ReactionCounts>();
  const viewerReactions = new Map<string, ReactionType[]>();
  for (const id of caseIds) {
    counts.set(id, { like: 0, repost: 0, save: 0, comments: 0 });
    viewerReactions.set(id, []);
  }

  for (const r of reactions ?? []) {
    const c = counts.get(r.case_id);
    if (c) c[r.type] += 1;
    if (viewerId && r.user_id === viewerId) {
      viewerReactions.get(r.case_id)?.push(r.type);
    }
  }
  for (const c of comments ?? []) {
    const entry = counts.get(c.case_id);
    if (entry) entry.comments += 1;
  }

  return cases.map((c) => ({
    ...c,
    author: authorById.get(c.author_id) ?? null,
    counts: counts.get(c.id) ?? { like: 0, repost: 0, save: 0, comments: 0 },
    viewerReactions: viewerReactions.get(c.id) ?? [],
  }));
}

export async function getCaseById(
  supabase: Client,
  caseId: string,
  viewerId: string | null,
): Promise<FeedCase | null> {
  const { data: c } = await supabase
    .from("cases")
    .select("*")
    .eq("id", caseId)
    .single();

  if (!c) return null;

  const [{ data: author }, { data: reactions }, { data: comments }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, handle, full_name, role, verified")
        .eq("id", c.author_id)
        .single(),
      supabase
        .from("reactions")
        .select("type, user_id")
        .eq("case_id", c.id),
      supabase.from("comments").select("case_id").eq("case_id", c.id),
    ]);

  const counts: ReactionCounts = { like: 0, repost: 0, save: 0, comments: 0 };
  const viewerReactions: ReactionType[] = [];
  for (const r of reactions ?? []) {
    counts[r.type] += 1;
    if (viewerId && r.user_id === viewerId) viewerReactions.push(r.type);
  }
  counts.comments = comments?.length ?? 0;

  return {
    ...c,
    author: author ?? null,
    counts,
    viewerReactions,
  };
}
