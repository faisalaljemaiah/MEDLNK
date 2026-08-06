import { createClient } from "@/lib/supabase/server";
import { getFeedCases } from "@/lib/cases";
import { FeedShell } from "@/components/feed-shell";

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cases = await getFeedCases(supabase, user?.id ?? null);

  return <FeedShell cases={cases} path="/" />;
}
