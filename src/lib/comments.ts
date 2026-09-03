import type { SupabaseClient } from "@supabase/supabase-js";
import type { Comment, Database } from "@/lib/database.types";
import type { FeedAuthor } from "@/lib/cases";

type Client = SupabaseClient<Database>;

export type CommentView = Comment & {
  author: FeedAuthor | null;
};

/**
 * The thread under a case, oldest first — a clinical discussion reads as a
 * conversation, so the reply order is the order it happened in, not
 * newest-first like a feed.
 *
 * One round trip: the author comes down as an embed rather than as a second
 * query per commenter. Removed comments are filtered by RLS (0009), not here —
 * their authors and admins still see them, everyone else does not.
 *
 * Returns null when the read fails, so the case page can say "comments aren't
 * available" rather than showing an empty thread that looks like silence.
 */
export async function getCaseComments(
  supabase: Client,
  caseId: string,
): Promise<CommentView[] | null> {
  const { data, error } = await supabase
    .from("comments")
    .select(
      "*,author:profiles!comments_user_id_fkey(id,handle,full_name,role,verified,badge_tier,avatar_url)",
    )
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });

  if (error) return null;
  return (data ?? []) as unknown as CommentView[];
}
