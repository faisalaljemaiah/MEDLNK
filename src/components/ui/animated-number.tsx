"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts smoothly from the previous value to a new one instead of popping —
 * for stat cards whose numbers can change under a mounted client tree (e.g.
 * a live refresh). On first mount, or when reduced motion is requested,
 * there's nothing to animate from, so it just renders the value.
 */
export function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev === value) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      prevRef.current = value;
      const raf = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(raf);
    }

    const duration = 500;
    const start = performance.now();
    let raf = 0;

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(prev + (value - prev) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = value;
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{display.toLocaleString()}</>;
}
