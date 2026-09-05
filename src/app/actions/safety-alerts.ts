"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUsers } from "@/lib/web-push";

/**
 * Marks a safety alert as seen, which takes it off this reader's banner.
 *
 * Void-returning so it can be a plain `<form action>`. RLS restricts the insert
 * to the caller's own row. Revalidates at "layout" scope because the banner
 * renders above the feed on every page, not just the one dismissed from.
 */
export async function acknowledgeSafetyAlertAction(caseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Ignores a duplicate rather than erroring: two taps on a slow connection is
  // a double-acknowledgement, not a problem to report.
  await supabase
    .from("safety_alert_acks")
    .upsert(
      { case_id: caseId, user_id: user.id },
      { onConflict: "case_id,user_id", ignoreDuplicates: true },
    );

  revalidatePath("/", "layout");
}

/**
 * Broadcasts a safety alert to the platform.
 *
 * Best-effort and deliberately not awaited for its result by the composer: the
 * post is the thing that matters and a fan-out failure must not lose it. The
 * function itself refuses to fire for anything that isn't a safety alert, and
 * only for its own author, so this needs no checks of its own.
 */
export async function broadcastSafetyAlertAction(caseId: string) {
  const supabase = await createClient();
  try {
    const { data: recipientIds } = await supabase.rpc("fan_out_safety_alert", {
      p_case_id: caseId,
    });
    if (recipientIds && recipientIds.length > 0) {
      const { data: caseRow } = await supabase
        .from("cases")
        .select("case_number,title")
        .eq("id", caseId)
        .single();
      await sendPushToUsers(supabase, recipientIds, {
        title: "Safety alert",
        body: caseRow?.title || "A new safety alert was posted",
        url: caseRow?.case_number ? `/case/${caseRow.case_number}` : "/notifications",
      });
    }
  } catch {
    // The alert is posted; the broadcast can be re-fired.
  }
}
