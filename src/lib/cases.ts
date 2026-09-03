import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Case, Profile, ReactionType } from "@/lib/database.types";
import { getBlockedPairIds } from "@/lib/blocks";

export type FeedAuthor = Pick<
  Profile,
  "id" | "handle" | "full_name" | "role" | "verified" | "badge_tier" | "avatar_url"
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
  "author:profiles!cases_author_id_fkey(id,handle,full_name,role,verified,badge_tier,avatar_url)," +
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

  // A block hides both sides from each other everywhere the feed is
  // derived from this function (Home, profiles, search, exchange) — not
  // just messaging/following, which the RLS layer already stops outright.
  const blocked = viewerId ? await getBlockedPairIds(supabase, viewerId) : null;
  const visible = blocked?.size
    ? rows.filter((row) => !row.author_id || !blocked.has(row.author_id))
    : rows;

  return visible.map((row) => toFeedCase(row, viewerId));
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
 * How many visible cases carry each country code — the whole of Global Case
 * Exchange's landing view. Same JS-side aggregation as everything else here;
 * `country_code` is null pre-0017 and for any author who skipped it, and
 * those rows are simply excluded rather than counted as an "unknown" country.
 */
export async function getCountryBreakdown(
  supabase: Client,
): Promise<{ code: string; count: number }[]> {
  const all = await getFeedCases(supabase, null);
  const counts = new Map<string, number>();
  for (const c of all) {
    if (!c.country_code) continue;
    counts.set(c.country_code, (counts.get(c.country_code) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getFeedCasesByCountry(
  supabase: Client,
  viewerId: string | null,
  countryCode: string,
): Promise<FeedCase[]> {
  const all = await getFeedCases(supabase, viewerId);
  return all.filter((c) => c.country_code === countryCode);
}

function caseEngagementScore(c: FeedCase): number {
  return (
    c.counts.interesting +
    c.counts.changed_thinking * 2 +
    c.counts.patient_safety * 2 +
    c.counts.comments +
    c.counts.repost
  );
}

/**
 * Posts by people the viewer follows (the `follows` table — person-to-person,
 * same one FollowButton/profile pages use), most recent first.
 *
 * Deliberately distinct from getFollowedCases, which is about *cases* someone
 * explicitly clicked Follow on (case_followers, the Case Evolution feature).
 * A social "Following" feed and "cases I'm tracking for updates" are two
 * different things a reader can want, and conflating them would silently
 * change what the existing Follow Case button means.
 */
export async function getCasesByFollowedPeople(
  supabase: Client,
  viewerId: string,
): Promise<FeedCase[] | null> {
  const { data: rows, error } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", viewerId);

  if (error) return null;
  if (!rows || rows.length === 0) return [];

  const followeeIds = new Set(rows.map((r) => r.followee_id));
  const all = await getFeedCases(supabase, viewerId);
  return all.filter((c) => followeeIds.has(c.author_id));
}

/**
 * What's getting the most clinical-value engagement recently — not a
 * platform-wide all-time leaderboard, which would just be whoever posted
 * first. Falls back to all-time if nothing from the last 7 days has any
 * engagement yet, so a quiet week doesn't render an empty tab.
 */
export async function getTrendingCases(
  supabase: Client,
  viewerId: string | null,
): Promise<FeedCase[]> {
  const all = await getFeedCases(supabase, viewerId);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const recent = all.filter((c) => new Date(c.created_at).getTime() >= weekAgo);
  const scored = recent.filter((c) => caseEngagementScore(c) > 0);
  const pool = scored.length > 0 ? scored : all;

  return [...pool].sort(
    (a, b) => caseEngagementScore(b) - caseEngagementScore(a),
  );
}

/**
 * The most-discussed cases right now — real comment activity, not a
 * fabricated "events" calendar. Feeds the Home page's right rail.
 */
export async function getActiveDiscussions(
  supabase: Client,
  viewerId: string | null,
  limit = 4,
): Promise<FeedCase[]> {
  const all = await getFeedCases(supabase, viewerId);
  return [...all]
    .filter((c) => c.counts.comments > 0)
    .sort((a, b) => b.counts.comments - a.counts.comments)
    .slice(0, limit);
}

/** IDs of the people the viewer follows — cheap enough for a ranking input. */
export async function getFollowedAuthorIds(
  supabase: Client,
  viewerId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", viewerId);

  if (error || !data) return new Set();
  return new Set(data.map((r) => r.followee_id));
}

/**
 * "For You" personalization: a pharmacist should see more pharmacy cases
 * without the feed becoming *only* pharmacy cases. Specialty match and
 * following are the two real signals a profile carries; recency and
 * engagement stay in the mix (heavily damped) so the ranking degrades to
 * roughly chronological for a viewer with neither signal, rather than a
 * cliff-edge "personalized or not" toggle.
 *
 * A no-op (returns `cases` unchanged) when the viewer has no specialty and
 * follows nobody — nothing here to rank by, and re-sorting by recency/
 * engagement alone would just be a worse version of the plain chronological
 * feed it replaced.
 */
export function rankForYou(
  cases: FeedCase[],
  viewerSpecialty: string | null,
  followedAuthorIds: Set<string>,
): FeedCase[] {
  if (!viewerSpecialty && followedAuthorIds.size === 0) return cases;

  const specialty = viewerSpecialty?.trim().toLowerCase() || null;

  function score(c: FeedCase): number {
    let s = 0;
    if (specialty && c.specialty?.trim().toLowerCase() === specialty) s += 6;
    if (followedAuthorIds.has(c.author_id)) s += 4;

    // Recency: full weight for a brand-new post, decayed to ~0 after a week,
    // so a strong specialty match from today still outranks one from a month
    // ago, but doesn't bury today's off-specialty news under old matches.
    const ageHours = (Date.now() - new Date(c.created_at).getTime()) / 3_600_000;
    s += Math.max(0, 3 - ageHours / 48);

    s += caseEngagementScore(c) * 0.2;
    return s;
  }

  return [...cases].sort((a, b) => score(b) - score(a));
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
