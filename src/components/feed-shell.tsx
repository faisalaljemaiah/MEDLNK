"use client";

import { useRef, useState, type TouchEvent } from "react";
import { clsx } from "clsx";
import { ReelView } from "@/components/reel-view";
import { CaseCard } from "@/components/case-card";
import type { FeedCase } from "@/lib/cases";

type Mode = "reel" | "read";
const SWIPE_THRESHOLD = 60;

export function FeedShell({ cases, path }: { cases: FeedCase[]; path: string }) {
  const [mode, setMode] = useState<Mode>("read");
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function onTouchStart(e: TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e: TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;

    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;

    // Reel -> Read: swipe left. Read -> Reel: swipe right.
    if (dx < 0 && mode === "reel") setMode("read");
    if (dx > 0 && mode === "read") setMode("reel");
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="pointer-events-none sticky top-[57px] z-10 flex justify-center py-2">
        <div className="pointer-events-auto flex rounded-full border border-line bg-surface/95 p-0.5 font-label text-xs uppercase tracking-wide shadow-lg backdrop-blur">
          <button
            type="button"
            onClick={() => setMode("reel")}
            className={clsx(
              "rounded-full px-4 py-1.5 transition-colors",
              mode === "reel" ? "bg-accent text-white" : "text-muted",
            )}
          >
            Reel
          </button>
          <button
            type="button"
            onClick={() => setMode("read")}
            className={clsx(
              "rounded-full px-4 py-1.5 transition-colors",
              mode === "read" ? "bg-accent text-white" : "text-muted",
            )}
          >
            Read
          </button>
        </div>
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={mode === "reel" ? "-mt-[52px] flex-1" : "flex-1"}
      >
        {mode === "reel" ? (
          <ReelView cases={cases} path={path} />
        ) : (
          <div>
            {cases.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted">
                No cases yet — be the first to share one.
              </p>
            ) : (
              cases.map((c) => <CaseCard key={c.id} feedCase={c} path={path} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
