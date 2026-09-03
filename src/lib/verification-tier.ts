import type { BadgeTier } from "@/lib/database.types";

/**
 * Diamond and Gold are the only two tiers with an automatic rule: the first
 * 10 members ever verified get Diamond, the next 90 (11th-100th) get Gold.
 * `rank` is 1-based — the count of already-verified members before this one,
 * plus one. Platinum and Green have no automatic rule (yet) and are set by
 * hand via setBadgeTierAction; this function never returns either.
 */
export function tierForVerificationRank(rank: number): BadgeTier | null {
  if (rank <= 10) return "diamond";
  if (rank <= 100) return "gold";
  return null;
}
