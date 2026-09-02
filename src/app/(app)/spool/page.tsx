import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { getFeedCases } from "@/lib/cases";
import { isVideoUrl } from "@/lib/media";
import { ReelView } from "@/components/reel-view";

export default async function SpoolPage() {
  const supabase = await createClient();
  const user = await getViewer();

  const allCases = await getFeedCases(supabase, user?.id ?? null);
  // Spool is video-only — a photo or text case has no footage to fill (or
  // spin) the circle with.
  const videoCases = allCases.filter(
    (c) => c.media_url && isVideoUrl(c.media_url),
  );

  return <ReelView cases={videoCases} path="/spool" />;
}
