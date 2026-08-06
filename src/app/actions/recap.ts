"use server";

import { createClient } from "@/lib/supabase/server";

export type SimilarCase = {
  id: string;
  title: string;
  case_number: string | null;
};

export type DiveDeepData = {
  recapSummary: string | null;
  similar: SimilarCase[];
};

/**
 * Similar cases: v1 just scores by shared specialty + overlapping tags.
 * Swap the scoring below for an embeddings similarity search later — the
 * return shape (SimilarCase[]) doesn't need to change.
 */
export async function getDiveDeepDataAction(
  caseId: string,
): Promise<DiveDeepData> {
  const supabase = await createClient();

  const [{ data: recap }, { data: current }] = await Promise.all([
    supabase
      .from("ai_recaps")
      .select("summary")
      .eq("case_id", caseId)
      .maybeSingle(),
    supabase
      .from("cases")
      .select("tags, specialty")
      .eq("id", caseId)
      .single(),
  ]);

  if (!current) {
    return { recapSummary: recap?.summary ?? null, similar: [] };
  }

  const { data: candidates } = await supabase
    .from("cases")
    .select("id, title, case_number, tags, specialty")
    .neq("id", caseId)
    .limit(50);

  const similar = (candidates ?? [])
    .map((c) => {
      const sharedTags = c.tags.filter((t) => current.tags.includes(t)).length;
      const sameSpecialty =
        current.specialty && c.specialty === current.specialty ? 1 : 0;
      return { ...c, score: sharedTags * 2 + sameSpecialty };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ id, title, case_number }) => ({ id, title, case_number }));

  return { recapSummary: recap?.summary ?? null, similar };
}
