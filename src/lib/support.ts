import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SupportMessage } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export async function getSupportMessages(
  supabase: Client,
  includeResolved = false,
): Promise<SupportMessage[] | null> {
  let query = supabase
    .from("support_messages")
    .select("*")
    .order("created_at", { ascending: true });

  if (!includeResolved) query = query.eq("resolved", false);

  const { data, error } = await query;
  if (error) return null;

  return data ?? [];
}
