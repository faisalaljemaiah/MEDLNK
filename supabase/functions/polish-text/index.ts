// Edge Function: copy-edits a case draft — spelling, grammar, clarity — without
// changing what it says. Called from the compose Server Action (never from the
// browser, so the Anthropic key stays server-side).
//
// The output is a SUGGESTION. The compose form shows it side by side with the
// author's original and applies nothing until they accept it. That review step
// is the real safeguard here: this is clinical text, and no prompt can
// guarantee a model never rewrites a dose. See also the numeric-token check in
// src/app/actions/ai.ts, which flags a field whose numbers moved.
//
// Returns 200 with { fields: {} } on any internal failure — polishing is an
// optional assist and must never break the composer.
import { callClaude, extractJsonObject } from "../_shared/anthropic.ts";

const SYSTEM_PROMPT =
  `You are a copy editor for short clinical case write-ups by pharmacists and physicians. You fix how the text reads. You never change what it says.

Do:
- Correct spelling, grammar, punctuation and capitalisation.
- Improve clarity and flow: untangle run-on sentences, fix awkward word order, remove needless repetition.
- Keep the author's voice and register. Keep roughly the original length.
- Preserve line breaks exactly — where the input has separate lines, the output must have the same number of lines in the same order.

Never:
- Change clinical meaning, or the author's judgement, hedging or emphasis.
- Alter any drug name, dose, unit, route, frequency, lab value, time, date or number. Reproduce every one of them character for character.
- Expand or "correct" a clinical abbreviation, even if it looks wrong.
- Add information, examples, caveats or commentary that is not in the original.
- Remove any clinical detail, however minor.
- Add a preamble, explanation or note about your edits.

If a field is already clean, return it byte-identical. It is correct and expected for fields to come back unchanged.

You receive a JSON object of draft fields. Respond with ONLY a JSON object containing exactly the same keys, each mapped to its edited string. No other text.`;

Deno.serve(async (req) => {
  const jsonHeaders = { "content-type": "application/json" };

  try {
    const { fields } = await req.json();

    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      return new Response(JSON.stringify({ fields: {} }), {
        headers: jsonHeaders,
      });
    }

    // Only send fields that actually have text, so empty ones can't come back
    // populated with invented content.
    const input: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (typeof value === "string" && value.trim()) input[key] = value;
    }
    if (Object.keys(input).length === 0) {
      return new Response(JSON.stringify({ fields: {} }), {
        headers: jsonHeaders,
      });
    }

    const raw = await callClaude(
      SYSTEM_PROMPT,
      JSON.stringify(input, null, 2),
      2000,
    );
    const parsed = extractJsonObject(raw) as Record<string, unknown>;

    // Keep only keys we sent, and only string values — a hallucinated extra
    // key must never reach the form.
    const out: Record<string, string> = {};
    for (const key of Object.keys(input)) {
      const value = parsed?.[key];
      if (typeof value === "string" && value.trim()) out[key] = value;
    }

    return new Response(JSON.stringify({ fields: out }), {
      headers: jsonHeaders,
    });
  } catch (err) {
    console.error("polish-text failed:", err);
    return new Response(JSON.stringify({ fields: {} }), {
      headers: jsonHeaders,
    });
  }
});
