// Edge Function: generates a 1-2 sentence clinical summary for a case and
// caches it in ai_recaps (service-role write — ai_recaps has no client-side
// insert/update policy on purpose, see supabase/migrations/0004_rls.sql).
// Called once, right after a case is inserted. Failing silently here just
// means the case shows "no AI recap yet" — never a broken post.
import { createClient } from "npm:@supabase/supabase-js@2";
import { callClaude, extractJsonObject } from "../_shared/anthropic.ts";

const SYSTEM_PROMPT = `You write a terse 1-2 sentence clinical summary of a pharmacy case report, for another clinician skimming a feed. Be specific and clinical, not generic. Respond with ONLY JSON, no other text: {"summary": string}.`;

type CaseBody = {
  presentation?: string;
  tricky?: string;
  actions?: string[];
  lesson?: string;
};

Deno.serve(async (req) => {
  const jsonHeaders = { "content-type": "application/json" };

  try {
    const { case_id } = await req.json();
    if (!case_id || typeof case_id !== "string") {
      return new Response(JSON.stringify({ ok: false }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: caseRow, error } = await supabase
      .from("cases")
      .select("title, short_caption, full_body")
      .eq("id", case_id)
      .single();

    if (error || !caseRow) {
      return new Response(JSON.stringify({ ok: false }), { headers: jsonHeaders });
    }

    const body = (caseRow.full_body ?? {}) as CaseBody;
    const caseText = [
      caseRow.title,
      caseRow.short_caption,
      body.presentation,
      body.tricky,
      ...(body.actions ?? []),
      body.lesson,
    ]
      .filter(Boolean)
      .join("\n");

    const raw = await callClaude(SYSTEM_PROMPT, caseText, 200);
    const parsed = extractJsonObject(raw) as { summary?: string };

    await supabase.from("ai_recaps").upsert({
      case_id,
      summary: parsed.summary ?? null,
      generated_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
  } catch (err) {
    console.error("generate-recap failed:", err);
    return new Response(JSON.stringify({ ok: false }), { headers: jsonHeaders });
  }
});
