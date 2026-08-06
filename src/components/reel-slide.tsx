"use client";

import { useRef, useState } from "react";
import { ReactionBar, type ReactionBarHandle } from "@/components/reaction-bar";
import { DiveDeepSheet } from "@/components/dive-deep-sheet";
import type { FeedCase } from "@/lib/cases";

const DOUBLE_TAP_MS = 300;

export function ReelSlide({ feedCase, path }: { feedCase: FeedCase; path: string }) {
  const [revealed, setRevealed] = useState(
    feedCase.viewerReactions.includes("like"),
  );
  const [open, setOpen] = useState(false);
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
    <section className="relative flex h-[calc(100dvh-56px)] w-full shrink-0 snap-start flex-col justify-center overflow-hidden bg-gradient-to-b from-surface-2 to-bg px-6 py-10">
      <div
        className="absolute inset-0"
        onClick={handleTap}
        role="presentation"
      />

      {burst && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="animate-ping text-8xl text-danger/80">♥</span>
        </div>
      )}

      <div className="pointer-events-none relative z-[1] mx-auto flex w-full max-w-md flex-col items-center text-center">
        <p className="font-label text-xs uppercase tracking-wide text-white/60">
          {feedCase.case_number}
          {feedCase.specialty ? ` · ${feedCase.specialty}` : ""}
        </p>
        <h2 className="mt-3 font-headline text-2xl text-white">
          {feedCase.title}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-white/80">
          {feedCase.short_caption}
        </p>
        <p className="mt-4 text-sm text-white/60">
          {feedCase.author?.full_name ?? "Unknown clinician"}
          {feedCase.author?.verified && <span className="ml-1 text-positive">✓</span>}
        </p>

        {revealed && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pointer-events-auto mt-5 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur"
          >
            Let&apos;s dive deep →
          </button>
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
          onOpenComments={() => setOpen(true)}
          onToggle={(type, active) => {
            if (type === "like" && active) setRevealed(true);
          }}
        />
      </div>

      {open && <DiveDeepSheet feedCase={feedCase} onClose={() => setOpen(false)} />}
    </section>
  );
}
