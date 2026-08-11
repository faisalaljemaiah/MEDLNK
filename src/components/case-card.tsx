import Link from "next/link";
import { clsx } from "clsx";
import { ReactionBar } from "@/components/reaction-bar";
import { Avatar } from "@/components/avatar";
import { caseTypeMeta } from "@/lib/case-types";
import type { FeedCase } from "@/lib/cases";

export function CaseCard({ feedCase, path }: { feedCase: FeedCase; path: string }) {
  const caseHref = feedCase.case_number ? `/case/${feedCase.case_number}` : "#";
  const typeMeta = caseTypeMeta(feedCase.case_type);

  return (
    <article
      id={`case-${feedCase.id}`}
      className="border-b border-line px-4 py-5"
    >
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
      <p className="mt-1 text-sm leading-relaxed text-muted">
        {feedCase.short_caption}
      </p>

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
        className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
      >
        Let&apos;s dive deep →
      </Link>

      <div className="mt-4">
        <ReactionBar
          caseId={feedCase.id}
          counts={feedCase.counts}
          viewerReactions={feedCase.viewerReactions}
          path={path}
        />
      </div>
    </article>
  );
}
