import type { SupabaseClient } from "@supabase/supabase-js";
import type { CaseComparison, Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export type ComparedCase = {
  id: string;
  case_number: string | null;
  title: string;
  short_caption: string;
  specialty: string | null;
};

export type CaseComparisonView = CaseComparison & {
  left: ComparedCase | null;
  right: ComparedCase | null;
};

const SIDE = "id,case_number,title,short_caption,specialty";

/**
 * The two cases a `case_vs_case` post compares, in one round trip.
 *
 * Either side can come back null even when the row exists: the sides are
 * references, and cases' own RLS decides whether this reader may see them, so a
 * moderator-removed case drops out here rather than leaking through the
 * comparison. The UI renders that side as unavailable instead of pretending the
 * post is malformed.
 *
 * Returns undefined for "no comparison on this case" and null for "the read
 * failed" — 0016 has to be applied by hand on the hosted project, and a
 * case_vs_case post with a missing table should say so rather than silently
 * rendering as an ordinary case.
 */
export async function getCaseComparison(
  supabase: Client,
  caseId: string,
): Promise<CaseComparisonView | null | undefined> {
  const { data, error } = await supabase
    .from("case_comparisons")
    .select(
      `*,left:cases!case_comparisons_left_case_id_fkey(${SIDE}),right:cases!case_comparisons_right_case_id_fkey(${SIDE})`,
    )
    .eq("case_id", caseId)
    .maybeSingle();

  if (error) return null;
  if (!data) return undefined;
  return data as unknown as CaseComparisonView;
}

/** Resolves the case numbers an author typed into ids, for the composer. */
export async function resolveCaseNumbers(
  supabase: Client,
  numbers: string[],
): Promise<Map<string, string>> {
  const cleaned = numbers.map((n) => n.trim().toUpperCase()).filter(Boolean);
  if (cleaned.length === 0) return new Map();

  const { data } = await supabase
    .from("cases")
    .select("id,case_number")
    .in("case_number", cleaned);

  return new Map(
    ((data ?? []) as { id: string; case_number: string | null }[])
      .filter((c) => c.case_number)
      .map((c) => [c.case_number!.toUpperCase(), c.id]),
  );
}
