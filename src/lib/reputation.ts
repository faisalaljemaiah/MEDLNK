import type { ContributionStats } from "@/lib/profile";

export type ReputationTier = {
  label: string;
  /** One sentence, always shown with the label — see ReputationBadge. */
  description: string;
};

/**
 * Reputation (spec §18), deliberately built on top of ContributionStats
 * rather than beside it. Two constraints from that file carry over unchanged:
 *
 * - Contribution-based, not follower-based: follower count is not an input at
 *   all, same reasoning as ProfileStats — mixing it in turns a teaching record
 *   into a popularity contest.
 * - Never a single publishable score: the weighted total below exists only to
 *   pick a tier label out of five, and is not itself exposed anywhere. A
 *   number invites optimizing the number; a tier with a one-line disclaimer
 *   does not.
 *
 * Patient-safety contributions are weighted highest on purpose — a near miss
 * or safety alert, and reactions marking a case patient_safety, are the
 * clearest signal this network exists to surface in the first place.
 */
export function computeReputationTier(stats: ContributionStats): ReputationTier {
  const score =
    stats.casesShared * 2 +
    stats.safetyPosts * 4 +
    stats.teachingCases * 2 +
    stats.repliesWritten * 1 +
    stats.signal.interesting * 1 +
    stats.signal.changed_thinking * 2 +
    stats.signal.patient_safety * 3;

  if (score >= 120) {
    return {
      label: "Core contributor",
      description:
        "A sustained record of teaching and patient-safety contributions on MEDLNK.",
    };
  }
  if (score >= 45) {
    return {
      label: "Trusted contributor",
      description:
        "A consistent contribution history, including work other clinicians marked as valuable.",
    };
  }
  if (score >= 12) {
    return {
      label: "Active contributor",
      description: "A growing contribution history on MEDLNK.",
    };
  }
  return {
    label: "New contributor",
    description: "Just getting started sharing cases and replies.",
  };
}
