// Edge Function: flags likely patient identifiers in a case draft before it
// posts. Called from the compose Server Action (never from the browser).
// Always returns 200 with { flagged: false } on any internal failure — a
// broken/slow AI call must never block someone from posting a real case.
import { callClaude, extractJsonObject } from "../_shared/anthropic.ts";

const SYSTEM_PROMPT = `You screen clinical case write-ups for accidental patient-identifying details before they're posted publicly: full names, MRNs/record numbers, exact birthdates, room/bed numbers, or unusually specific dates/details that could re-identify a real patient. General clinical details (age range, diagnosis, drug names, dosages) are fine and expected.

Respond with ONLY a JSON object, no other text: {"flagged": boolean, "reason": string}. "reason" is one short, specific sentence naming what looks identifying, or an empty string if nothing is flagged.`;

Deno.serve(async (req) => {
  const jsonHeaders = { "content-type": "application/json" };

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ flagged: false, message: "" }),
        { headers: jsonHeaders },
      );
    }

    const raw = await callClaude(SYSTEM_PROMPT, text, 200);
    const parsed = extractJsonObject(raw) as { flagged?: boolean; reason?: string };

    return new Response(
      JSON.stringify({
        flagged: Boolean(parsed.flagged),
        message:
          parsed.reason ||
          "This case may contain a patient identifier — please double-check before posting.",
      }),
      { headers: jsonHeaders },
    );
  } catch (err) {
    console.error("scan-identifiers failed:", err);
    return new Response(JSON.stringify({ flagged: false, message: "" }), {
      headers: jsonHeaders,
    });
  }
});
