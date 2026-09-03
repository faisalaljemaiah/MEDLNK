import { clsx } from "clsx";
import type { BadgeTier } from "@/lib/database.types";

const TIER_CLASS: Record<Exclude<BadgeTier, "diamond">, string> = {
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
 * a bare "✓" that could be mistaken for a checkbox or list marker. Every
 * tier but Diamond colors that circle with currentColor (see TIER_CLASS);
 * Diamond gets its own treatment below since a flat fill can't do what an
 * actual diamond does.
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
        tier && tier !== "diamond" ? TIER_CLASS[tier] : "text-badge-verified",
        className,
      )}
    >
      {tier === "diamond" ? (
        // See .diamond-badge/.diamond-badge-spin in globals.css: a moving
        // conic gradient in the diamond's own colors, with the checkmark
        // itself cut out as a real transparent hole (a CSS mask) instead of
        // painted white — light through a facet, not a flat check.
        <span className="diamond-badge" style={{ width: 14, height: 14 }} aria-hidden="true">
          <span className="diamond-badge-spin" />
          <svg className="diamond-badge-outline" viewBox="0 0 20 20">
            <path
              d="M6 10.3l2.4 2.4L14 7"
              stroke="black"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </span>
      ) : (
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
      )}
      {label && "verified"}
    </span>
  );
}
