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
    // The section is just the snap target; the card inside it carries the
    // surface, so the page background shows through the gutters between posts.
    <section className="flex h-[calc(100dvh-145px)] w-full shrink-0 snap-start items-stretch px-3 py-2">
      {/* max-w-sm keeps the card portrait on desktop; on a phone the viewport
          is already narrower than that, so it just fills the gutters.
          No photo: a plain light card, same surface/border/text as the rest
          of the app — Asyashare is light-mode only, no colour-block or dark
          "poster" treatment standing in for a missing image. */}
      <div
        className={clsx(
          "relative mx-auto flex h-full w-full max-w-sm flex-col justify-center overflow-hidden rounded-3xl border px-5 py-10 shadow-lg shadow-slate-900/10",
          hasMedia ? "border-transparent" : "border-line bg-surface",
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

        <div className="relative z-[1] mx-auto w-full">
          <div className="pointer-events-none flex w-full flex-col items-center text-center">
            <p
              className={clsx(
                "font-label text-xs uppercase tracking-wide",
                hasMedia ? "text-white/80" : "text-muted",
              )}
            >
              {feedCase.case_number}
              {feedCase.specialty ? ` · ${feedCase.specialty}` : ""}
            </p>
            <h2
              className={clsx(
                "mt-3 font-headline text-2xl",
                hasMedia ? "text-white" : "text-text",
              )}
            >
              {feedCase.title}
            </h2>
            <p
              className={clsx(
                "mt-3 text-base leading-relaxed",
                hasMedia ? "text-white/80" : "text-muted",
              )}
            >
              {feedCase.short_caption}
            </p>
            <Link
              href={feedCase.author?.handle ? `/u/${feedCase.author.handle}` : "#"}
              className={clsx(
                "pointer-events-auto mt-4 flex items-center gap-2 text-sm",
                hasMedia
                  ? "text-white/85 hover:text-white"
                  : "text-text hover:text-accent",
              )}
            >
              <Avatar
                avatarUrl={feedCase.author?.avatar_url}
                name={feedCase.author?.full_name}
              />
              <span>
                {feedCase.author?.full_name ?? "Unknown clinician"}
                {feedCase.author?.verified && (
                  <span
                    className={clsx(
                      "ml-1",
                      hasMedia ? "text-white" : "text-positive",
                    )}
                  >
                    ✓
                  </span>
                )}
              </span>
            </Link>

            <Link
              href={caseHref}
              className={clsx(
                "pointer-events-auto mt-5 rounded-full px-4 py-2 text-sm font-medium backdrop-blur",
                hasMedia
                  ? "bg-white/20 text-white"
                  : "bg-accent-soft text-accent",
              )}
            >
              Let&apos;s dive deep →
            </Link>
          </div>

          <div className="pointer-events-auto mt-6 flex w-full justify-center">
            <ReactionBar
              ref={reactionBarRef}
              caseId={feedCase.id}
              counts={feedCase.counts}
              viewerReactions={feedCase.viewerReactions}
              path={path}
              tone={hasMedia ? "dark" : "light"}
              center
            />
          </div>
        </div>
      </div>
    </section>
  );
}
