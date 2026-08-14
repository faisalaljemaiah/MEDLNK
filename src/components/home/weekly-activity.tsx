import type { HomeStats } from "@/lib/home";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/database.types";

/**
 * A ring built from a conic-gradient rather than an SVG stroke-dasharray —
 * fewer moving parts for a single static value, and it repaints instantly if
 * --accent is ever retuned since it reads the CSS variable directly.
 */
export function WeeklyActivityCard({
  activity,
  locale,
}: {
  activity: HomeStats["activity"];
  locale: Locale;
}) {
  return (
    <section className="mx-4 mt-4 rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-slate-900/[0.03]">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="flex size-6 items-center justify-center rounded-full bg-accent-soft text-xs"
        >
          📈
        </span>
        <p className="font-label text-xs uppercase tracking-wide text-muted">
          {t(locale, "activity.title")}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <div
          className="relative flex size-16 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(var(--accent) ${activity.percent * 3.6}deg, var(--accent-soft) 0deg)`,
          }}
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-surface">
            <span className="text-sm font-semibold tabular-nums text-text">
              {activity.percent}%
            </span>
          </div>
        </div>

        <dl className="flex-1 text-sm text-muted">
          <div className="flex items-center justify-between">
            <dt>{t(locale, "activity.posts")}</dt>
            <dd className="tabular-nums text-text">{activity.postsThisWeek}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>{t(locale, "activity.comments")}</dt>
            <dd className="tabular-nums text-text">
              {activity.commentsThisWeek}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>{t(locale, "activity.reactions")}</dt>
            <dd className="tabular-nums text-text">
              {activity.reactionsThisWeek}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
