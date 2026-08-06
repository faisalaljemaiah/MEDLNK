// Shared helper for calling the Anthropic Messages API from Edge Functions.
// The API key never leaves the server — only Edge Functions read it via
// Deno.env, set as a Supabase secret (`supabase secrets set ANTHROPIC_API_KEY=...`).

// Cost note: Haiku is intentionally used here (not Sonnet/Opus) — these are
// short, cheap, high-frequency calls (one per case posted) where a fast/
// inexpensive model is the right tradeoff. Revisit if recap quality suffers.
const MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_VERSION = "2023-06-01";

export async function callClaude(
  system: string,
  userMessage: string,
  maxTokens = 300,
): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured on this project.");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("Unexpected Anthropic response shape.");
  }
  return text;
}

/** Claude sometimes wraps JSON in prose or code fences despite instructions — extract the object. */
export function extractJsonObject(raw: string): unknown {
  const match = raw.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : raw);
}
