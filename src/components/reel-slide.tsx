"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ReactionBar, type ReactionBarHandle } from "@/components/reaction-bar";
import { Avatar } from "@/components/avatar";
import type { FeedCase } from "@/lib/cases";

const DOUBLE_TAP_MS = 300;

export function ReelSlide({ feedCase, path }: { feedCase: FeedCase; path: string }) {
  const caseHref = feedCase.case_number ? `/case/${feedCase.case_number}` : "#";
  const [revealed, setRevealed] = useState(
    feedCase.viewerReactions.includes("like"),
  );
  const [burst, setBurst] = useState(false);
  const lastTapRef = useRef(0);
  const reactionBarRef = useRef<ReactionBarHandle>(null);

  function handleTap() {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      reactionBarRef.current?.likeIfNotAlready();
      setRevealed(true);
      setBurst(true);
      setTimeout(() => setBurst(false), 600);
    }
    lastTapRef.current = now;
  }

  return (
    <section className="relative flex h-[calc(100dvh-145px)] w-full shrink-0 snap-start flex-col justify-center overflow-hidden bg-gradient-to-br from-accent to-accent-2 px-6 py-10">
      <div
        className="absolute inset-0"
        onClick={handleTap}
        role="presentation"
      />

      {burst && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="animate-ping text-8xl text-white/90">♥</span>
        </div>
      )}

      <div className="pointer-events-none relative z-[1] mx-auto flex w-full max-w-md flex-col items-center text-center">
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

      <div className="pointer-events-auto relative z-[1] mx-auto mt-8 w-full max-w-md">
        <ReactionBar
          ref={reactionBarRef}
          caseId={feedCase.id}
          counts={feedCase.counts}
          viewerReactions={feedCase.viewerReactions}
          path={path}
          tone="dark"
          onToggle={(type, active) => {
            if (type === "like" && active) setRevealed(true);
          }}
        />
      </div>
    </section>
  );
}
