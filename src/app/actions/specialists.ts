"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { scanForIdentifiersAction } from "@/app/actions/ai";

export type SpecialistResult =
  | { error: string }
  | { warning: string }
  | { ok: true };

const MAX_TEXT = 4000;

/**
 * Routes a question on a case to a specialty.
 *
 * Open to any verified member, not only the case author — the question is
 * often the reader's. The one-per-specialty-per-case unique index is what keeps
 * that from becoming five queued cardiology asks on the same case; the second
 * person to want one sees the first.
 *
 * The fan-out is best-effort. A notification failure must not lose the
 * question, which is the part that matters.
 */
export async function askSpecialistAction(
  caseId: string,
  path: string,
  formData: FormData,
): Promise<SpecialistResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sign in to ask a specialist." };

  const specialty = String(formData.get("specialty") ?? "").trim();
  const question = String(formData.get("question") ?? "").trim();
  const acknowledgeWarning = formData.get("acknowledge_warning") === "true";

  if (!specialty) return { error: "Which specialty should see this?" };
  if (!question) return { error: "What do you want to ask them?" };
  if (question.length > MAX_TEXT) {
    return { error: `Questions are capped at ${MAX_TEXT} characters.` };
  }

  if (!acknowledgeWarning) {
    const scan = await scanForIdentifiersAction(question);
    if (scan.flagged) return { warning: scan.message };
  }

  const { data, error } = await supabase
    .from("specialist_requests")
    .insert({
      case_id: caseId,
      requester_id: user.id,
      specialty,
      question,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return {
        error: `Someone has already asked ${specialty} about this case.`,
      };
    }
    if (error.code === "42501") {
      return {
        error:
          "Only verified members can ask a specialist — finish verification first.",
      };
    }
    if (error.code === "42P01") {
      return {
        error:
          "Ask a Specialist needs a database update that hasn't been applied " +
          "yet (migration 0012).",
      };
    }
    return { error: error.message };
  }

  if (data?.id) {
    try {
      await supabase.rpc("fan_out_specialist_request", {
        p_request_id: data.id,
      });
    } catch {
      // Question is saved; telling the specialty is not worth failing it for.
    }
  }

  revalidatePath(path);
  return { ok: true };
}

/**
 * Answers a specialist request.
 *
 * There is no check here that the responder is in the right specialty: the
 * insert policy in 0012 enforces it, and it has to, because the badge next to
 * this answer claims a specialty. A UI-side check would only mean "this person
 * was shown the form".
 */
export async function answerSpecialistAction(
  requestId: string,
  path: string,
  formData: FormData,
): Promise<SpecialistResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sign in to answer." };

  const body = String(formData.get("body") ?? "").trim();
  const acknowledgeWarning = formData.get("acknowledge_warning") === "true";

  if (!body) return { error: "Write your answer first." };
  if (body.length > MAX_TEXT) {
    return { error: `Answers are capped at ${MAX_TEXT} characters.` };
  }

  if (!acknowledgeWarning) {
    const scan = await scanForIdentifiersAction(body);
    if (scan.flagged) return { warning: scan.message };
  }

  const { error } = await supabase.from("specialist_answers").insert({
    request_id: requestId,
    responder_id: user.id,
    body,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "You've already answered this one." };
    }
    if (error.code === "42501") {
      return {
        error:
          "Only verified clinicians in this specialty can answer. Check the " +
          "specialty on your profile matches.",
      };
    }
    return { error: error.message };
  }

  // No status transition here on purpose. The answerer isn't the requester, so
  // an update would no-op under RLS and leave the status lying. A request stays
  // open until the person who asked closes it; "has answers" is read from the
  // answers themselves.
  try {
    await supabase.rpc("fan_out_specialist_answer", {
      p_request_id: requestId,
    });
  } catch {
    // Answer is saved; the notification is not worth failing it for.
  }

  revalidatePath(path);
  return { ok: true };
}

/** RLS restricts this to the person who asked, so it doesn't re-check. */
export async function closeSpecialistRequestAction(
  requestId: string,
  path: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("specialist_requests")
    .update({ status: "closed" })
    .eq("id", requestId);

  revalidatePath(path);
}
