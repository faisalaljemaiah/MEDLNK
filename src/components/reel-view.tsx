"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ReelSlide } from "@/components/reel-slide";
import type { FeedCase } from "@/lib/cases";

const DRAG_THRESHOLD = 70;
const ROTATE_FACTOR = 0.09;
const MAX_ROTATE = 24;
// A one-off overshoot spring, not the app's usual --motion-ease: this is the
// one interaction meant to feel like a physical wheel settling into place
// rather than a UI panel easing to rest.
const SETTLE_TRANSITION = "transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)";

/**
 * Spool: cases as a stack of circles you turn rather than a list you scroll.
 * Dragging translates and rotates the current card together — rotating
 * around its own center reads as "spinning the reel," not just moving it —
 * and releasing past DRAG_THRESHOLD commits to the next/previous card with a
 * spring-like settle. Plain pointer events + CSS transforms, no gesture
 * library: the only physics this needs is a drag distance and a threshold,
 * not velocity/momentum projection.
 */
export function ReelView({ cases, path }: { cases: FeedCase[]; path: string }) {
  const [index, setIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);
  const wheelLockRef = useRef(false);

  const goTo = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(cases.length - 1, next)));
      dragOffsetRef.current = 0;
      setDragOffset(0);
    },
    [cases.length],
  );

  function onPointerDown(e: React.PointerEvent) {
    startYRef.current = e.clientY;
    setDragging(true);
  }

  // Tracked on window, not the element's own handlers — a drag that leaves
  // the card (fast flick) must still resolve on release, not get stranded
  // mid-gesture the moment the pointer crosses the card's edge.
  useEffect(() => {
    if (!dragging) return;

    function onMove(e: PointerEvent) {
      if (startYRef.current === null) return;
      const offset = e.clientY - startYRef.current;
      dragOffsetRef.current = offset;
      setDragOffset(offset);
    }
    function onUp() {
      const delta = dragOffsetRef.current;
      startYRef.current = null;
      setDragging(false);
      if (delta < -DRAG_THRESHOLD) goTo(index + 1);
      else if (delta > DRAG_THRESHOLD) goTo(index - 1);
      else {
        dragOffsetRef.current = 0;
        setDragOffset(0);
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, index, goTo]);

  function onWheel(e: React.WheelEvent) {
    if (wheelLockRef.current || Math.abs(e.deltaY) < 20) return;
    wheelLockRef.current = true;
    goTo(index + (e.deltaY > 0 ? 1 : -1));
    setTimeout(() => {
      wheelLockRef.current = false;
    }, 500);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") goTo(index + 1);
      else if (e.key === "ArrowUp") goTo(index - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, goTo]);

  if (cases.length === 0) {
    return (
      <div className="spool-backdrop flex h-[calc(100dvh-145px)] w-full shrink-0 items-center justify-center text-sm text-white/70">
        No cases yet — be the first to share one.
      </div>
    );
  }

  const rotate = Math.max(-MAX_ROTATE, Math.min(MAX_ROTATE, dragOffset * ROTATE_FACTOR));

  return (
    <div
      className="spool-backdrop relative h-[calc(100dvh-145px)] w-full touch-none select-none overflow-hidden"
      onPointerDown={onPointerDown}
      onWheel={onWheel}
      tabIndex={0}
      role="region"
      aria-label="Case reel — drag, scroll, or use the arrow keys to browse"
    >
      {cases.map((c, i) => {
        const relative = i - index;
        // Only the current card and its immediate neighbors ever need to be
        // mounted — every other position is off-screen, and an autoplaying
        // <video> in each one adds up fast if left mounted.
        if (Math.abs(relative) > 1) return null;
        return (
          <div
            key={c.id}
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `translateY(calc(${relative * 100}% + ${dragging ? dragOffset : 0}px)) rotate(${relative === 0 ? rotate : 0}deg)`,
              transition: dragging ? "none" : SETTLE_TRANSITION,
            }}
            aria-hidden={relative !== 0}
          >
            <ReelSlide feedCase={c} path={path} />
          </div>
        );
      })}
    </div>
  );
}
