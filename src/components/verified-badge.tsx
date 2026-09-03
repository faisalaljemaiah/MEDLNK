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
      className={clsx("ml-1", tier ? TIER_CLASS[tier] : "text-badge-verified", className)}
    >
      ✓{label && " verified"}
    </span>
  );
}
