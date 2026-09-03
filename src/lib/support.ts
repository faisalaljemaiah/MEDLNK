import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SupportMessage } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

/**
 * The typed name/email on a support message is whatever the sender typed —
 * it's the only identity a signed-out visitor can give. When they were
 * actually signed in, `reporter` is their real account, joined the same
 * way ReportWithContext joins reported_profile (src/lib/moderation.ts):
 * something an admin can trust and click through to, instead of just text
 * a form let anyone type.
 */
export type SupportMessageWithReporter = SupportMessage & {
  reporter: {
    id: string;
    handle: string | null;
    full_name: string | null;
    role: string | null;
    specialty: string | null;
    verification_status: string;
    is_admin: boolean;
    suspended_at: string | null;
  } | null;
};

export async function getSupportMessages(
  supabase: Client,
  includeResolved = false,
): Promise<SupportMessageWithReporter[] | null> {
  let query = supabase
    .from("support_messages")
    .select(
      "*," +
        "reporter:profiles!support_messages_reporter_id_fkey(id,handle,full_name,role,specialty,verification_status,is_admin,suspended_at)",
    )
    .order("created_at", { ascending: true });

  if (!includeResolved) query = query.eq("resolved", false);

  const { data, error } = await query;
  if (error) return null;

  return (data ?? []) as unknown as SupportMessageWithReporter[];
}
