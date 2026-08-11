"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isCommentLabel } from "@/lib/comment-labels";
import { scanForIdentifiersAction } from "@/app/actions/ai";

export type CommentResult =
  | { error: string }
  | { warning: string }
  | { ok: true };

const MAX_BODY = 4000;

/**
 * Posts a reply to a case.
 *
 * The body goes through the identifier scan for the same reason a case does:
 * "the 68-year-old on ward 4 last Tuesday" is as identifying in a reply as it
 * is in a post, and the non-negotiable is that *every* text format is scanned,
 * not just the ones that look like clinical write-ups.
 *
 * Same warn-then-confirm shape as createCaseAction: the scan runs before the
 * insert and returns a warning the author must acknowledge, so a flagged
 * identifier is never written in the first place. Still a nudge and not a gate
 * — an unreachable Edge Function reports "not flagged", because an AI outage
 * must not be the reason a clinician can't reply.
 */
export async function addCommentAction(
  caseId: string,
  path: string,
  formData: FormData,
): Promise<CommentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sign in to reply." };

  const body = String(formData.get("body") ?? "").trim();
  const rawLabel = String(formData.get("label") ?? "");
  const acknowledgeWarning = formData.get("acknowledge_warning") === "true";

  if (!body) return { error: "Write something first." };
  if (body.length > MAX_BODY) {
    return { error: `Replies are capped at ${MAX_BODY} characters.` };
  }

  // An unrecognised label is dropped rather than rejected: the constraint would
  // refuse it anyway, and losing a considered reply over a stale picker value
  // is a worse outcome than losing the badge.
  const label = isCommentLabel(rawLabel) ? rawLabel : null;

  if (!acknowledgeWarning) {
    const scan = await scanForIdentifiersAction(body);
    if (scan.flagged) return { warning: scan.message };
  }

  const { error } = await supabase.from("comments").insert({
    case_id: caseId,
    user_id: user.id,
    body,
    label,
  });

  if (error) {
    if (error.code === "42501") {
      return {
        error: "Only verified members can reply — finish verification first.",
      };
    }
    if (error.code === "42703") {
      return {
        error:
          "Replies need a database update that hasn't been applied yet " +
          "(migration 0011).",
      };
    }
    return { error: error.message };
  }

  revalidatePath(path);
  return { ok: true };
}

/**
 * Deletes a reply.
 *
 * Void-returning so it can be a plain `<form action>` in the server-rendered
 * thread — no client component for one button. RLS restricts deletes to the
 * comment's own author (comments_delete_own, 0004), so a delete aimed at
 * someone else's row removes nothing rather than needing a check here. On
 * failure the reply simply stays, which is the safe direction for a delete.
 */
export async function deleteCommentAction(commentId: string, path: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("comments").delete().eq("id", commentId);

  revalidatePath(path);
}
