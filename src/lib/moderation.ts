import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Report } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export type ReportWithContext = Report & {
  reporter: { handle: string | null; full_name: string | null } | null;
  reported_case: {
    id: string;
    title: string;
    case_number: string | null;
    moderation_status: string;
    author_id: string;
  } | null;
  reported_profile: {
    id: string;
    handle: string | null;
    full_name: string | null;
  } | null;
};

/**
 * The moderation queue, oldest first — a privacy report that has sat for two
 * days matters more than one filed a minute ago, so this deliberately isn't
 * newest-first like the rest of the app.
 *
 * Returns null (not []) when the read fails, so the page can say "not switched
 * on yet" rather than "queue empty" — an empty moderation queue and a broken
 * one look identical otherwise, and that is the worst thing for this screen to
 * get wrong.
 */
export async function getReportQueue(
  supabase: Client,
  includeResolved = false,
): Promise<ReportWithContext[] | null> {
  let query = supabase
    .from("reports")
    .select(
      "*," +
        "reporter:profiles!reports_reporter_id_fkey(handle,full_name)," +
        "reported_case:cases!reports_case_id_fkey(id,title,case_number,moderation_status,author_id)," +
        "reported_profile:profiles!reports_reported_profile_id_fkey(id,handle,full_name)",
    )
    .order("created_at", { ascending: true });

  if (!includeResolved) query = query.eq("status", "pending");

  const { data, error } = await query;
  if (error) return null;

  return (data ?? []) as unknown as ReportWithContext[];
}

export type ModerationEventRow = {
  id: string;
  action: string;
  target_kind: string;
  target_id: string;
  note: string | null;
  created_at: string;
  actor: { handle: string | null; full_name: string | null } | null;
};

export async function getModerationLog(
  supabase: Client,
  limit = 25,
): Promise<ModerationEventRow[] | null> {
  const { data, error } = await supabase
    .from("moderation_events")
    .select(
      "id,action,target_kind,target_id,note,created_at," +
        "actor:profiles!moderation_events_actor_id_fkey(handle,full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return null;
  return (data ?? []) as unknown as ModerationEventRow[];
}
