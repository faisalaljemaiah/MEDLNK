import { createClient } from "@/lib/supabase/server";
import { getFeedCases } from "@/lib/cases";
import { ReelView } from "@/components/reel-view";

export default async function ReelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cases = await getFeedCases(supabase, user?.id ?? null);

  return <ReelView cases={cases} path="/reel" />;
}
