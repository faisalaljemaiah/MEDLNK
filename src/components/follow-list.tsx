import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { FollowButton } from "@/components/follow-button";
import type { FollowListPerson } from "@/lib/follows";
import type { Locale } from "@/lib/database.types";

/**
 * The row list behind both /u/[handle]/followers and /u/[handle]/following
 * — same data shape (FollowListPerson), so one component renders both,
 * differing only in which query populated `people` and the empty-state copy
 * each page passes in.
 */
export function FollowList({
  people,
  viewerId,
  emptyMessage,
  path,
  locale,
}: {
  people: FollowListPerson[];
  viewerId: string | null;
  emptyMessage: string;
  /** This list page's own path, so FollowButton's revalidation targets the
   *  page the viewer is actually looking at. */
  path: string;
  locale: Locale;
}) {
  if (people.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-line">
      {people.map((p) => (
        <li key={p.id} className="flex items-center gap-3 px-4 py-3">
          <Link
            href={p.handle ? `/u/${p.handle}` : "#"}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <Avatar avatarUrl={p.avatar_url} name={p.full_name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text">
                {p.full_name || "(no name yet)"}
                {p.verified && <VerifiedBadge tier={p.badge_tier} />}
              </p>
              <p className="truncate font-label text-xs text-muted">
                @{p.handle ?? "—"}
                {p.role ? ` · ${p.role}` : ""}
              </p>
            </div>
          </Link>
          {viewerId && viewerId !== p.id && (
            <FollowButton
              followeeId={p.id}
              initialFollowing={p.viewerFollows}
              path={path}
              locale={locale}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
