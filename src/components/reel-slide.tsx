"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { clsx } from "clsx";
import { ReactionBar, type ReactionBarHandle } from "@/components/reaction-bar";
import { Avatar } from "@/components/avatar";
import { isVideoUrl } from "@/lib/media";
import type { FeedCase } from "@/lib/cases";

const DOUBLE_TAP_MS = 300;

export function ReelSlide({ feedCase, path }: { feedCase: FeedCase; path: string }) {
  const caseHref = feedCase.case_number ? `/case/${feedCase.case_number}` : "#";
  const hasMedia = Boolean(feedCase.media_url);
  const isVideo = hasMedia && isVideoUrl(feedCase.media_url!);
  const [burst, setBurst] = useState(false);
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
    // Spool is a circle, not a card in a list — the section just centers it;
    // ReelView positions and rotates this whole element during a drag.
    <section className="flex h-full w-full shrink-0 items-center justify-center">
      {/* A perfect circle, capped so it never outgrows the viewport in either
          dimension. No photo: still dark (the backdrop behind it is always
          black now), a frosted glass fill rather than the rest of the app's
          light surface — Spool is the one deliberately dark, immersive view. */}
      <div
        className={clsx(
          "relative flex aspect-square h-[min(78dvh,78vw,460px)] flex-col justify-center overflow-hidden rounded-full ring-1 ring-white/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]",
          !hasMedia && "bg-white/[0.07] backdrop-blur-md",
        )}
      >
        {hasMedia && (
          <>
            {isVideo ? (
              // No native controls here: the whole card is already one big
              // double-tap-to-react zone (the tap-catcher div below), which
              // would fight a control bar for taps. Autoplaying muted and
              // looped keeps it watchable without needing controls, same as
              // a silent GIF.
              <video
                src={feedCase.media_url!}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <Image
                src={feedCase.media_url!}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 384px"
                className="object-cover"
              />
            )}
            {/* Case photos/videos are arbitrary and a near-white one would
                leave white text unreadable, so this holds a dark floor
                through the middle of the card where the text sits — a
                legibility aid over arbitrary media, not a colour choice. */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/45 to-black/20" />
          </>
        )}

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

        {/* Constrained to the circle's inscribed square, not the full width —
            content that reaches toward the rim would clip against the curve. */}
        <div className="relative z-[1] mx-auto w-[72%]">
          <div className="pointer-events-none flex w-full flex-col items-center text-center">
            <p className="font-label text-[11px] uppercase tracking-wide text-white/70">
              {feedCase.case_number}
              {feedCase.specialty ? ` · ${feedCase.specialty}` : ""}
            </p>
            <h2 className="mt-1.5 line-clamp-2 font-headline text-lg text-white">
              {feedCase.title}
            </h2>
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-white/75">
              {feedCase.short_caption}
            </p>
            <Link
              href={feedCase.author?.handle ? `/u/${feedCase.author.handle}` : "#"}
              className="pointer-events-auto mt-2.5 flex items-center gap-1.5 text-xs text-white/85 hover:text-white"
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
              className="pointer-events-auto mt-3 rounded-full bg-white/20 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur"
            >
              Let&apos;s dive deep →
            </Link>
          </div>

          <div className="pointer-events-auto mt-3 flex w-full justify-center">
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
        </div>
      </div>
    </section>
  );
}
