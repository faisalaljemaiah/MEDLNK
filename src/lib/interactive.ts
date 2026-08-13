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

export type InteractiveState = {
  attempt: ViewerAttempt | null;
  distribution: AnswerDistribution;
  updates: CaseUpdate[];
  isFollowing: boolean;
  followerCount: number;
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
  const [attemptRes, distributionRes, updatesRes, followRes, followCountRes] =
    await Promise.all([
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

  return {
    attempt: attemptRow
      ? { optionId: attemptRow.option_id, isCorrect: attemptRow.is_correct }
      : null,
    distribution: distributionRows.length ? { votes, total } : EMPTY_DISTRIBUTION,
    updates: (updatesRes.data ?? []) as CaseUpdate[],
    isFollowing: Boolean(followRes.data),
    followerCount: (followCountRes as { count: number | null }).count ?? 0,
  };
}
