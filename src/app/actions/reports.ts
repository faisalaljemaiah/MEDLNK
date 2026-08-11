"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ReportReason } from "@/lib/database.types";

export type ReportResult = { error: string } | { ok: true };

/**
 * Files a report against a case.
 *
 * Not gated on verification: a patient-privacy breach should be reportable by
 * anyone who can see it, including a member still waiting on approval. RLS
 * enforces that you can only file as yourself.
 */
export async function reportCaseAction(
  caseId: string,
  formData: FormData,
): Promise<ReportResult> {
  return fileReport({ case_id: caseId }, formData);
}

/**
 * Files a report against a reply.
 *
 * A reply is user-authored clinical text like a case is, so it can carry a
 * patient identifier just as easily. Same table, same single-target check, same
 * "one open report per person per target" index — only the column differs.
 */
export async function reportCommentAction(
  commentId: string,
  formData: FormData,
): Promise<ReportResult> {
  return fileReport({ comment_id: commentId }, formData);
}

async function fileReport(
  target: { case_id: string } | { comment_id: string },
  formData: FormData,
): Promise<ReportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sign in to report content." };

  const reason = String(formData.get("reason") ?? "") as ReportReason;
  const details = String(formData.get("details") ?? "").trim();

  if (!reason) return { error: "Choose a reason." };

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    ...target,
    reason,
    details: details || null,
  });

  if (error) {
    // 23505 = unique_violation: the partial index allows one *open* report per
    // person per target. Say so plainly rather than surfacing a constraint name.
    if (error.code === "23505") {
      return { error: "You've already reported this — we're looking at it." };
    }
    if (error.code === "42P01") {
      return { error: "Reporting isn't switched on yet. Tell an admin." };
    }
    return { error: error.message };
  }

  return { ok: true };
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) return null;
  return { supabase, userId: user.id };
}

/**
 * Resolves a report, optionally removing the content it points at, and writes
 * an audit row.
 *
 * RLS is the real authority — every statement here would fail for a non-admin
 * anyway — but bailing early gives a clear message instead of a silent no-op.
 */
export async function resolveReportAction(
  reportId: string,
  formData: FormData,
): Promise<ReportResult> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admins only." };
  const { supabase, userId } = admin;

  const note = String(formData.get("note") ?? "").trim();

  // Narrowed against the allowed set rather than cast: the value arrives from a
  // form, and the database check constraint would reject anything else anyway.
  const DECISIONS = ["reviewed", "approved", "removed", "escalated"] as const;
  type Decision = (typeof DECISIONS)[number];
  const raw = String(formData.get("decision") ?? "");
  const decision = DECISIONS.find((d) => d === raw) as Decision | undefined;
  if (!decision) return { error: "Unknown decision." };

  const { data: report } = await supabase
    .from("reports")
    .select("id, case_id")
    .eq("id", reportId)
    .maybeSingle();

  if (!report) return { error: "That report no longer exists." };

  // Take the content down first: if the status update fails afterwards the
  // report stays in the queue, which is the safe way round. Doing it the other
  // way could mark a report resolved while the content is still live.
  if (decision === "removed" && report.case_id) {
    const { error: removeError } = await supabase
      .from("cases")
      .update({ moderation_status: "removed" })
      .eq("id", report.case_id);
    if (removeError) return { error: removeError.message };

    await supabase.from("moderation_events").insert({
      actor_id: userId,
      action: "case_removed",
      target_kind: "case",
      target_id: report.case_id,
      note: note || null,
    });
  }

  // Reversing an earlier takedown when a report is resolved in the content's
  // favour — otherwise "content kept" would leave it invisible.
  if (decision === "approved" && report.case_id) {
    await supabase
      .from("cases")
      .update({ moderation_status: "visible" })
      .eq("id", report.case_id);
  }

  const { error } = await supabase
    .from("reports")
    .update({
      status: decision,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      reviewer_note: note || null,
    })
    .eq("id", reportId);

  if (error) return { error: error.message };

  await supabase.from("moderation_events").insert({
    actor_id: userId,
    action: `report_${decision}`,
    target_kind: "report",
    target_id: reportId,
    note: note || null,
  });

  revalidatePath("/admin");
  return { ok: true };
}

export async function setSuspensionAction(
  profileId: string,
  suspend: boolean,
  reason?: string,
): Promise<ReportResult> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admins only." };
  const { supabase, userId } = admin;

  const { error } = await supabase
    .from("profiles")
    .update({
      suspended_at: suspend ? new Date().toISOString() : null,
      suspended_reason: suspend ? (reason ?? null) : null,
    })
    .eq("id", profileId);

  if (error) return { error: error.message };

  await supabase.from("moderation_events").insert({
    actor_id: userId,
    action: suspend ? "user_suspended" : "user_unsuspended",
    target_kind: "profile",
    target_id: profileId,
    note: reason ?? null,
  });

  revalidatePath("/admin");
  return { ok: true };
}
