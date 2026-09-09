"use client";

import { clsx } from "clsx";
import { useReadAloud } from "@/components/read-aloud-context";

/**
 * Wraps one sentence-sized chunk of case text so it lights up while
 * ReadAloudButton is reading it aloud — a karaoke-style follow-along, not
 * just audio playing with nothing to look at. `id` must match the id the
 * same sentence was given in buildSpokenText server-side (see the case
 * page), or it will simply never highlight.
 */
export function HighlightSentence({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { activeId } = useReadAloud();
  return (
    <span className={clsx("rounded transition-colors duration-200", activeId === id && "bg-audio/15")}>
      {children}
    </span>
  );
}
