import { clsx } from "clsx";

/**
 * The app's actual mark — a bold "A" stamped into a badge, reusing --accent
 * (the warm ink charcoal) so the mark and every interactive color in the
 * app read as the same ink. Every screen used to show the name in plain
 * running text and nothing else; this is the one recognizable shape that
 * makes a screenshot identifiable as Asyashare rather than "some app."
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
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-[28%] border border-line bg-surface font-headline font-extrabold text-accent",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.56 }}
    >
      A
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
