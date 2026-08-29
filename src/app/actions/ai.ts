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

export type PolishedField = {
  field: string;
  before: string;
  after: string;
  /** True when the numbers in the text moved — see numericTokens below. */
  numbersChanged: boolean;
};

export type PolishResult =
  | { suggestions: PolishedField[]; message?: string }
  | { suggestions: []; message: string };

/**
 * Numbers are the most dangerous thing a copy edit can silently change in a
 * clinical case — a dose, a rate, an INR, a day count. The prompt forbids it,
 * but a prompt is not a guarantee, so we check: pull every numeric token out
 * of the before and after text and compare them as a multiset. Any difference
 * gets surfaced on that field in the review UI.
 */
function numericTokens(text: string): string[] {
  return (text.match(/\d+(?:[.,]\d+)?/g) ?? []).sort();
}

function numbersMoved(before: string, after: string): boolean {
  const a = numericTokens(before);
  const b = numericTokens(after);
  return a.length !== b.length || a.some((tok, i) => tok !== b[i]);
}

/**
 * Calls the `polish-text` Edge Function to copy-edit a draft. Returns only
 * the fields the model actually changed, each paired with the original so the
 * composer can show both and let the author decide. Nothing is applied here —
 * this action never writes.
 */
export async function polishDraftAction(
  fields: Record<string, string>,
): Promise<PolishResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.functions.invoke<{
      fields: Record<string, string>;
    }>("polish-text", { body: { fields } });

    if (error || !data?.fields) {
      return {
        suggestions: [],
        message:
          "Couldn't reach the writing assistant just now — your draft is untouched.",
      };
    }

    const suggestions: PolishedField[] = [];
    for (const [field, after] of Object.entries(data.fields)) {
      const before = fields[field];
      if (typeof before !== "string" || before === after) continue;
      suggestions.push({
        field,
        before,
        after,
        numbersChanged: numbersMoved(before, after),
      });
    }

    if (suggestions.length === 0) {
      return { suggestions: [], message: "Nothing to fix — this reads well." };
    }
    return { suggestions };
  } catch {
    return {
      suggestions: [],
      message:
        "Couldn't reach the writing assistant just now — your draft is untouched.",
    };
  }
}
