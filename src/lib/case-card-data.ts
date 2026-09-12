import type { SupabaseClient } from "@supabase/supabase-js";
import type { BadgeTier, CaseType, Database } from "@/lib/database.types";
import { caseTypeMeta } from "@/lib/case-types";

type Client = SupabaseClient<Database>;

type CaseCardAuthor = {
  full_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  verified: boolean;
  badge_tier: BadgeTier | null;
};

export type CaseCardData = {
  case_number: string;
  title: string;
  short_caption: string;
  typeBadge: string | null;
  author: CaseCardAuthor | null;
};

// database.types.ts is hand-written with no Relationships metadata for
// PostgREST to infer from (same reason src/lib/cases.ts casts through
// `unknown`), so the embedded author needs its shape asserted by hand here
// too.
type CaseCardRow = {
  case_number: string | null;
  title: string;
  short_caption: string;
  case_type: CaseType;
  moderation_status: string;
  author: CaseCardAuthor | null;
};

/**
 * Just enough to render the shareable case teaser (opengraph-image.tsx /
 * twitter-image.tsx, fetched whenever a case link is pasted or pushed
 * through the Share button) — not the full case body, which stays behind
 * the signed-out gate on the case page itself. A case with no case_number
 * yet (pre-0016 data, or one still being drafted) has no public URL to
 * share, so it returns null the same as one that doesn't exist. Removed
 * posts are excluded for the same reason a takedown hides them everywhere
 * else — a teaser is still a way to read the title and caption.
 */
export async function getCaseCardData(
  supabase: Client,
  caseNumber: string,
): Promise<CaseCardData | null> {
  const { data } = await supabase
    .from("cases")
    .select(
      "case_number,title,short_caption,case_type,moderation_status," +
        "author:profiles!cases_author_id_fkey(full_name,handle,avatar_url,verified,badge_tier)",
    )
    .eq("case_number", caseNumber)
    .maybeSingle();

  if (!data) return null;
  const row = data as unknown as CaseCardRow;

  if (!row.case_number || row.moderation_status === "removed") {
    return null;
  }

  return {
    case_number: row.case_number,
    title: row.title,
    short_caption: row.short_caption,
    typeBadge: caseTypeMeta(row.case_type).badge,
    author: row.author,
  };
}
