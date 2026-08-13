import type { SupabaseClient } from "@supabase/supabase-js";
import type { Case, Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export type LiveSafetyAlert = Pick<
  Case,
  "id" | "case_number" | "title" | "short_caption" | "created_at"
>;

/**
 * How long an alert keeps interrupting people who haven't acknowledged it.
 *
 * An alert that never expires becomes wallpaper, and wallpaper is how the next
 * one gets ignored too. Thirty days is long enough for someone back from leave
 * to still see it and short enough that the banner stays rare.
 */
const ALERT_WINDOW_DAYS = 30;

/**
 * Recent safety alerts this viewer hasn't acknowledged.
 *
 * Two queries in parallel rather than a server-side anti-join, for the same
 * reason /learn does it: safety_alert_acks is readable only by its owner, so
 * the rows the subquery would need are exactly the rows RLS hides.
 *
 * Signed-out readers get nothing — there is nobody to acknowledge as, and a
 * banner that can't be dismissed is worse than no banner. Returns [] rather
 * than null on failure: this renders above the feed on every page, and a
 * missing table must not put an error banner over the whole app.
 */
export async function getLiveSafetyAlerts(
  supabase: Client,
  viewerId: string | null,
): Promise<LiveSafetyAlert[]> {
  if (!viewerId) return [];

  const since = new Date(
    Date.now() - ALERT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [alertsRes, acksRes] = await Promise.all([
    supabase
      .from("cases")
      .select("id,case_number,title,short_caption,created_at")
      .eq("case_type", "safety_alert")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    supabase.from("safety_alert_acks").select("case_id").eq("user_id", viewerId),
  ]);

  if (alertsRes.error) return [];

  const acked = new Set(
    ((acksRes.data ?? []) as { case_id: string }[]).map((a) => a.case_id),
  );

  return ((alertsRes.data ?? []) as unknown as LiveSafetyAlert[]).filter(
    (a) => !acked.has(a.id),
  );
}
