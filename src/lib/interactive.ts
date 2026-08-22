import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, CaseUpdate } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export type AnswerDistribution = {
  /** option_id -> number of answers */
  votes: Record<string, number>;
  total: number;
};

export type ViewerAttempt = {
  optionId: string;
  isCorrect: boolean;
};

export type CaseFollowerProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  handle: string | null;
};

export type InteractiveState = {
  attempt: ViewerAttempt | null;
  distribution: AnswerDistribution;
  updates: CaseUpdate[];
  isFollowing: boolean;
  followerCount: number;
  /** People the viewer follows who also follow this case — social proof
   *  for the follow-case count, same "people you know" idea as elsewhere
   *  in the app, just scoped to a case instead of a person. Empty for a
   *  signed-out viewer or one who follows nobody in common. */
  followedFollowers: CaseFollowerProfile[];
};

const EMPTY_DISTRIBUTION: AnswerDistribution = { votes: {}, total: 0 };

/**
 * Everything the case page needs beyond the case itself, in one parallel batch.
 * Supabase is ~260ms away, so these go out together rather than in sequence.
 *
 * Returns benign empty state rather than throwing when the tables aren't there
 * yet: 0008 has to be run by hand on the hosted project, and until it is, a
 * case page must still render its clinical content.
 */
export async function getInteractiveState(
  supabase: Client,
  caseId: string,
  questionId: string | null,
  viewerId: string | null,
): Promise<InteractiveState> {
  const [
    attemptRes,
    distributionRes,
    updatesRes,
    followRes,
    followCountRes,
    caseFollowerProfilesRes,
    viewerFolloweesRes,
  ] = await Promise.all([
    questionId && viewerId
      ? supabase
          .from("case_attempts")
          .select("option_id, is_correct")
          .eq("question_id", questionId)
          .eq("user_id", viewerId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    questionId
      ? supabase.rpc("case_answer_distribution", {
          p_question_id: questionId,
        })
      : Promise.resolve({ data: null }),
    supabase
      .from("case_updates")
      .select("*")
      .eq("case_id", caseId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    viewerId
      ? supabase
          .from("case_followers")
          .select("case_id")
          .eq("case_id", caseId)
          .eq("user_id", viewerId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("case_followers")
      .select("*", { count: "exact", head: true })
      .eq("case_id", caseId),
    // Who follows this case, for the "people you follow also follow this"
    // avatar stack — case_followers.select is public (0024), so this reads
    // regardless of who the viewer is. Only worth fetching when there's a
    // viewer to intersect it against.
    viewerId
      ? supabase
          .from("case_followers")
          .select(
            "user_id, follower:profiles!case_followers_user_id_fkey(id,full_name,avatar_url,handle)",
          )
          .eq("case_id", caseId)
      : Promise.resolve({ data: null }),
    viewerId
      ? supabase.from("follows").select("followee_id").eq("follower_id", viewerId)
      : Promise.resolve({ data: null }),
  ]);

  const attemptRow = attemptRes.data as {
    option_id: string;
    is_correct: boolean;
  } | null;

  const distributionRows = (distributionRes.data ?? []) as {
    option_id: string;
    votes: number | string;
  }[];

  const votes: Record<string, number> = {};
  let total = 0;
  for (const row of distributionRows) {
    // count() comes back as bigint, which supabase-js surfaces as a string.
    const n = Number(row.votes) || 0;
    votes[row.option_id] = n;
    total += n;
  }

  const followeeIds = new Set(
    ((viewerFolloweesRes.data ?? []) as { followee_id: string }[]).map(
      (r) => r.followee_id,
    ),
  );
  const caseFollowerRows = (caseFollowerProfilesRes.data ?? []) as unknown as {
    user_id: string;
    follower: CaseFollowerProfile | null;
  }[];
  const followedFollowers = caseFollowerRows
    .filter((r) => followeeIds.has(r.user_id) && r.follower)
    .map((r) => r.follower as CaseFollowerProfile);

  return {
    attempt: attemptRow
      ? { optionId: attemptRow.option_id, isCorrect: attemptRow.is_correct }
      : null,
    distribution: distributionRows.length ? { votes, total } : EMPTY_DISTRIBUTION,
    updates: (updatesRes.data ?? []) as CaseUpdate[],
    isFollowing: Boolean(followRes.data),
    followerCount: (followCountRes as { count: number | null }).count ?? 0,
    followedFollowers,
  };
}
