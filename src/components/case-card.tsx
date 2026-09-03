import Link from "next/link";
import Image from "next/image";
import { clsx } from "clsx";
import { ReactionBar } from "@/components/reaction-bar";
import { Avatar } from "@/components/avatar";
import { CaseVideoPreview } from "@/components/case-video-preview";
import { caseTypeMeta } from "@/lib/case-types";
import { isVideoUrl } from "@/lib/media";
import { timeAgo } from "@/lib/time";
import type { FeedCase } from "@/lib/cases";
import { VerifiedBadge } from "@/components/verified-badge";

export function CaseCard({
  feedCase,
  path,
  viewerId = null,
}: {
  feedCase: FeedCase;
  path: string;
  /** When this matches the case's author, an "Add an update" link joins
   *  "Let's dive deep" — the author's way to add to the case without a new
   *  post, deep-linking straight to the existing timeline composer on the
   *  case page (CaseTimeline) rather than duplicating that UI here. */
  viewerId?: string | null;
}) {
  const caseHref = feedCase.case_number ? `/case/${feedCase.case_number}` : "#";
  const typeMeta = caseTypeMeta(feedCase.case_type);
  const isAuthor = viewerId !== null && viewerId === feedCase.author_id;

  return (
    <article
      id={`case-${feedCase.id}`}
      // A feed row, not a floating dashboard card — full-bleed with a
      // hairline divider between posts, the same structure Instagram/
      // Twitter/Facebook actually use for a content feed, instead of every
      // post sitting in its own bordered-and-shadowed rounded rectangle
      // with gaps of page background between them.
      className="group relative border-b border-line px-4 py-4 transition-colors duration-150 ease-out hover:bg-surface-2/50"
    >
      <div className="flex items-center gap-2">
        <Link href={feedCase.author?.handle ? `/u/${feedCase.author.handle}` : "#"}>
          <Avatar
            avatarUrl={feedCase.author?.avatar_url}
            name={feedCase.author?.full_name}
            square
          />
        </Link>
        <div className="min-w-0">
          <Link
            href={feedCase.author?.handle ? `/u/${feedCase.author.handle}` : "#"}
            className="truncate text-sm font-medium text-text hover:underline"
          >
            {feedCase.author?.full_name ?? "Unknown clinician"}
            {feedCase.author?.verified && (
              <VerifiedBadge tier={feedCase.author.badge_tier} />
            )}
          </Link>
          <p className="truncate font-label text-xs text-muted">
            {[feedCase.author?.role, feedCase.specialty, timeAgo(feedCase.created_at)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <p className="ml-auto shrink-0 font-label text-xs text-muted">
          {feedCase.case_number}
        </p>
      </div>

      {typeMeta.badge && (
        <span
          className={clsx(
            "mt-3 inline-block rounded-full border px-2.5 py-0.5 font-label text-xs",
            typeMeta.badgeClass,
          )}
        >
          {typeMeta.badge}
        </span>
      )}

      {(() => {
        const hasImageThumb =
          feedCase.media_url && !isVideoUrl(feedCase.media_url);
        return (
          <div
            className={clsx(
              typeMeta.badge ? "mt-2" : "mt-3",
              hasImageThumb && "flex items-start justify-between gap-3",
            )}
          >
            <div className="min-w-0 flex-1">
              <Link href={caseHref}>
                <h3 className="font-headline text-lg text-text hover:underline">
                  {feedCase.title}
                </h3>
              </Link>
              {typeMeta.isQuote ? (
                <p className="mt-2 border-l-2 border-accent-2/40 pl-3 font-headline text-lg italic leading-snug text-text">
                  {feedCase.short_caption}
                </p>
              ) : (
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {feedCase.short_caption}
                </p>
              )}
            </div>

            {hasImageThumb && (
              // A small square thumbnail beside the text rather than a
              // full-width image below it — empty alt, same reasoning as
              // before: the caption already carries the meaning.
              <Link
                href={caseHref}
                className="relative mt-0.5 aspect-square w-20 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:w-24"
              >
                <Image
                  src={feedCase.media_url!}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </Link>
            )}
          </div>
        );
      })()}

      {feedCase.media_url && isVideoUrl(feedCase.media_url) && (
        <CaseVideoPreview mediaUrl={feedCase.media_url} />
      )}

      {feedCase.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {feedCase.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-line px-2.5 py-0.5 font-label text-xs text-muted"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link
          href={caseHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
        >
          Let&apos;s dive deep
          <span
            aria-hidden
            className="inline-block transition-transform duration-200 ease-out group-hover:translate-x-1"
          >
            →
          </span>
        </Link>
        {isAuthor && caseHref !== "#" && (
          <Link
            href={`${caseHref}#case-timeline`}
            className="text-sm font-medium text-muted hover:text-text hover:underline"
          >
            + Add an update
          </Link>
        )}
      </div>

      <div className="mt-4">
        <ReactionBar
          caseId={feedCase.id}
          counts={feedCase.counts}
          viewerReactions={feedCase.viewerReactions}
          path={path}
          commentsHref={caseHref === "#" ? undefined : `${caseHref}#comments`}
        />
      </div>
    </article>
  );
}
