import { notFound } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { getProfileByHandle } from "@/lib/profile";
import { Avatar } from "@/components/avatar";
import { SettingsIcon } from "@/components/icons";
import { FollowButton } from "@/components/follow-button";
import { CaseCard } from "@/components/case-card";
import { ProfileStats } from "@/components/profile-stats";
import { ReputationBadge } from "@/components/reputation-badge";
import { computeReputationTier } from "@/lib/reputation";
import { signOutAction } from "@/app/actions/auth";
import { startConversationAction } from "@/app/actions/messages";
import { AdminDashboard } from "@/components/admin-dashboard";

const TABS = [
  { key: "posts", label: "Posts" },
  // "Marked", not "Liked": 0010 replaced the bare like with the three
  // clinical-value reactions, and this tab collects all of them.
  { key: "marked", label: "Marked" },
  { key: "saved", label: "Saved" },
] as const;

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{
    tab?: string;
    resolved?: string;
    uq?: string;
    cq?: string;
  }>;
}) {
  const { handle } = await params;
  const { tab: rawTab, resolved, uq, cq } = await searchParams;
  const supabase = await createClient();
  const user = await getViewer();

  const data = await getProfileByHandle(supabase, handle, user?.id ?? null);
  if (!data) notFound();

  const {
    profile,
    cases,
    markedCases,
    savedCases,
    stats,
    followerCount,
    followingCount,
    viewerFollows,
    isOwnProfile,
  } = data;
  const path = `/u/${handle}`;

  // An admin's own profile becomes the moderation dashboard instead of the
  // normal social profile — the account still exists (Edit profile/Sign
  // out live on /settings now), but this page's real estate goes to
  // running the platform instead of a feed of their own cases.
  if (isOwnProfile && profile.is_admin) {
    return (
      <AdminDashboard
        tab={rawTab}
        resolved={resolved === "1"}
        userQuery={uq}
        caseQuery={cq}
        basePath={path}
        viewerHandle={profile.handle}
      />
    );
  }

  // An admin account has no public profile at all — running the platform
  // isn't a social presence, and an admin identity is exactly the kind of
  // thing worth not making an easy target to find or message. Anyone who
  // isn't that admin gets a plain 404, the same as a handle that never
  // existed; getRecommendedPeople (src/lib/home.ts) also excludes admins so
  // nothing ever links here in the first place.
  if (profile.is_admin) notFound();

  const tab = TABS.some((t) => t.key === rawTab) ? rawTab! : "posts";
  const visibleCases =
    tab === "marked" ? markedCases : tab === "saved" ? savedCases : cases;
  const emptyMessage =
    tab === "marked"
      ? "Nothing marked yet. 💡 🧠 ⚠️ on a case and it collects here."
      : tab === "saved"
        ? "No saved cases yet."
        : "No cases shared yet.";

  return (
    <div>
      <div className="flex flex-wrap items-start gap-4 px-4 py-6">
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
          <ReputationBadge tier={computeReputationTier(stats)} />
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
          <div className="flex min-w-0 flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Link
                href="/onboarding"
                className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-text"
              >
                Edit profile
              </Link>
              <Link
                href="/settings"
                aria-label="Settings"
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-text transition-transform duration-150 ease-out active:scale-90"
              >
                <SettingsIcon width={16} height={16} strokeWidth={2} />
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-muted">
              <Link href="/messages" className="hover:text-text">
                Messages
              </Link>
              <Link href="/consults" className="hover:text-text">
                Consults
              </Link>
              <Link href="/analytics" className="hover:text-text">
                Analytics
              </Link>
              <Link href="/reel" className="hover:text-text">
                Reel
              </Link>
              <Link href="/learn" className="hover:text-text">
                Learn
              </Link>
              <Link href="/notifications" className="hover:text-text">
                Notifications
              </Link>
              <form action={signOutAction}>
                <button type="submit" className="hover:text-text">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        ) : user ? (
          <div className="flex min-w-0 flex-col items-end gap-2">
            <FollowButton
              followeeId={profile.id}
              initialFollowing={viewerFollows}
              path={path}
            />
            <form action={startConversationAction.bind(null, profile.id)}>
              <button
                type="submit"
                className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-text"
              >
                Message
              </button>
            </form>
          </div>
        ) : null}
      </div>

      <ProfileStats stats={stats} />

      {isOwnProfile && (
        <div className="flex border-t border-line">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key === "posts" ? path : `${path}?tab=${t.key}`}
              className={clsx(
                "flex-1 border-b-2 py-2.5 text-center text-sm font-medium transition-colors duration-150",
                tab === t.key
                  ? "border-text text-text"
                  : "border-transparent text-muted hover:text-text",
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
      )}

      <div className={clsx(!isOwnProfile && "border-t border-line")}>
        {visibleCases.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            {emptyMessage}
          </p>
        ) : (
          visibleCases.map((c) => (
            <CaseCard key={c.id} feedCase={c} path={path} viewerId={user?.id ?? null} />
          ))
        )}
      </div>
    </div>
  );
}
