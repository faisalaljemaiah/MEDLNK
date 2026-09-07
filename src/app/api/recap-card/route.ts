import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { getViewer, getViewerProfile } from "@/lib/auth";
import { getUserRecap } from "@/lib/recap";
import { RecapCardImage, RECAP_CARD_SIZE } from "@/lib/recap-card-image";

/**
 * Unlike /api/profile-card/[handle], this always renders the *caller's own*
 * recap — following/reaction/specialty activity is personal, not something
 * anyone with a link should be able to pull up for someone else the way a
 * public profile card is.
 */
export async function GET() {
  const user = await getViewer();
  if (!user) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const [profile, recap] = await Promise.all([
    getViewerProfile(),
    getUserRecap(supabase, user.id),
  ]);

  const name = profile?.full_name || `@${profile?.handle ?? ""}`;

  return new ImageResponse(RecapCardImage({ recap, name }), RECAP_CARD_SIZE);
}
