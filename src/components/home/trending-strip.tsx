import Link from "next/link";
import { TrendingUpIcon } from "@/components/icons";
import type { TrendingTopic } from "@/lib/home";

/**
 * The "Trending now" strip at the top of the feed — a marquee of tappable
 * topic pills, each one a real tag from recent cases (getTrendingTopics,
 * src/lib/home.ts). Pure CSS animation (see .medlnk-marquee-track in
 * globals.css), so this needs no "use client": the pause-on-hover and the
 * reduced-motion freeze are both handled by CSS alone.
 *
 * The pill list renders twice in the DOM back to back — that's what makes
 * the -50% translate loop seamless — with aria-hidden on the second copy so
 * a screen reader only ever hears each topic once.
 */
export function TrendingStrip({ topics }: { topics: TrendingTopic[] }) {
  if (topics.length === 0) return null;

  return (
    <section aria-labelledby="trending-strip-label" className="pt-4">
      <div className="flex items-center gap-2 px-4">
        {/* A scrolling ECG trace instead of a plain pulsing dot — same
            heartbeat-blip shape as the app's own logo mark (Logo,
            src/components/logo.tsx), drawn twice back to back and looped
            by translating exactly one copy's width (.medlnk-ecg-scroll,
            globals.css) — same seamless-loop technique as the marquee
            below it and MedLnkPulse's wave. */}
        <span
          aria-hidden
          className="relative h-4 w-4 shrink-0 overflow-hidden text-danger"
        >
          <svg
            viewBox="0 0 48 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="medlnk-ecg-scroll absolute inset-y-0 left-0 h-4 w-8"
          >
            <polyline points="2 12 7 12 9.5 5 13 19 15.5 12 22 12 26 12 31 12 33.5 5 37 19 39.5 12 46 12" />
          </svg>
        </span>
        <p
          id="trending-strip-label"
          className="font-label text-xs uppercase tracking-wide text-muted"
        >
          Trending now
        </p>
      </div>

      <div className="no-scrollbar mt-2 overflow-x-hidden">
        <div className="medlnk-marquee-track flex w-max gap-2 px-4">
          <TopicPills topics={topics} />
          <TopicPills topics={topics} ariaHidden />
        </div>
      </div>
    </section>
  );
}

function TopicPills({
  topics,
  ariaHidden,
}: {
  topics: TrendingTopic[];
  ariaHidden?: boolean;
}) {
  return (
    <div
      aria-hidden={ariaHidden}
      className="flex shrink-0 items-center gap-2"
    >
      {topics.map((topic) => (
        <Link
          key={topic.id}
          href={`/search?tag=${encodeURIComponent(topic.name)}`}
          tabIndex={ariaHidden ? -1 : undefined}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-text transition-colors duration-150 ease-out hover:border-accent/40 hover:text-accent active:scale-95"
        >
          {topic.momentum === "up" ? (
            <TrendingUpIcon
              width={13}
              height={13}
              strokeWidth={2.25}
              className="shrink-0 text-positive"
              aria-hidden="true"
            />
          ) : (
            <span aria-hidden="true" className="text-muted">
              —
            </span>
          )}
          <span className="whitespace-nowrap">{topic.name}</span>
          <span className="font-label text-xs text-muted">{topic.count}</span>
        </Link>
      ))}
    </div>
  );
}
