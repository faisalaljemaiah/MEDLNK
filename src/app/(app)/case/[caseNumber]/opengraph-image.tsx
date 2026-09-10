import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { getCaseCardData } from "@/lib/case-card-data";
import { CaseCardImage, CASE_CARD_SIZE } from "@/lib/case-card-image";
import { FallbackCardImage } from "@/lib/profile-card-image";

export const alt = "Asyashare case";
export const size = CASE_CARD_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ caseNumber: string }>;
}) {
  const { caseNumber } = await params;
  const supabase = await createClient();
  const data = await getCaseCardData(supabase, caseNumber);

  return new ImageResponse(data ? <CaseCardImage data={data} /> : <FallbackCardImage />, size);
}
