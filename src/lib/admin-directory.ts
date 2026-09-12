import type { SupabaseClient } from "@supabase/supabase-js";
import type { BadgeTier, Database, ModerationStatus, VerificationStatus } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export type DirectoryUser = {
  id: string;
  handle: string | null;
  full_name: string | null;
  role: string | null;
  specialty: string | null;
  verified: boolean;
  verification_status: VerificationStatus;
  badge_tier: BadgeTier | null;
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
      "id, handle, full_name, role, specialty, verified, verification_status, badge_tier, " +
        "is_admin, suspended_at, created_at, license_document_path",
    )
    // A null handle means onboarding was never finished (OnboardingForm is
    // the only thing that sets it) — someone who created an account and
    // walked away mid-signup, not an actual member. Excluded here rather
    // than just hidden in the UI so getTotalUserCount's "members total"
    // figure matches what this list actually shows.
    .not("handle", "is", null)
    // Deleted accounts get their own tab (getDeletedUsers) — a member
    // inside their 30-day restore window shouldn't also clutter the
    // ordinary directory as if nothing happened.
    .is("deleted_at", null)
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

/**
 * The true member count, independent of searchAllUsers' own 50-row display
 * cap — an admin scanning the directory has no other way to tell "50 rows
 * because that's everyone" from "50 rows because that's the cap."
 */
export async function getTotalUserCount(supabase: Client): Promise<number | null> {
  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .not("handle", "is", null)
    .is("deleted_at", null);
  return error ? null : (count ?? 0);
}

export type DeletedUser = {
  id: string;
  handle: string | null;
  full_name: string | null;
  license_number: string | null;
  license_document_path: string | null;
  deleted_at: string;
};

/**
 * The account-deletion review queue — everyone inside their 30-day restore
 * window (deleteAccountAction, src/app/actions/account.ts), oldest deletion
 * first: the ones nearest the daily purge cron
 * (src/app/api/cron/purge-deleted-accounts) are the ones worth an admin's
 * attention first. Distinct from searchAllUsers, which now excludes these —
 * a deleted account isn't a member to suspend or badge, it's one to review
 * or restore.
 */
export async function getDeletedUsers(supabase: Client): Promise<DeletedUser[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id, handle, full_name, license_number, license_document_path, deleted_at")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: true });

  return (data ?? []) as unknown as DeletedUser[];
}

/** A deleted account's own posts, for the same admin review — title/type/
 *  date only, no author embed needed since the caller already knows who. */
export async function getUserPosts(
  supabase: Client,
  authorId: string,
): Promise<Pick<DirectoryCase, "id" | "title" | "case_number" | "case_type" | "created_at">[]> {
  const { data } = await supabase
    .from("cases")
    .select("id, title, case_number, case_type, created_at")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });

  return data ?? [];
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
