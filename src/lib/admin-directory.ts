import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ModerationStatus, VerificationStatus } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export type DirectoryUser = {
  id: string;
  handle: string | null;
  full_name: string | null;
  role: string | null;
  specialty: string | null;
  verified: boolean;
  verification_status: VerificationStatus;
  is_admin: boolean;
  suspended_at: string | null;
  created_at: string;
  /** Path within the private verification-docs bucket (0027), not a URL —
   *  the Users directory turns this into a signed URL itself, same as the
   *  Requests queue does, so a member's document stays reviewable long
   *  after they've already been approved, not just while pending. */
  license_document_path: string | null;
};

/**
 * The admin dashboard's user directory. Filters in JS over one bounded
 * fetch rather than a dynamic PostgREST `.or()` filter string — same
 * "filter in JS" convention as case search (`src/lib/cases.ts`), since
 * building that filter string from raw admin input would be
 * injection-adjacent for `.or()`'s comma/dot/paren mini-language.
 */
export async function searchAllUsers(
  supabase: Client,
  query: string,
  limit = 500,
): Promise<DirectoryUser[]> {
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, handle, full_name, role, specialty, verified, verification_status, " +
        "is_admin, suspended_at, created_at, license_document_path",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as unknown as DirectoryUser[];
  const q = query.trim().toLowerCase();
  if (!q) return rows.slice(0, 50);

  return rows
    .filter((u) => {
      const haystack = [u.full_name, u.handle, u.role, u.specialty]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, 50);
}

export type DirectoryCase = {
  id: string;
  title: string;
  case_number: string | null;
  case_type: string;
  moderation_status: ModerationStatus;
  created_at: string;
  author: { handle: string | null; full_name: string | null } | null;
};

/**
 * The admin dashboard's post directory — every case, not just reported
 * ones, so an admin can act on something that violates the rules before
 * anyone gets around to reporting it. RLS (`cases_select_visible`) already
 * lets an admin session see removed cases too, so this naturally includes
 * ones already taken down.
 */
export async function searchAllCases(
  supabase: Client,
  query: string,
  limit = 500,
): Promise<DirectoryCase[]> {
  const { data } = await supabase
    .from("cases")
    .select(
      "id, title, case_number, case_type, moderation_status, created_at," +
        "author:profiles!cases_author_id_fkey(handle,full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as unknown as DirectoryCase[];
  const q = query.trim().toLowerCase();
  if (!q) return rows.slice(0, 50);

  return rows
    .filter((c) => {
      const haystack = [
        c.title,
        c.case_number,
        c.author?.handle,
        c.author?.full_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, 50);
}
