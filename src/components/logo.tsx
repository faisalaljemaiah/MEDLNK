import { clsx } from "clsx";

/**
 * Placeholder logo mark — an ECG/pulse-line glyph in a rounded square.
 * Refine later; keep using this component so a redesign is a one-file change.
 */
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <div
      className={clsx(
        "flex items-center justify-center rounded-xl bg-accent/15 text-accent",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="2 12 7 12 9.5 5 13 19 15.5 12 22 12" />
      </svg>
    </div>
  );
}
