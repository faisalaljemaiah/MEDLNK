import Link from "next/link";
import { BoltIcon } from "@/components/icons";

/**
 * The dashboard's activity streak — replaced the four-tile stat-card row.
 * `days` is a real computed streak (getHomeStreak, src/lib/home.ts), not a
 * fabricated number; postsThisWeek/commentsThisWeek are the same real
 * weekly counts the old stat cards showed.
 */
export function StreakCard({
  days,
  postsThisWeek,
  commentsThisWeek,
}: {
  days: number;
  postsThisWeek: number;
  commentsThisWeek: number;
}) {
  const subtitle = `${postsThisWeek} ${postsThisWeek === 1 ? "post" : "posts"} · ${commentsThisWeek} ${commentsThisWeek === 1 ? "comment" : "comments"} this week`;

  return (
    <div className="mx-4 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgb(var(--shadow-tint)/0.05)]">
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"
      >
        <BoltIcon width={20} height={20} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-headline text-base text-text">
          {days}-day streak
        </p>
        <p className="truncate text-xs text-muted">{subtitle}</p>
      </div>
      <Link
        href="/analytics"
        className="shrink-0 text-sm font-medium text-accent hover:underline"
      >
        View
      </Link>
    </div>
  );
}
