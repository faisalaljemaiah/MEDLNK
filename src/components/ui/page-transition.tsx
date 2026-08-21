import { ViewTransition } from "react";

/**
 * A named wrapper over React 19's native View Transition support — the
 * mechanism this app already uses for the Home feed tabs' crossfade
 * (src/app/(app)/page.tsx) and their sliding underline
 * (src/components/home/feed-tabs.tsx). This isn't a second, competing
 * transition system; it's that same mechanism given one name so every call
 * site reads as "this is a MEDLNK page transition" rather than a bare,
 * unexplained `<ViewTransition>`. Degrades to an instant swap wherever the
 * browser has no View Transitions support, and is skipped automatically
 * under prefers-reduced-motion (handled globally in globals.css).
 */
export function PageTransition({
  name,
  children,
}: {
  /** Must be stable across the transition and unique among concurrently
   *  rendered transitions on the page — same rule as any React key. */
  name: string;
  children: React.ReactNode;
}) {
  return <ViewTransition name={name}>{children}</ViewTransition>;
}
