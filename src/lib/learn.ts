import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { CaseQuestionView } from "@/lib/cases";
import type { AnswerDistribution } from "@/lib/interactive";

type Client = SupabaseClient<Database>;

export type PractiseCase = {
  questionId: string;
  prompt: string;
  caseNumber: string | null;
  caseTitle: string;
  specialty: string | null;
};

export type SpecialtyRecord = {
  specialty: string;
  attempted: number;
  matched: number;
};

export type LearnData = {
  /** Cases with a question this viewer has never attempted. */
  practise: PractiseCase[];
  /** Answered, but not the way the author did — the ones worth revisiting. */
  missed: PractiseCase[];
  attempted: number;
  correct: number;
  /** Only specialties the viewer has actually answered in. */
  bySpecialty: SpecialtyRecord[];
};

type QuestionRow = {
  id: string;
  prompt: string;
  subject_case: {
    case_number: string | null;
    title: string;
    specialty: string | null;
  } | null;
};

const QUESTION_SELECT =
  "id,prompt,subject_case:cases!case_questions_case_id_fkey(case_number,title,specialty)";

function toPractise(r: QuestionRow): PractiseCase {
  return {
    questionId: r.id,
    prompt: r.prompt,
    caseNumber: r.subject_case?.case_number ?? null,
    caseTitle: r.subject_case?.title ?? "A case",
    specialty: r.subject_case?.specialty ?? null,
  };
}

/**
 * The learning surface (spec §26) and the record behind My Learning (§14).
 *
 * Two queries in parallel, and everything else derived in JS. That isn't a
 * shortcut: case_attempts is readable only by its owner (0008), so "questions
 * minus the ones I've answered" can't be a server-side anti-join — the rows the
 * subquery would need to see are exactly the rows RLS hides from everyone else.
 * Joining the two sets here keeps it at one round trip and keeps the privacy
 * property intact, and the by-specialty breakdown falls out of the same join
 * for free rather than costing a third query.
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
      .select(QUESTION_SELECT)
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

  const rows = ((questionsRes.data ?? []) as unknown as QuestionRow[]).filter(
    (r) => r.subject_case !== null,
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  const attemptById = new Map(attempts.map((a) => [a.question_id, a.is_correct]));

  const practise = rows.filter((r) => !attemptById.has(r.id)).map(toPractise);

  const missed = attempts
    .filter((a) => !a.is_correct)
    .map((a) => byId.get(a.question_id))
    .filter((r): r is QuestionRow => r !== undefined)
    .map(toPractise);

  // Only specialties the viewer has actually answered in — a table listing
  // every specialty on the platform with 0/0 against it is noise, not a record.
  const specialties = new Map<string, SpecialtyRecord>();
  for (const a of attempts) {
    const specialty = byId.get(a.question_id)?.subject_case?.specialty;
    if (!specialty) continue;
    const row = specialties.get(specialty) ?? {
      specialty,
      attempted: 0,
      matched: 0,
    };
    row.attempted += 1;
    if (a.is_correct) row.matched += 1;
    specialties.set(specialty, row);
  }

  return {
    practise,
    missed,
    attempted: attempts.length,
    correct: attempts.filter((a) => a.is_correct).length,
    bySpecialty: [...specialties.values()].sort(
      (a, b) => b.attempted - a.attempted,
    ),
  };
}

export type QuizItem = {
  question: CaseQuestionView;
  distribution: AnswerDistribution;
  caseTitle: string;
  caseNumber: string | null;
  specialty: string | null;
};

/**
 * A short run of unanswered questions (spec §14).
 *
 * Capped, and deliberately short. The value is a clinician doing five cases
 * between patients, not an endless bank that turns into a chore — and the cap
 * also bounds the distribution fan-out below, which is one RPC per question.
 * Those go out together, so the whole quiz is two round trips, not 2 + N.
 *
 * `is_correct` is absent from the option select for the same reason it is
 * everywhere else: the app's database role cannot read it, and an answer key
 * in the page would defeat the entire exercise. Grading stays with
 * submit_case_answer.
 */
export async function getQuizItems(
  supabase: Client,
  viewerId: string,
  limit = 5,
): Promise<QuizItem[] | null> {
  const data = await getLearnData(supabase, viewerId);
  if (data === null) return null;

  const chosen = data.practise.slice(0, limit);
  if (chosen.length === 0) return [];

  const { data: questionRows, error } = await supabase
    .from("case_questions")
    .select("id,prompt,allow_change,case_options(id,body,position)")
    .in(
      "id",
      chosen.map((c) => c.questionId),
    );

  if (error) return null;

  const rows = (questionRows ?? []) as unknown as {
    id: string;
    prompt: string;
    allow_change: boolean;
    case_options: { id: string; body: string; position: number }[] | null;
  }[];
  const byId = new Map(rows.map((r) => [r.id, r]));

  const distributions = await Promise.all(
    chosen.map((c) =>
      supabase.rpc("case_answer_distribution", { p_question_id: c.questionId }),
    ),
  );

  const items: QuizItem[] = [];
  chosen.forEach((c, i) => {
    const row = byId.get(c.questionId);
    // A question with no options is unanswerable; skip it rather than
    // rendering a prompt with nothing under it.
    if (!row || !row.case_options?.length) return;

    const votes: Record<string, number> = {};
    let total = 0;
    for (const d of (distributions[i].data ?? []) as {
      option_id: string;
      votes: number | string;
    }[]) {
      const n = Number(d.votes) || 0;
      votes[d.option_id] = n;
      total += n;
    }

    items.push({
      question: {
        id: row.id,
        prompt: row.prompt,
        allow_change: row.allow_change,
        options: [...row.case_options].sort((a, b) => a.position - b.position),
      },
      distribution: { votes, total },
      caseTitle: c.caseTitle,
      caseNumber: c.caseNumber,
      specialty: c.specialty,
    });
  });

  return items;
}
