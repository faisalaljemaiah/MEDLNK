"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";

const HOLD_MS = 700;
const FADE_MS = 450;

/**
 * A one-shot title card shown every time Spool is entered — mounts fresh on
 * each navigation to /spool (no persisted "seen it" state), holds briefly,
 * then fades out and unmounts, leaving the reel underneath. Reuses the
 * existing `.animate-enter` entrance and `.spool-backdrop` black rather than
 * defining new ones, so it reads as part of the same view, not a splash
 * screen bolted on top of it.
 */
export function SpoolIntro() {
  const [fading, setFading] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), HOLD_MS);
    const doneTimer = setTimeout(() => setVisible(false), HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={clsx(
        "spool-backdrop pointer-events-none absolute inset-0 z-20 flex items-center justify-center opacity-100 transition-opacity ease-out",
        fading && "opacity-0",
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <span className="animate-enter font-headline text-4xl tracking-[0.4em] text-white">
        SPOOL
      </span>
    </div>
  );
}
