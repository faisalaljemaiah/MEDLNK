import { clsx } from "clsx";

/**
 * The dashboard's "this interface is alive" ambient cue — three overlapping
 * wavy lines in MEDLNK's AI hues, drifting past each other at different
 * speeds behind the greeting text. Deliberately used in exactly one place
 * (the dashboard greeting) rather than scattered thin across the app.
 *
 * Pure SVG + CSS, no animation library: each path is a periodic sine-like
 * curve built from repeated smooth-quadratic ("T") segments, and the
 * translateX keyframe for each one moves it by exactly one period, so the
 * loop has no visible seam. prefers-reduced-motion freezes it for free via
 * the blanket animation-duration override in globals.css.
 */
export function MedLnkPulse({ className }: { className?: string }) {
  return (
    <div aria-hidden className={clsx("pointer-events-none overflow-hidden", className)}>
      <svg
        viewBox="0 0 800 120"
        preserveAspectRatio="none"
        className="h-full w-[130%]"
      >
        <defs>
          <linearGradient id="medlnk-wave-a" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--ai-hue-1)" stopOpacity="0" />
            <stop offset="30%" stopColor="var(--ai-hue-1)" stopOpacity="0.5" />
            <stop offset="65%" stopColor="var(--ai-hue-2)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--ai-hue-3)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="medlnk-wave-b" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--ai-hue-3)" stopOpacity="0" />
            <stop offset="35%" stopColor="var(--ai-hue-3)" stopOpacity="0.4" />
            <stop offset="70%" stopColor="var(--ai-hue-4)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--ai-hue-4)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="medlnk-wave-c" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--ai-hue-4)" stopOpacity="0" />
            <stop offset="35%" stopColor="var(--ai-hue-4)" stopOpacity="0.4" />
            <stop offset="70%" stopColor="var(--ai-hue-5)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--ai-hue-5)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Period 240 (nine points, 120 apart), main mid-height wave. */}
        <path
          className="medlnk-wave-path medlnk-wave-path-a"
          d="M-120,58 Q-60,36 0,58 T120,58 T240,58 T360,58 T480,58 T600,58 T720,58 T840,58 T960,58"
          fill="none"
          stroke="url(#medlnk-wave-a)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Period 200, upper, faster and thinner. */}
        <path
          className="medlnk-wave-path medlnk-wave-path-b"
          d="M-100,36 Q-50,20 0,36 T100,36 T200,36 T300,36 T400,36 T500,36 T600,36 T700,36 T800,36 T900,36"
          fill="none"
          stroke="url(#medlnk-wave-b)"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        {/* Period 280, lower, slower and mirrored phase (control point below the baseline). */}
        <path
          className="medlnk-wave-path medlnk-wave-path-c"
          d="M-140,84 Q-70,102 0,84 T140,84 T280,84 T420,84 T560,84 T700,84 T840,84 T980,84"
          fill="none"
          stroke="url(#medlnk-wave-c)"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
