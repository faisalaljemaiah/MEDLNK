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

  return (
    <>
      {/* Fixed, full-viewport — paints behind the now-transparent header,
          sidebar and bottom nav too, not just the content column between
          them, so Spool reads as one solid black screen rather than a black
          strip framed by the rest of the app's light chrome. */}
      <div aria-hidden className="spool-backdrop fixed inset-0 -z-10" />
      <ReelView cases={videoCases} path="/spool" />
    </>
  );
}
