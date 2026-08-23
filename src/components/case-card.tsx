import Link from "next/link";
import Image from "next/image";
import { clsx } from "clsx";
import { ReactionBar } from "@/components/reaction-bar";
import { Avatar } from "@/components/avatar";
import { MutedIcon } from "@/components/icons";
import { caseTypeMeta } from "@/lib/case-types";
import { isVideoUrl } from "@/lib/media";
import { timeAgo } from "@/lib/time";
import type { FeedCase } from "@/lib/cases";

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
      className="case-card-hover group relative mx-4 my-3 rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-slate-900/[0.03]"
    >
      {/* A thin AI-hue line along the top edge, hidden until hover — the
          same "this is alive" language as .medlnk-pulse-line, but static
          rather than continuously sweeping since it's a hover response, not
          an ambient cue. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-4 top-0 h-0.5 rounded-full bg-gradient-to-r from-[var(--ai-hue-1)] via-[var(--ai-hue-3)] to-[var(--ai-hue-4)] opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-70"
      />
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
              <span className="ml-1 text-positive">✓</span>
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
        // Feed preview, not a player: autoplaying, muted and looping like
        // any other social feed's video preview, with no native controls to
        // fumble with mid-scroll — tapping it opens the full case instead,
        // same as the photo thumbnail above. The muted badge is the only
        // affordance that it has sound at all; the case page's own <video>
        // (case/[caseNumber]/page.tsx) is the one with real controls and
        // audio.
        <Link
          href={caseHref}
          className="relative mt-3 block aspect-[4/3] w-full overflow-hidden rounded-xl bg-black"
        >
          <video
            src={feedCase.media_url}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover"
          />
          <span
            aria-hidden
            className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-white"
          >
            <MutedIcon width={13} height={13} strokeWidth={2.25} />
          </span>
        </Link>
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
