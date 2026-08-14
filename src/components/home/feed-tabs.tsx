import Link from "next/link";
import { clsx } from "clsx";
import { t, type TranslationKey } from "@/lib/i18n";
import type { Locale } from "@/lib/database.types";

export type HomeFeedView = "foryou" | "following" | "trending";

const TABS: { key: HomeFeedView; labelKey: TranslationKey; requiresViewer?: boolean }[] = [
  { key: "foryou", labelKey: "tabs.forYou" },
  { key: "following", labelKey: "tabs.following", requiresViewer: true },
  { key: "trending", labelKey: "tabs.trending" },
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
  locale,
}: {
  active: HomeFeedView;
  hasViewer: boolean;
  locale: Locale;
}) {
  const tabs = TABS.filter((tab) => !tab.requiresViewer || hasViewer);

  return (
    <div className="mt-5 flex gap-1 border-b border-line px-4">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={homeFeedViewHref(tab.key)}
          aria-current={active === tab.key ? "page" : undefined}
          className={clsx(
            "relative px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-out",
            active === tab.key ? "text-text" : "text-muted hover:text-text",
          )}
        >
          {t(locale, tab.labelKey)}
          {active === tab.key && (
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
