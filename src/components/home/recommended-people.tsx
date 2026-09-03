import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { FollowButton } from "@/components/follow-button";
import type { RecommendedPerson } from "@/lib/home";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/database.types";
import { UserPlusIcon } from "@/components/icons";
import { VerifiedBadge } from "@/components/verified-badge";

export function RecommendedPeople({
  people,
  path,
  locale,
}: {
  people: RecommendedPerson[];
  path: string;
  locale: Locale;
}) {
  if (people.length === 0) return null;

  return (
    <section className="mt-5 border-t border-line pt-4">
      <div className="flex items-center gap-2 px-4">
        <span
          aria-hidden
          className="flex size-6 items-center justify-center rounded-full bg-accent-soft text-accent"
        >
          <UserPlusIcon width={13} height={13} strokeWidth={2.25} />
        </span>
        <p className="font-label text-xs uppercase tracking-wide text-muted">
          {t(locale, "people.title")}
        </p>
      </div>
      <div className="no-scrollbar mt-2.5 flex gap-3 overflow-x-auto px-4 pb-1">
        {people.map((p) => (
          <div
            key={p.id}
            className="flex w-40 shrink-0 flex-col items-center gap-2 rounded-2xl border border-line bg-surface p-3.5 text-center shadow-[0_1px_2px_rgb(var(--shadow-tint)/0.05)] transition-transform duration-150 ease-out hover:-translate-y-0.5"
          >
            <Link href={`/u/${p.handle}`}>
              <Avatar avatarUrl={p.avatar_url} name={p.full_name} size="lg" />
            </Link>
            <div className="w-full min-w-0">
              <Link
                href={`/u/${p.handle}`}
                className="block truncate text-sm font-medium text-text hover:underline"
              >
                {p.full_name ?? `@${p.handle}`}
                {p.verified && <VerifiedBadge tier={p.badge_tier} />}
              </Link>
              <p className="truncate text-xs text-muted">
                {p.role || p.specialty || "Clinician"}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {p.followerCount} {p.followerCount === 1 ? "follower" : "followers"}
              </p>
            </div>
            <FollowButton followeeId={p.id} initialFollowing={false} path={path} />
          </div>
        ))}
      </div>
    </section>
  );
}
