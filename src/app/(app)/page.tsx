import { createClient } from "@/lib/supabase/server";
import { getFeedCases } from "@/lib/cases";
import { FeedShell } from "@/components/feed-shell";

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cases = await getFeedCases(supabase, user?.id ?? null);

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("handle, full_name, avatar_url")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return <FeedShell cases={cases} path="/" profile={profile} />;
}
