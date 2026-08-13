import Link from "next/link";
import { clsx } from "clsx";

export type HomeFeedView = "foryou" | "following" | "trending";

const TABS: { key: HomeFeedView; label: string; requiresViewer?: boolean }[] = [
  { key: "foryou", label: "For You" },
  { key: "following", label: "Following", requiresViewer: true },
  { key: "trending", label: "Trending" },
];

export function homeFeedViewHref(key: HomeFeedView): string {
  return key === "foryou" ? "/" : `/?view=${key}`;
}

/**
 * Plain links, not client tab state — same reasoning as FeedFilterBar: the
 * view stays a real, shareable URL and the feed underneath keeps rendering
 * server-side. Sits above FeedFilterBar rather than replacing it: "For You"
 * is exactly today's chip-filtered feed, "Following" and "Trending" are new
 * views alongside it.
 */
export function HomeFeedTabs({
  active,
  hasViewer,
}: {
  active: HomeFeedView;
  hasViewer: boolean;
}) {
  const tabs = TABS.filter((t) => !t.requiresViewer || hasViewer);

  return (
    <div className="mt-5 flex gap-1 border-b border-line px-4">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={homeFeedViewHref(t.key)}
          aria-current={active === t.key ? "page" : undefined}
          className={clsx(
            "relative px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-out",
            active === t.key ? "text-text" : "text-muted hover:text-text",
          )}
        >
          {t.label}
          {active === t.key && (
            <span
              aria-hidden
              className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent transition-all duration-200 ease-out"
            />
          )}
        </Link>
      ))}
    </div>
  );
}
