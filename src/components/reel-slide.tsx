"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { clsx } from "clsx";
import { ReactionBar, type ReactionBarHandle } from "@/components/reaction-bar";
import { Avatar } from "@/components/avatar";
import { DOUBLE_TAP_REACTION } from "@/lib/reaction-types";
import type { FeedCase } from "@/lib/cases";

const DOUBLE_TAP_MS = 300;

export function ReelSlide({ feedCase, path }: { feedCase: FeedCase; path: string }) {
  const caseHref = feedCase.case_number ? `/case/${feedCase.case_number}` : "#";
  const [revealed, setRevealed] = useState(
    feedCase.viewerReactions.includes(DOUBLE_TAP_REACTION),
  );
  const [burst, setBurst] = useState(false);
  const lastTapRef = useRef(0);
  const reactionBarRef = useRef<ReactionBarHandle>(null);

  function handleTap() {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      reactionBarRef.current?.reactIfNotAlready();
      setRevealed(true);
      setBurst(true);
      setTimeout(() => setBurst(false), 600);
    }
    lastTapRef.current = now;
  }

  return (
    // The section is just the snap target; the card inside it carries the
    // colour, so the page background shows through the gutters between posts.
    <section className="flex h-[calc(100dvh-145px)] w-full shrink-0 snap-start items-stretch px-3 py-2">
      {/* max-w-sm keeps the card portrait on desktop; on a phone the viewport
          is already narrower than that, so it just fills the gutters.
          With no photo there is nothing to see through to, so the accent
          sheet stays opaque rather than letting the page show through. */}
      <div
        className={clsx(
          "relative mx-auto flex h-full w-full max-w-sm flex-col justify-center overflow-hidden rounded-3xl px-5 py-10 shadow-lg shadow-slate-900/10",
          !feedCase.media_url && "bg-gradient-to-br from-accent to-accent-2",
        )}
      >
        {feedCase.media_url && (
          <>
            <Image
              src={feedCase.media_url}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 384px"
              className="object-cover"
            />
            {/* The accent sheet itself becomes the glass: tinted and frosted,
                so the photo reads through the colour instead of being hidden
                behind it. */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/60 to-accent-2/60 backdrop-blur-md" />
            {/* Case photos are arbitrary and a near-white one would lift the
                tint far too pale for white copy, so this holds a dark floor
                through the middle of the card where the text sits. */}
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
            <p className="font-label text-xs uppercase tracking-wide text-white/80">
              {feedCase.case_number}
              {feedCase.specialty ? ` · ${feedCase.specialty}` : ""}
            </p>
            <h2 className="mt-3 font-headline text-2xl text-white">
              {feedCase.title}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-white/80">
              {feedCase.short_caption}
            </p>
            <Link
              href={feedCase.author?.handle ? `/u/${feedCase.author.handle}` : "#"}
              className="pointer-events-auto mt-4 flex items-center gap-2 text-sm text-white/85 hover:text-white"
            >
              <Avatar
                avatarUrl={feedCase.author?.avatar_url}
                name={feedCase.author?.full_name}
              />
              <span>
                {feedCase.author?.full_name ?? "Unknown clinician"}
                {feedCase.author?.verified && (
                  <span className="ml-1 text-white">✓</span>
                )}
              </span>
            </Link>

            {revealed && (
              <Link
                href={caseHref}
                className="pointer-events-auto mt-5 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur"
              >
                Let&apos;s dive deep →
              </Link>
            )}
          </div>

          <div className="pointer-events-auto mt-6 flex w-full justify-center">
            <ReactionBar
              ref={reactionBarRef}
              caseId={feedCase.id}
              counts={feedCase.counts}
              viewerReactions={feedCase.viewerReactions}
              path={path}
              tone="dark"
              onToggle={(type, active) => {
                if (type === DOUBLE_TAP_REACTION && active) setRevealed(true);
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
