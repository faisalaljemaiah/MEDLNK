import Link from "next/link";
import Image from "next/image";
import { clsx } from "clsx";
import { ReactionBar } from "@/components/reaction-bar";
import { Avatar } from "@/components/avatar";
import { caseTypeMeta } from "@/lib/case-types";
import { isVideoUrl } from "@/lib/media";
import type { FeedCase } from "@/lib/cases";

export function CaseCard({ feedCase, path }: { feedCase: FeedCase; path: string }) {
  const caseHref = feedCase.case_number ? `/case/${feedCase.case_number}` : "#";
  const typeMeta = caseTypeMeta(feedCase.case_type);

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
          <p className="font-label text-xs text-muted">
            @{feedCase.author?.handle ?? "unknown"} · {feedCase.author?.role}
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

      <Link href={caseHref}>
        <h3
          className={clsx(
            "font-headline text-lg text-text hover:underline",
            typeMeta.badge ? "mt-2 block" : "mt-3 block",
          )}
        >
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

      {feedCase.media_url && (
        isVideoUrl(feedCase.media_url) ? (
          // Not a Link like the image case below: a video needs its native
          // controls to be directly clickable, which a wrapping Link would
          // fight over every tap.
          <div className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-xl bg-black">
            <video
              src={feedCase.media_url}
              controls
              playsInline
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          // Fixed aspect box rather than intrinsic sizing: case photos are
          // arbitrary, and letting one set its own height makes the feed jump
          // as images load. Empty alt — the caption above already carries the
          // meaning, so announcing the file again is noise to a screen reader.
          <Link
            href={caseHref}
            className="relative mt-3 block aspect-[4/3] w-full overflow-hidden rounded-xl bg-surface-2"
          >
            <Image
              src={feedCase.media_url}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 640px"
              className="object-cover"
            />
          </Link>
        )
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

      <Link
        href={caseHref}
        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
      >
        Let&apos;s dive deep
        <span
          aria-hidden
          className="inline-block transition-transform duration-200 ease-out group-hover:translate-x-1"
        >
          →
        </span>
      </Link>

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
