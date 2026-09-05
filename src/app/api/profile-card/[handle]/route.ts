import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { getProfileCardData } from "@/lib/profile";
import { ProfileCardImage, PROFILE_CARD_SIZE } from "@/lib/profile-card-image";

/**
 * The same card opengraph-image.tsx generates for a link preview, served as
 * a standalone endpoint the Share button can fetch as a Blob — so it can
 * hand the browser an actual image file to share or download, not just a
 * link. Plain `.ts`, not `.tsx`: ProfileCardImage is called as a function
 * rather than written as JSX here, since Next's `route` file convention only
 * documents `.js`/`.ts`.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;
  const supabase = await createClient();
  const data = await getProfileCardData(supabase, handle);

  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  return new ImageResponse(ProfileCardImage({ data }), PROFILE_CARD_SIZE);
}
