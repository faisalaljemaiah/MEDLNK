"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** The author's write-up, released only once an attempt exists. */
export type QuestionReveal = {
  explanation: string | null;
  reasoning: string | null;
  evidence: string | null;
};

export type AnswerResult =
  | { error: string }
  | { ok: true; isCorrect: boolean; reveal: QuestionReveal };

/**
 * Records the viewer's answer, then returns the result and the author's
 * write-up together.
 *
 * The reveal travels back in the action's response rather than being handed to
 * the page up front: anything a Server Component passes to a Client Component
 * is serialised into the payload the browser receives, so shipping the
 * explanation "hidden behind a flag" would put it in view-source for anyone
 * who hadn't answered yet. Fetching it here means it only ever crosses the wire
 * after an attempt is recorded.
 *
 * Correctness is decided by the submit_case_answer RPC, not here: `is_correct`
 * is not readable by the app's database role at all.
 */
export async function submitAnswerAction(
  questionId: string,
  optionId: string,
  path: string,
): Promise<AnswerResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sign in to answer." };

  const { data, error } = await supabase.rpc("submit_case_answer", {
    p_question_id: questionId,
    p_option_id: optionId,
  });

  if (error) {
    if (error.code === "42501") {
      return { error: "Only verified members can answer cases." };
    }
    return { error: error.message };
  }

  const { data: reveal } = await supabase
    .from("case_questions")
    .select("explanation, reasoning, evidence")
    .eq("id", questionId)
    .maybeSingle();

  revalidatePath(path);
  return {
    ok: true,
    isCorrect: Boolean(data),
    reveal: {
      explanation: reveal?.explanation ?? null,
      reasoning: reveal?.reasoning ?? null,
      evidence: reveal?.evidence ?? null,
    },
  };
}

/**
 * The same write-up, for a reader who already answered and is coming back to
 * the page. Returns null when there is no attempt, so a page render can never
 * be the thing that leaks it.
 */
export async function getRevealIfAnswered(
  questionId: string,
  viewerId: string | null,
): Promise<QuestionReveal | null> {
  if (!viewerId) return null;

  const supabase = await createClient();
  const { data: attempt } = await supabase
    .from("case_attempts")
    .select("id")
    .eq("question_id", questionId)
    .eq("user_id", viewerId)
    .maybeSingle();

  if (!attempt) return null;

  const { data } = await supabase
    .from("case_questions")
    .select("explanation, reasoning, evidence")
    .eq("id", questionId)
    .maybeSingle();

  return {
    explanation: data?.explanation ?? null,
    reasoning: data?.reasoning ?? null,
    evidence: data?.evidence ?? null,
  };
}

export type FollowResult = { error: string } | { ok: true; following: boolean };

export async function toggleFollowCaseAction(
  caseId: string,
  path: string,
): Promise<FollowResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sign in to follow cases." };

  const { data: existing } = await supabase
    .from("case_followers")
    .select("case_id")
    .eq("case_id", caseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("case_followers")
      .delete()
      .eq("case_id", caseId)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidatePath(path);
    return { ok: true, following: false };
  }

  const { error } = await supabase
    .from("case_followers")
    .insert({ case_id: caseId, user_id: user.id });
  if (error) return { error: error.message };

  revalidatePath(path);
  return { ok: true, following: true };
}

export type UpdateResult = { error: string } | { ok: true };

/**
 * Publishes a new stage on a case and notifies its followers.
 *
 * RLS already restricts inserts to the case's author, so this doesn't
 * re-check ownership — the database is the authority. The fan-out is
 * best-effort: a notification failure must not lose the author's update, which
 * is the part that actually matters.
 */
export async function publishCaseUpdateAction(
  caseId: string,
  formData: FormData,
  path: string,
): Promise<UpdateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sign in to post an update." };

  const stage = String(formData.get("stage") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!stage || !body) {
    return { error: "Both a stage label and an update are required." };
  }

  const { count } = await supabase
    .from("case_updates")
    .select("*", { count: "exact", head: true })
    .eq("case_id", caseId);

  const { error } = await supabase.from("case_updates").insert({
    case_id: caseId,
    author_id: user.id,
    stage,
    body,
    position: count ?? 0,
  });

  if (error) {
    if (error.code === "42501") {
      return { error: "Only the case author can post updates." };
    }
    return { error: error.message };
  }

  try {
    await supabase.rpc("fan_out_case_update", {
      p_case_id: caseId,
      p_type: "case_update",
      p_body: `New update on a case you follow: ${stage}`,
    });
  } catch {
    // Update is saved; notifying followers is not worth failing the write for.
  }

  revalidatePath(path);
  return { ok: true };
}
