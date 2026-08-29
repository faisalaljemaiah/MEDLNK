import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { isMissingTableError } from "@/lib/supabase/errors";

type Client = SupabaseClient<Database>;

/**
 * Every user ID mutually blocked with viewerId — either direction — so
 * feed/search filtering hides both sides from each other, not just the one
 * who placed the block. One extra query, same pattern as every other Home
 * helper in this codebase.
 *
 * Called from getFeedCases, i.e. every feed render — on a hosted project
 * that hasn't run 0029 yet, user_blocks doesn't exist, and that must not
 * take the whole feed down. Empty set = "no blocks", same as the honest
 * pre-migration state (mirrors getFeedCases' own `data ?? []`, which
 * likewise treats any read failure as "nothing" rather than surfacing it).
 */
export async function getBlockedPairIds(
  supabase: Client,
  viewerId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("user_blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`);

  if (error && !isMissingTableError(error)) {
    console.error("getBlockedPairIds:", error.message);
  }

  const ids = new Set<string>();
  for (const row of data ?? []) {
    ids.add(row.blocker_id === viewerId ? row.blocked_id : row.blocker_id);
  }
  return ids;
}

export type BlockedProfile = {
  id: string;
  handle: string;
  full_name: string;
};

/** For Settings' "Blocked accounts" list — only rows the viewer placed. */
export async function getBlockedByViewer(
  supabase: Client,
  viewerId: string,
): Promise<BlockedProfile[]> {
  const { data, error } = await supabase
    .from("user_blocks")
    .select("blocked:profiles!user_blocks_blocked_id_fkey(id,handle,full_name)")
    .eq("blocker_id", viewerId)
    .order("created_at", { ascending: false });

  if (error && !isMissingTableError(error)) {
    console.error("getBlockedByViewer:", error.message);
  }

  return ((data ?? []) as unknown as { blocked: BlockedProfile | null }[])
    .map((row) => row.blocked)
    .filter((p): p is BlockedProfile => p !== null);
}
