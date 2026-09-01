"use server";

import { createClient } from "@/lib/supabase/server";
import { ANALYTICS_EVENT_TYPES, type AnalyticsEventType } from "@/lib/analytics-events";

/**
 * Fire-and-forget: never returns an error, and a failed write (RLS not yet
 * applied on a project still on an older migration, table missing, etc.)
 * degrades to nothing recorded rather than surfacing anywhere — tracking
 * must never be the thing that breaks the feature it's watching.
 */
export async function trackEventAction(
  eventType: AnalyticsEventType,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  if (!ANALYTICS_EVENT_TYPES.includes(eventType)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase
    .from("analytics_events")
    .insert({ event_type: eventType, user_id: user?.id ?? null, metadata });
}
