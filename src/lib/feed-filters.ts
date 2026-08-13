import type { CaseType } from "@/lib/database.types";

/**
 * The home feed's chip row.
 *
 * Each chip maps 1:1 onto something the reader already recognises from the
 * cards — a badge they've seen, or the cases they chose to follow — so the row
 * reads as "narrow this down", not as a second navigation system. Adding a chip
 * means adding an entry here; the page and the chip row both build from it.
 */
export type FeedFilter = {
  key: string;
  label: string;
  /** Post types this chip admits. Absent means the chip isn't a type filter. */
  caseTypes?: CaseType[];
  /** Chip only appears, and only works, for a signed-in viewer. */
  requiresViewer?: boolean;
  /** Shown in place of the list when nothing matches. */
  empty: string;
};

export const FEED_FILTERS: FeedFilter[] = [
  {
    key: "all",
    label: "All",
    empty: "No cases yet — be the first to share one.",
  },
  {
    key: "near_miss",
    label: "Near miss",
    caseTypes: ["near_miss"],
    empty:
      "No near misses yet. Sharing one is how the next clinician avoids it.",
  },
  {
    key: "what_would_you_do",
    label: "What would you do?",
    caseTypes: ["what_would_you_do"],
    empty: "No cases to answer yet.",
  },
  {
    key: "wish_i_knew",
    label: "Wish I knew",
    caseTypes: ["things_i_wish_i_knew"],
    empty:
      "Nothing here yet. What would you tell yourself before that rotation?",
  },
  {
    key: "following",
    // "Cases I follow", not "Following": the Home page now has a
    // people-based Following tab above this chip row, and the two would
    // otherwise show the same label for two different things (Follow Case
    // vs. following a clinician).
    label: "Cases I follow",
    requiresViewer: true,
    empty:
      "You're not following any cases yet. Follow one and its updates land here.",
  },
];

export const DEFAULT_FEED_FILTER = FEED_FILTERS[0];

/** Falls back to All for an unknown or viewer-gated key. */
export function feedFilter(key: string | null | undefined, hasViewer: boolean) {
  const found = FEED_FILTERS.find((f) => f.key === key);
  if (!found) return DEFAULT_FEED_FILTER;
  if (found.requiresViewer && !hasViewer) return DEFAULT_FEED_FILTER;
  return found;
}

export function feedFilterHref(key: string) {
  return key === DEFAULT_FEED_FILTER.key ? "/" : `/?filter=${key}`;
}
