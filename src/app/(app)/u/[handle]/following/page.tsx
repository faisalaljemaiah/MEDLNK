import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer, getViewerProfile } from "@/lib/auth";
import { getFollowList } from "@/lib/follows";
import { t } from "@/lib/i18n";
import { BackButton } from "@/components/back-button";
import { FollowList } from "@/components/follow-list";

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const [user, viewerProfile] = await Promise.all([
    getViewer(),
    getViewerProfile(),
  ]);
  const locale = viewerProfile?.locale ?? "en";

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, handle, is_admin")
    .eq("handle", handle)
    .maybeSingle();

  // Same rule as the profile page itself (src/app/(app)/u/[handle]/page.tsx):
  // an admin account has no public profile, so it has no public following
  // list either.
  if (!profile || profile.is_admin) notFound();

  const people = await getFollowList(supabase, profile.id, "following", user?.id ?? null);

  return (
    <div>
      <div className="flex items-center gap-2 px-2 pt-3">
        <BackButton />
        <h1 className="font-headline text-lg text-text">
          {t(locale, "profile.followingTitle")}
        </h1>
      </div>
      <FollowList
        people={people}
        viewerId={user?.id ?? null}
        emptyMessage={t(locale, "profile.emptyFollowingList")}
        path={`/u/${handle}/following`}
        locale={locale}
      />
    </div>
  );
}
