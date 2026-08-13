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
 * - Never a single publishable score *about someone to other people*: on a
 *   profile page, ReputationBadge shows only the tier below, never this
 *   number. A number on a page other people visit invites optimizing the
 *   number; a tier with a one-line disclaimer does not.
 *
 * The raw score IS shown once, deliberately: on the viewer's own Home
 * dashboard, to themselves. That's a different situation — you already know
 * every action behind your own number, there's no audience to perform for,
 * and a personal dashboard with nothing but tier labels reads as withholding
 * information from its own owner. `computeReputationScore` exists for that
 * one call site; every other view of a person's standing should keep using
 * `computeReputationTier` and go no further.
 *
 * Patient-safety contributions are weighted highest on purpose — a near miss
 * or safety alert, and reactions marking a case patient_safety, are the
 * clearest signal this network exists to surface in the first place.
 */
export function computeReputationScore(stats: ContributionStats): number {
  return (
    stats.casesShared * 2 +
    stats.safetyPosts * 4 +
    stats.teachingCases * 2 +
    stats.repliesWritten * 1 +
    stats.signal.interesting * 1 +
    stats.signal.changed_thinking * 2 +
    stats.signal.patient_safety * 3
  );
}

export function computeReputationTier(stats: ContributionStats): ReputationTier {
  const score = computeReputationScore(stats);

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
