import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export type PractiseCase = {
  questionId: string;
  prompt: string;
  caseNumber: string | null;
  caseTitle: string;
  specialty: string | null;
};

export type LearnData = {
  /** Cases with a question this viewer has never attempted. */
  practise: PractiseCase[];
  attempted: number;
  correct: number;
};

/**
 * The learning surface (spec §26).
 *
 * Two queries in parallel rather than one join: case_attempts is readable only
 * by its owner (0008), so "questions minus the ones I've answered" can't be a
 * server-side anti-join through PostgREST — the rows the subquery would need to
 * see are exactly the rows RLS hides from everyone else. Set-differencing in JS
 * keeps it at one round trip and keeps the privacy property intact.
 *
 * Returns null when the read fails, so /learn can say the feature isn't
 * switched on rather than claiming there is nothing to practise.
 */
export async function getLearnData(
  supabase: Client,
  viewerId: string,
): Promise<LearnData | null> {
  const [questionsRes, attemptsRes] = await Promise.all([
    supabase
      .from("case_questions")
      .select(
        "id,prompt,subject_case:cases!case_questions_case_id_fkey(case_number,title,specialty)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("case_attempts")
      .select("question_id,is_correct")
      .eq("user_id", viewerId),
  ]);

  if (questionsRes.error) return null;

  const attempts = (attemptsRes.data ?? []) as {
    question_id: string;
    is_correct: boolean;
  }[];

  const attemptedIds = new Set(attempts.map((a) => a.question_id));

  const rows = (questionsRes.data ?? []) as unknown as {
    id: string;
    prompt: string;
    subject_case: {
      case_number: string | null;
      title: string;
      specialty: string | null;
    } | null;
  }[];

  const practise = rows
    .filter((r) => !attemptedIds.has(r.id) && r.subject_case !== null)
    .map((r) => ({
      questionId: r.id,
      prompt: r.prompt,
      caseNumber: r.subject_case!.case_number,
      caseTitle: r.subject_case!.title,
      specialty: r.subject_case!.specialty,
    }));

  return {
    practise,
    attempted: attempts.length,
    correct: attempts.filter((a) => a.is_correct).length,
  };
}
