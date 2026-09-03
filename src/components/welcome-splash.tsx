"use client";

import { useLayoutEffect, useRef } from "react";

const SEEN_KEY = "medlnk-splash-seen";

/**
 * A brief opening beat before /welcome's own entrance (.animate-welcome-*
 * in globals.css) plays. Plays once per browser session — sessionStorage
 * skips it on every visit after the first, since /welcome can be reached
 * repeatedly (e.g. tapping the signed-out profile tab), not just on the
 * app's first-ever open.
 *
 * Removes itself via direct DOM mutation rather than React state: the
 * server and first client render must stay identical to avoid a hydration
 * mismatch, so the "already seen" skip can't be a conditional render — it's
 * an imperative removal in a layout effect (before paint, so a repeat
 * visit shows no flash) instead.
 */
export function WelcomeSplash() {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (sessionStorage.getItem(SEEN_KEY)) {
      ref.current?.remove();
    } else {
      sessionStorage.setItem(SEEN_KEY, "1");
    }
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      onAnimationEnd={(e) => e.currentTarget.remove()}
      className="animate-splash fixed inset-0 z-50 flex items-center justify-center bg-bg"
    >
      <h1 className="font-headline text-3xl text-text">Asyashare</h1>
    </div>
  );
}
