import type { ReputationTier } from "@/lib/reputation";

/**
 * Renders only the tier label and its disclaimer — never the underlying
 * score. See computeReputationTier for why.
 */
export function ReputationBadge({ tier }: { tier: ReputationTier }) {
  if (tier.label === "New contributor") return null;

  return (
    <div className="mt-2 flex flex-col gap-1">
      <span className="inline-flex w-fit items-center rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 font-label text-xs text-accent">
        {tier.label}
      </span>
      <p className="text-xs text-muted">
        {tier.description} Reflects contribution history, not clinical
        competence.
      </p>
    </div>
  );
}
