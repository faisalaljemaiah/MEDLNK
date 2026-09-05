import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/server";
import { getViewer, getViewerProfile } from "@/lib/auth";
import { getProfileByHandle, getProfileCardData } from "@/lib/profile";
import { t } from "@/lib/i18n";
import { Avatar } from "@/components/avatar";
import { SettingsIcon } from "@/components/icons";
import { FollowButton } from "@/components/follow-button";
import { CaseCard } from "@/components/case-card";
import { ProfileStats } from "@/components/profile-stats";
import { ReputationBadge } from "@/components/reputation-badge";
import { computeReputationTier } from "@/lib/reputation";
import { startConversationAction } from "@/app/actions/messages";
import { AdminDashboard } from "@/components/admin-dashboard";
import { ProfileOverflowMenu } from "@/components/profile-overflow-menu";
import { ShareProfileButton } from "@/components/share-profile-button";
import { StreakCard } from "@/components/home/streak-card";
import { VerifiedBadge } from "@/components/verified-badge";

const TABS = [
  { key: "posts", labelKey: "profile.tabPosts" },
  // "Marked", not "Liked": 0010 replaced the bare like with the three
  // clinical-value reactions, and this tab collects all of them.
  { key: "marked", labelKey: "profile.tabMarked" },
  { key: "saved", labelKey: "profile.tabSaved" },
] as const;

/**
 * Title/description for the rich preview a shared profile link unfurls
 * into; the image half of that preview is opengraph-image.tsx /
 * twitter-image.tsx in this same route segment (file-based, so it composes
 * with this automatically rather than needing to be set here too).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const supabase = await createClient();
  const data = await getProfileCardData(supabase, handle);

  if (!data) return {};

  const name = data.full_name || `@${data.handle}`;
  const title = `${name} (@${data.handle})`;
  const description = `Follow ${name} on Asyashare — the clinical case-sharing network for healthcare professionals.`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

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
  const [user, viewerProfile] = await Promise.all([
    getViewer(),
    getViewerProfile(),
  ]);
  const locale = viewerProfile?.locale ?? "en";

  const data = await getProfileByHandle(supabase, handle, user?.id ?? null);
  if (!data) notFound();

  const {
    profile,
    cases,
    markedCases,
    savedCases,
    stats,
    weeklyStats,
    streakDays,
    followerCount,
    followingCount,
    viewerFollows,
    viewerHasBlocked,
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

  const tab = TABS.some((tb) => tb.key === rawTab) ? rawTab! : "posts";
  const visibleCases =
    tab === "marked" ? markedCases : tab === "saved" ? savedCases : cases;
  const emptyMessage =
    tab === "marked"
      ? t(locale, "profile.emptyMarked")
      : tab === "saved"
        ? t(locale, "profile.emptySaved")
        : t(locale, "profile.emptyPosts");

  return (
    <div>
      <div className="animate-enter relative">
        <div className="h-24 overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-accent-soft via-surface-2 to-accent/15 sm:h-32" />
        <div className="flow-root px-4">
          <Avatar
            avatarUrl={profile.avatar_url}
            name={profile.full_name}
            size="xl"
            className="-mt-12 ring-4 ring-bg shadow-[0_6px_20px_-6px_rgb(var(--shadow-tint)/0.35)] sm:-mt-14"
          />
        </div>
      </div>

      <div className="animate-enter stagger-1 px-4 pb-2 pt-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-text">
              {profile.full_name || t(locale, "profile.noNameYet")}
              {profile.verified && <VerifiedBadge tier={profile.badge_tier} />}
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
          </div>

          {isOwnProfile ? (
            <div className="flex min-w-0 flex-col items-start gap-2 sm:items-end">
              <div className="flex items-center gap-2">
                <Link
                  href="/onboarding"
                  className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-text"
                >
                  {t(locale, "profile.editProfile")}
                </Link>
                <ShareProfileButton handle={handle} locale={locale} />
                <Link
                  href="/settings"
                  aria-label="Settings"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-text transition-transform duration-150 ease-out active:scale-90"
                >
                  <SettingsIcon width={16} height={16} strokeWidth={2} />
                </Link>
              </div>
            </div>
          ) : user ? (
            <div className="flex min-w-0 flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                {viewerHasBlocked ? (
                  <p className="text-xs text-muted">{t(locale, "profile.blocked")}</p>
                ) : (
                  <>
                    <FollowButton
                      followeeId={profile.id}
                      initialFollowing={viewerFollows}
                      path={path}
                      locale={locale}
                    />
                    <form action={startConversationAction.bind(null, profile.id)}>
                      <button
                        type="submit"
                        className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-text transition-[border-color,transform] duration-150 ease-out active:scale-95"
                      >
                        {t(locale, "profile.message")}
                      </button>
                    </form>
                  </>
                )}
                <ProfileOverflowMenu
                  profileId={profile.id}
                  initialBlocked={viewerHasBlocked}
                  path={path}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex gap-2">
          <Link
            href={`${path}/followers`}
            className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted transition-colors duration-150 hover:text-text"
          >
            <span className="font-medium text-text">{followerCount}</span>{" "}
            {t(locale, "profile.followers")}
          </Link>
          <Link
            href={`${path}/following`}
            className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted transition-colors duration-150 hover:text-text"
          >
            <span className="font-medium text-text">{followingCount}</span>{" "}
            {t(locale, "profile.following")}
          </Link>
        </div>
      </div>

      {isOwnProfile && weeklyStats && (
        <div className="animate-enter stagger-2 mt-1">
          <StreakCard
            days={streakDays ?? 0}
            postsThisWeek={weeklyStats.activity.postsThisWeek}
            commentsThisWeek={weeklyStats.activity.commentsThisWeek}
          />
        </div>
      )}

      <ProfileStats stats={stats} />

      {isOwnProfile && (
        <div className="flex border-t border-line">
          {TABS.map((tb) => (
            <Link
              key={tb.key}
              href={tb.key === "posts" ? path : `${path}?tab=${tb.key}`}
              className={clsx(
                "flex-1 border-b-2 py-2.5 text-center text-sm font-medium transition-colors duration-150",
                tab === tb.key
                  ? "border-text text-text"
                  : "border-transparent text-muted hover:text-text",
              )}
            >
              {t(locale, tb.labelKey)}
            </Link>
          ))}
        </div>
      )}

      <div
        className={clsx(
          "min-h-[40vh] rounded-t-[2rem] bg-gradient-to-br from-accent-soft via-surface-2 to-accent/15",
          !isOwnProfile && "border-t border-line",
        )}
      >
        {visibleCases.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            {emptyMessage}
          </p>
        ) : (
          visibleCases.map((c) => (
            <CaseCard key={c.id} feedCase={c} path={path} viewerId={user?.id ?? null} locale={locale} />
          ))
        )}
      </div>
    </div>
  );
}
