import Link from "next/link";
import { clsx } from "clsx";
import { FEED_FILTERS, feedFilterHref } from "@/lib/feed-filters";

/**
 * Plain links, not client-side state: switching filter is a navigation, so the
 * URL stays shareable and the feed keeps being rendered on the server.
 */
export function FeedFilterBar({
  active,
  hasViewer,
}: {
  active: string;
  hasViewer: boolean;
}) {
  const filters = FEED_FILTERS.filter((f) => !f.requiresViewer || hasViewer);

  return (
    <div className="border-b border-line">
      {/* Scrolls sideways on narrow phones rather than wrapping to two rows. */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2.5">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={feedFilterHref(f.key)}
            aria-current={active === f.key ? "page" : undefined}
            // These labels aren't translated yet (see i18n.ts), so on an RTL
            // page the Unicode bidi algorithm reorders trailing punctuation —
            // "What would you do?" renders as "؟What would you do". Forcing
            // ltr on the untranslated English text avoids that without
            // touching the row's own RTL ordering, which comes from the
            // ancestor's dir and should stay.
            dir="ltr"
            className={clsx(
              "shrink-0 rounded-full border px-3.5 py-1.5 font-label text-xs transition-[color,background-color,transform] duration-150 ease-out active:scale-95",
              active === f.key
                ? "border-text bg-text text-bg"
                : "border-line text-muted hover:text-text",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
