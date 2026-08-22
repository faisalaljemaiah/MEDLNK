const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * Short relative time for a card meta line — "2h", "3d", "just now".
 * Falls back to a short absolute date past two weeks, matching the terse
 * style already used elsewhere (e.g. CaseComments' "month: short, day:
 * numeric") rather than letting a stale post read as "312d".
 */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();

  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < 2 * WEEK) return `${Math.floor(diff / DAY)}d`;

  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
