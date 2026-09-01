import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { getCommunityBySlug } from "@/lib/communities";
import { countryName } from "@/lib/countries";
import { UsersIcon, GlobeIcon } from "@/components/icons";
import { CommunityMembershipControls } from "@/components/community-membership-controls";

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const user = await getViewer();

  const community = await getCommunityBySlug(supabase, slug, user?.id ?? null);
  if (!community) notFound();

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent-soft font-headline text-2xl text-accent">
          {community.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-headline text-xl text-text">{community.name}</h1>
          <p className="flex items-center gap-1 font-label text-xs text-muted">
            <GlobeIcon width={12} height={12} strokeWidth={2.25} />
            {community.scope === "global"
              ? "International community"
              : (countryName(community.country_code) ?? community.country_code)}
          </p>
        </div>
      </div>

      {community.description && (
        <p className="mt-4 text-sm leading-relaxed text-muted">{community.description}</p>
      )}

      <p className="mt-3 flex items-center gap-1.5 font-label text-xs text-muted">
        <UsersIcon width={13} height={13} strokeWidth={2.25} />
        {community.memberCount} {community.memberCount === 1 ? "member" : "members"}
      </p>

      <div className="mt-5">
        <CommunityMembershipControls community={community} path={`/communities/${slug}`} />
      </div>
    </div>
  );
}
