"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { ReactionBar, type ReactionBarHandle } from "@/components/reaction-bar";
import { Avatar } from "@/components/avatar";
import { ChevronDownIcon } from "@/components/icons";
import type { FeedCase } from "@/lib/cases";

const DOUBLE_TAP_MS = 300;

export function ReelSlide({
  feedCase,
  path,
  rotate = 0,
}: {
  feedCase: FeedCase;
  path: string;
  /** Degrees, driven by ReelView's drag gesture — applied only to the circle
   *  (not the reaction bar below it), so the circle spins on its own axis
   *  while the whole slide still just translates. 0 when not the active slide. */
  rotate?: number;
}) {
  const caseHref = feedCase.case_number ? `/case/${feedCase.case_number}` : "#";
  const [burst, setBurst] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const lastTapRef = useRef(0);
  const reactionBarRef = useRef<ReactionBarHandle>(null);

  function handleTap() {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      reactionBarRef.current?.reactIfNotAlready();
      setBurst(true);
      setTimeout(() => setBurst(false), 600);
    }
    lastTapRef.current = now;
  }

  return (
    // Spool is a circle, not a card in a list. The reaction bar sits below it
    // rather than inside — Spool is now video-only, so the circle is entirely
    // the clip of the video, with no room (or need) for interactions layered
    // on top of the footage itself.
    <section className="flex h-full w-full shrink-0 flex-col items-center justify-center gap-3">
      {/* A perfect circle, capped so it never outgrows the viewport in either
          dimension. `rotate` (not the section's own transform) is what spins
          it during a drag, around its own center. Clean video, no text — the
          arrow is the only thing on it; tapping it peels the caption open
          below rather than laying text over the footage. */}
      <div
        className="relative aspect-square h-[min(72dvh,90vw,520px)] shrink-0 overflow-hidden rounded-full ring-1 ring-white/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.7)]"
        style={{ transform: `rotate(${rotate}deg)` }}
      >
        {/* No native controls: the whole circle is already one big
            double-tap-to-react zone (the tap-catcher div below), which would
            fight a control bar for taps. Autoplaying muted and looped keeps
            it watchable without needing controls, same as a silent GIF. */}
        <video
          src={feedCase.media_url!}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div
          className="absolute inset-0"
          onClick={handleTap}
          role="presentation"
        />

        {burst && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {/* Matches what the gesture now records — a lightbulb, not a heart. */}
            <span className="animate-ping text-8xl">💡</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setInfoOpen((v) => !v)}
          aria-label={infoOpen ? "Hide case details" : "Show case details"}
          aria-expanded={infoOpen}
          className="absolute bottom-3 left-1/2 z-[2] flex size-8 -translate-x-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-transform duration-200 ease-out active:scale-90"
        >
          <ChevronDownIcon
            width={18}
            height={18}
            strokeWidth={2.5}
            className={clsx("transition-transform duration-200", infoOpen && "rotate-180")}
          />
        </button>
      </div>

      {infoOpen && (
        // A quarter-circle, not a rectangle — one corner left square-cornered
        // (where it meets the arrow) and the opposite corner a full arc, so it
        // reads as a wedge peeling out from the circle above rather than a
        // plain dropdown card. Translucent over the black backdrop, same
        // glass language as the rest of Spool's overlays.
        <div className="animate-enter w-[min(78vw,380px)] rounded-tl-3xl rounded-tr-3xl rounded-bl-3xl rounded-br-[100%] border border-white/10 bg-white/10 px-5 pb-8 pt-4 text-center backdrop-blur-lg">
          <p className="font-label text-[11px] uppercase tracking-wide text-white/70">
            {feedCase.case_number}
            {feedCase.specialty ? ` · ${feedCase.specialty}` : ""}
          </p>
          <h2 className="mt-1.5 font-headline text-lg text-white">{feedCase.title}</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-white/75">
            {feedCase.short_caption}
          </p>
          <Link
            href={feedCase.author?.handle ? `/u/${feedCase.author.handle}` : "#"}
            className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-white/85 hover:text-white"
          >
            <Avatar
              avatarUrl={feedCase.author?.avatar_url}
              name={feedCase.author?.full_name}
            />
            <span className="truncate">
              {feedCase.author?.full_name ?? "Unknown clinician"}
              {feedCase.author?.verified && (
                <span className="ml-1 text-white">✓</span>
              )}
            </span>
          </Link>

          <Link
            href={caseHref}
            className="mt-3 inline-block rounded-full bg-white/20 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur"
          >
            Let&apos;s dive deep →
          </Link>
        </div>
      )}

      <div className="shrink-0">
        <ReactionBar
          ref={reactionBarRef}
          caseId={feedCase.id}
          counts={feedCase.counts}
          viewerReactions={feedCase.viewerReactions}
          path={path}
          tone="dark"
          center
        />
      </div>
    </section>
  );
}
