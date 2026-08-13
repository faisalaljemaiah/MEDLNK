import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Notification } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export type NotificationActor = {
  handle: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export type NotificationView = Notification & {
  subject_case: { case_number: string | null; title: string } | null;
  actor: NotificationActor | null;
};

/**
 * Nothing here throws: 0008 has to be applied by hand on the hosted project,
 * and until it is the notifications table doesn't exist. A missing table must
 * not take the header down on every page.
 *
 * The list distinguishes the two cases, though. `null` means the read failed —
 * as it will pre-migration — while `[]` means a genuinely empty inbox. They
 * look identical on screen unless the caller separates them, and "feature looks
 * empty when it is actually unavailable" is a bug this codebase has already
 * shipped once.
 */

// Aliased to `subject_case` rather than `case`: the alias is only a JSON key,
// but naming it after a SQL keyword is a needless thing to debug remotely.
const NOTIFICATION_SELECT =
  "*," +
  "subject_case:cases!notifications_case_id_fkey(case_number,title)," +
  "actor:profiles!notifications_actor_id_fkey(handle,full_name,avatar_url)";

/** Newest first. Capped — the inbox is a recent-activity view, not an archive. */
export async function getNotifications(
  supabase: Client,
  viewerId: string,
  limit = 50,
): Promise<NotificationView[] | null> {
  const { data, error } = await supabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .eq("user_id", viewerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return null;
  return (data ?? []) as unknown as NotificationView[];
}

/**
 * Drives the header's unread dot, so it runs on every authenticated page.
 * `head: true` keeps it to a count on the partial index rather than a row
 * fetch, and the layout issues it alongside the profile query, not after it.
 */
export async function getUnreadNotificationCount(
  supabase: Client,
  viewerId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", viewerId)
    .is("read_at", null);

  if (error) return 0;
  return count ?? 0;
}
