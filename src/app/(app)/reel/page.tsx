import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { getFeedCases } from "@/lib/cases";
import { ReelView } from "@/components/reel-view";

export default async function ReelPage() {
  const supabase = await createClient();
  const user = await getViewer();

  const cases = await getFeedCases(supabase, user?.id ?? null);

  return <ReelView cases={cases} path="/reel" />;
}
