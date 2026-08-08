import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileByHandle } from "@/lib/profile";
import { Avatar } from "@/components/avatar";
import { FollowButton } from "@/components/follow-button";
import { CaseCard } from "@/components/case-card";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const data = await getProfileByHandle(supabase, handle, user?.id ?? null);
  if (!data) notFound();

  const { profile, cases, followerCount, followingCount, viewerFollows, isOwnProfile } =
    data;
  const path = `/u/${handle}`;

  return (
    <div>
      <div className="flex items-start gap-4 px-4 py-6">
        <Avatar avatarUrl={profile.avatar_url} name={profile.full_name} size="lg" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-text">
            {profile.full_name || "(no name yet)"}
            {profile.verified && <span className="ml-1 text-positive">✓</span>}
          </p>
          <p className="font-label text-sm text-muted">
            @{profile.handle} {profile.role ? `· ${profile.role}` : ""}
          </p>
          {(profile.specialty || profile.city) && (
            <p className="mt-1 text-sm text-muted">
              {[profile.specialty, profile.city].filter(Boolean).join(" · ")}
            </p>
          )}
          <div className="mt-2 flex gap-4 text-sm text-muted">
            <span>
              <span className="font-medium text-text">{followerCount}</span>{" "}
              followers
            </span>
            <span>
              <span className="font-medium text-text">{followingCount}</span>{" "}
              following
            </span>
          </div>
        </div>

        {isOwnProfile ? (
          <Link
            href="/onboarding"
            className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-text"
          >
            Edit profile
          </Link>
        ) : user ? (
          <FollowButton
            followeeId={profile.id}
            initialFollowing={viewerFollows}
            path={path}
          />
        ) : null}
      </div>

      <div className="border-t border-line">
        {cases.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            No cases shared yet.
          </p>
        ) : (
          cases.map((c) => <CaseCard key={c.id} feedCase={c} path={path} />)
        )}
      </div>
    </div>
  );
}
