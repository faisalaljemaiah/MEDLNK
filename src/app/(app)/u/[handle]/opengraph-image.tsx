import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { getProfileCardData } from "@/lib/profile";
import { ProfileCardImage, FallbackCardImage, PROFILE_CARD_SIZE } from "@/lib/profile-card-image";

export const alt = "Asyashare profile";
export const size = PROFILE_CARD_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const data = await getProfileCardData(supabase, handle);

  return new ImageResponse(data ? <ProfileCardImage data={data} /> : <FallbackCardImage />, size);
}
