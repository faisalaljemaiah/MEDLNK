"use server";

import { createClient } from "@/lib/supabase/server";

export type IdentifierScanResult = { flagged: boolean; message: string };

/**
 * Calls the `scan-identifiers` Edge Function (server-to-server; the
 * Anthropic key never reaches the browser). Always resolves — if the
 * function is unreachable or errors, we treat the case as unflagged rather
 * than blocking the author from posting. Privacy review is a nudge, not a
 * hard gate, precisely so an AI outage can't stop someone from sharing a
 * real clinical lesson.
 */
export async function scanForIdentifiersAction(
  text: string,
): Promise<IdentifierScanResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.functions.invoke<{
      flagged: boolean;
      message: string;
    }>("scan-identifiers", { body: { text } });

    if (error || !data) return { flagged: false, message: "" };
    return { flagged: Boolean(data.flagged), message: data.message ?? "" };
  } catch {
    return { flagged: false, message: "" };
  }
}

/**
 * Fires the `generate-recap` Edge Function after a case is inserted. Best
 * effort and cached (the function writes to ai_recaps once) — never blocks
 * or fails case creation if AI is down.
 */
export async function triggerRecapAction(caseId: string): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.functions.invoke("generate-recap", {
      body: { case_id: caseId },
    });
  } catch {
    // Non-critical — the recap can be (re)generated later.
  }
}
