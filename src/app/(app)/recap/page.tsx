import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer, getViewerProfile } from "@/lib/auth";
import { getUserRecap } from "@/lib/recap";
import { RecapStory } from "@/components/recap-story";

export default async function RecapPage() {
  const user = await getViewer();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [profile, recap] = await Promise.all([
    getViewerProfile(),
    getUserRecap(supabase, user.id),
  ]);

  const name = profile?.full_name || `@${profile?.handle ?? ""}`;

  return <RecapStory recap={recap} name={name} />;
}
