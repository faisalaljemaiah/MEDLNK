"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setSuspensionAction } from "@/app/actions/reports";
import {
  sendVerificationApprovedEmail,
  sendVerificationRejectedEmail,
} from "@/lib/email";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");
  return { supabase, userId: user.id };
}

/** Every admin write here also shows up on `/u/[handle]` for the admin's
 *  own profile (the dashboard replaces the normal profile there), so both
 *  routes need revalidating — not just `/admin`. */
function revalidateAdminViews(handle: string | null) {
  revalidatePath("/admin");
  if (handle) revalidatePath(`/u/${handle}`);
}

/** Email lives in auth.users, not profiles, so notifying the applicant
 *  needs the service-role client regardless of which way the decision went.
 *  Failures here are swallowed — the moderation decision itself already
 *  landed by the time this runs, and a broken email provider must never
 *  turn into an admin-facing error for what looks like a normal approve
 *  or reject click. */
async function notifyApplicant(
  profileId: string,
  send: (email: string, name: string) => Promise<void>,
) {
  try {
    const admin = createAdminClient();
    const [{ data: authUser }, { data: profile }] = await Promise.all([
      admin.auth.admin.getUserById(profileId),
      admin.from("profiles").select("full_name").eq("id", profileId).single(),
    ]);
    const email = authUser?.user?.email;
    if (!email) return;
    await send(email, profile?.full_name ?? "there");
  } catch (error) {
    console.error("Failed to notify applicant of verification decision:", error);
  }
}

export async function approveUserAction(profileId: string, viewerHandle: string | null) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("profiles")
    .update({ verified: true, verification_status: "approved" })
    .eq("id", profileId);
  revalidateAdminViews(viewerHandle);
  await notifyApplicant(profileId, sendVerificationApprovedEmail);
}

export async function rejectUserAction(profileId: string, viewerHandle: string | null) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("profiles")
    .update({ verified: false, verification_status: "rejected" })
    .eq("id", profileId);
  revalidateAdminViews(viewerHandle);
  await notifyApplicant(profileId, sendVerificationRejectedEmail);
}

/**
 * Void-returning wrapper around `setSuspensionAction` for the Users
 * directory's plain suspend/unsuspend toggle — a bare `<form
 * action={...}>` with no client-side error display, same shape as every
 * other action on this page, unlike `setSuspensionAction`'s own
 * `ReportResult` return (kept for future callers that do want to show an
 * error).
 */
export async function toggleSuspensionAction(
  profileId: string,
  suspend: boolean,
  viewerHandle: string | null,
) {
  await setSuspensionAction(
    profileId,
    suspend,
    suspend ? "Suspended from the admin Users directory" : undefined,
    viewerHandle,
  );
}

/**
 * Takes a case down (soft — `moderation_status = 'removed'`, same
 * mechanism `resolveReportAction`'s "Remove content" decision uses), for
 * a post an admin finds directly rather than one that's been reported.
 * Reversible via `restoreCaseAction`, and logged the same way.
 */
// Void-returning, same as approveUserAction/rejectUserAction above — these
// are bare `<form action={...}>` toggles with no client-side error display,
// and RLS (cases_update_admin) is the real authority regardless.
export async function removeCaseAction(
  caseId: string,
  viewerHandle: string | null,
) {
  const { supabase, userId } = await requireAdmin();
  const { error } = await supabase
    .from("cases")
    .update({ moderation_status: "removed" })
    .eq("id", caseId);
  if (error) return;

  await supabase.from("moderation_events").insert({
    actor_id: userId,
    action: "case_removed",
    target_kind: "case",
    target_id: caseId,
    note: "Removed from the admin post directory",
  });
  revalidateAdminViews(viewerHandle);
}

export async function restoreCaseAction(
  caseId: string,
  viewerHandle: string | null,
) {
  const { supabase, userId } = await requireAdmin();
  const { error } = await supabase
    .from("cases")
    .update({ moderation_status: "visible" })
    .eq("id", caseId);
  if (error) return;

  await supabase.from("moderation_events").insert({
    actor_id: userId,
    action: "case_restored",
    target_kind: "case",
    target_id: caseId,
    note: "Restored from the admin post directory",
  });
  revalidateAdminViews(viewerHandle);
}
