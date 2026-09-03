import { clsx } from "clsx";
import type { BadgeTier } from "@/lib/database.types";

const TIER_CLASS: Record<BadgeTier, string> = {
  diamond: "text-badge-diamond",
  gold: "text-badge-gold",
  platinum: "text-badge-platinum",
  green: "text-positive",
};

/**
 * The verified checkmark, everywhere it appears. Callers already gate this
 * behind `author.verified` (or equivalent) — this only decides the color:
 * plain blue by default, or one of four prestige tiers layered on top (see
 * src/lib/verification-tier.ts and 0034_verified_badge_tier.sql). Never
 * rendered for `tier` alone without a `verified` check upstream.
 *
 * A filled circle with a white check cut into it (Twitter/Instagram's
 * verified badge shape) reads as a real credential at a glance, rather than
 * a bare "✓" that could be mistaken for a checkbox or list marker. The
 * circle's own color is what carries the tier — currentColor fill, so the
 * same TIER_CLASS text-color classes that colored the old glyph still work
 * unchanged.
 */
export function VerifiedBadge({
  tier,
  label = false,
  className,
}: {
  tier: BadgeTier | null;
  /** Case detail page only — spells out "verified" next to the check. */
  label?: boolean;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "ml-1 inline-flex items-center gap-1 align-middle -translate-y-px",
        tier ? TIER_CLASS[tier] : "text-badge-verified",
        className,
      )}
    >
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <circle cx="10" cy="10" r="10" />
        <path
          d="M6 10.3l2.4 2.4L14 7"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {label && "verified"}
    </span>
  );
}
