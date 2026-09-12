import { clsx } from "clsx";
import { BRAND_MARK_VIEWBOX, BRAND_MARK_TRANSFORM, BRAND_MARK_PATH } from "@/lib/brand-mark";

/**
 * The app's actual mark — a stamped, textured "A", reusing --accent (the
 * warm ink charcoal) via currentColor so it and every interactive color in
 * the app read as the same ink. Inlined rather than referenced as an <img>:
 * an externally-loaded SVG can't pick up currentColor from the surrounding
 * page, so this is the only way size and color both stay controllable via
 * props/className the way every other call site already expects. No badge
 * box around it — the mark carries its own shape now, unlike the plain "A"
 * glyph this replaced.
 */
export function LogoMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={clsx("inline-flex shrink-0 items-center justify-center text-accent", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={BRAND_MARK_VIEWBOX}
        fill="currentColor"
        width="100%"
        height="100%"
        role="img"
        aria-label="Asyashare mark"
      >
        <g transform={BRAND_MARK_TRANSFORM}>
          <path d={BRAND_MARK_PATH} />
        </g>
      </svg>
    </span>
  );
}

/**
 * The tracked-caps wordmark from the brand reference — wide letter-spacing
 * on the full name, distinct from the tighter -0.01em .font-headline uses
 * at running sizes elsewhere. Small text only; at anything above ~text-sm
 * this much tracking reads as broken, not deliberate.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx("font-headline font-bold uppercase tracking-[0.2em]", className)}>
      Asyashare
    </span>
  );
}

/** The mark + wordmark side by side — the header/sidebar/auth-screen lockup. */
export function Logo({
  markSize = 28,
  className,
  wordmarkClassName,
}: {
  markSize?: number;
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={clsx("flex items-center gap-2", className)}>
      <LogoMark size={markSize} />
      <Wordmark className={wordmarkClassName} />
    </span>
  );
}
