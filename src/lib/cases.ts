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
  const counts: ReactionCounts = {
    interesting: 0,
    changed_thinking: 0,
    patient_safety: 0,
    repost: 0,
    save: 0,
    comments: 0,
  };
  const viewerReactions: ReactionType[] = [];

  for (const r of row.reactions ?? []) {
    // Skip types this build doesn't know. Until 0010 is applied to the hosted
    // project every stored reaction is still a 'like', and counting one would
    // put NaN on the card rather than a number — the sort of thing that reads
    // as a rendering bug long after the actual cause is forgotten.
    if (!(r.type in counts)) continue;
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

/**
 * The feed narrowed to one post type.
 *
 * Filtered in JS rather than with `.eq("case_type", …)` on purpose. The query
 * is the same single round trip either way, and `select("*")` keeps working
 * whether or not 0008 has been applied to the hosted project — where a column
 * predicate would make PostgREST reject the request outright and take the whole
 * feed down. Pre-migration every row simply reads as the default type, so a
 * near-miss filter is empty rather than broken.
 *
 * Move to a column predicate (and a `limit`) once the feed outgrows fetching
 * every case, which is the same point `getFeedCases` stops being viable.
 */
export async function getFeedCasesByType(
  supabase: Client,
  viewerId: string | null,
  caseTypes: readonly string[],
): Promise<FeedCase[]> {
  const wanted = new Set(caseTypes);
  const all = await getFeedCases(supabase, viewerId);
  return all.filter((c) => wanted.has(c.case_type ?? "clinical_case"));
}

/**
 * Cases the viewer has followed, most recently followed first.
 *
 * Driven from case_followers so the ordering is "when you followed it", not
 * "when it was posted" — a case you picked up today belongs at the top even if
 * it was published last month. RLS restricts case_followers to the viewer's own
 * rows, so this needs no user predicate for correctness; it carries one anyway
 * to keep the index in play.
 *
 * Returns null — not [] — when the read fails, which pre-migration it will,
 * since case_followers doesn't exist on the hosted project yet. An empty array
 * would render as "you follow nothing", and a feature that looks merely empty
 * when it is actually unavailable is the exact bug this codebase has already
 * been bitten by once. Callers say which of the two happened.
 */
export async function getFollowedCases(
  supabase: Client,
  viewerId: string,
): Promise<FeedCase[] | null> {
  // Aliased to `followed_case` rather than `case`: the alias is only a JSON key,
  // but naming it after a SQL keyword is a needless thing to debug remotely.
  const { data, error } = await supabase
    .from("case_followers")
    .select(`followed_case:cases!case_followers_case_id_fkey(${FEED_SELECT})`)
    .eq("user_id", viewerId)
    .order("created_at", { ascending: false });

  if (error) return null;

  const rows = (data ?? []) as unknown as { followed_case: FeedRow | null }[];
  return rows
    .map((row) => row.followed_case)
    .filter((c): c is FeedRow => c !== null)
    .map((row) => toFeedCase(row, viewerId));
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

/**
 * Deliberately excludes explanation / reasoning / evidence.
 *
 * This object is handed to a Client Component, and everything in it is
 * serialised into the page the browser downloads — so carrying the author's
 * write-up here would publish it to readers who haven't answered, no matter
 * what the UI chooses to render. It is fetched separately, gated on an
 * existing attempt: see getRevealIfAnswered / submitAnswerAction.
 */
export type CaseQuestionView = {
  id: string;
  prompt: string;
  allow_change: boolean;
  options: { id: string; body: string; position: number }[];
};

/**
 * Detail select = the feed select plus the interactive question.
 *
 * The option columns are listed explicitly and `is_correct` is absent on
 * purpose: the anon/authenticated roles have no privilege on that column
 * (0008), so `case_options(*)` would fail outright. Correctness is only ever
 * returned by the submit_case_answer RPC, after an attempt is recorded.
 */
const CASE_DETAIL_SELECT =
  FEED_SELECT +
  ",case_questions(id,prompt,allow_change,case_options(id,body,position))";

type EmbeddedQuestion = Omit<CaseQuestionView, "options"> & {
  case_options: { id: string; body: string; position: number }[] | null;
};

/**
 * PostgREST decides an embed's shape from the constraints it finds: because
 * case_questions has `unique (case_id)` it reads as to-one and arrives as a
 * bare object, where a plain foreign key would arrive as an array. Accept both
 * — the shape flips if that constraint is ever lifted for multi-step stems.
 */
type DetailRow = FeedRow & {
  case_questions: EmbeddedQuestion | EmbeddedQuestion[] | null;
};

export type CaseDetail = {
  feedCase: FeedCase;
  question: CaseQuestionView | null;
};

export async function getCaseDetailByCaseNumber(
  supabase: Client,
  caseNumber: string,
  viewerId: string | null,
): Promise<CaseDetail | null> {
  const { data, error } = await supabase
    .from("cases")
    .select(CASE_DETAIL_SELECT)
    .eq("case_number", caseNumber)
    .maybeSingle();

  // 0008 has to be applied by hand on the hosted project. Until it is, the
  // case_questions embed makes PostgREST reject the whole query (PGRST200),
  // which would take the case page down with it. Fall back to the plain case
  // so the clinical content still renders; interactive features simply stay
  // absent until the migration runs.
  if (error) {
    const feedCase = await getCaseByCaseNumber(supabase, caseNumber, viewerId);
    return feedCase ? { feedCase, question: null } : null;
  }

  if (!data) return null;
  const row = data as unknown as DetailRow;

  const embedded = row.case_questions;
  const rawQuestion: EmbeddedQuestion | null = Array.isArray(embedded)
    ? (embedded[0] ?? null)
    : (embedded ?? null);
  const question: CaseQuestionView | null = rawQuestion
    ? {
        id: rawQuestion.id,
        prompt: rawQuestion.prompt,
        allow_change: rawQuestion.allow_change,
        options: [...(rawQuestion.case_options ?? [])].sort(
          (a, b) => a.position - b.position,
        ),
      }
    : null;

  const withoutQuestion = { ...row } as Partial<DetailRow>;
  delete withoutQuestion.case_questions;

  return {
    feedCase: toFeedCase(withoutQuestion as FeedRow, viewerId),
    question,
  };
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
