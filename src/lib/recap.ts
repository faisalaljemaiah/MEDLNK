import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getFeedCases } from "@/lib/cases";
import { isClinicalReaction } from "@/lib/reaction-types";

type Client = SupabaseClient<Database>;

export type SpecialtyInterest = { label: string; count: number };

export type UserRecap = {
  /** null when there's no engagement signal yet (a brand-new account) —
   *  the recap page shows an honest "still finding your specialty" state
   *  rather than a fabricated one. */
  topSpecialty: SpecialtyInterest | null;
  specialtiesExplored: number;
  casesFollowed: number;
  /** Any of the three clinical-value reactions given, same "marked" the
   *  profile page's own tab uses — not a like count. */
  casesMarked: number;
  casesShared: number;
  topFollowedCase: { title: string; caseNumber: string | null } | null;
  personality: { label: string; description: string };
};

/**
 * Groups by trim().toLowerCase(), displays first-seen original casing — the
 * same free-text-column convention getPractitionerTypeBreakdown/
 * getSpecialtyBreakdown (src/lib/analytics.ts) already use for this exact
 * problem (profiles.specialty/cases.specialty are free text, not an enum).
 */
function bucketBySpecialty(specialties: (string | null)[]): SpecialtyInterest[] {
  const counts = new Map<string, number>();
  const display = new Map<string, string>();
  for (const raw of specialties) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!display.has(key)) display.set(key, trimmed);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ label: display.get(key)!, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Rule-based, not ML — same "documented, arbitrary-but-stated threshold"
 * spirit as the reputation tier cutoffs (src/lib/reputation.ts). Every input
 * is a real count; only where the lines fall between labels is a judgment
 * call, made once and named here rather than re-guessed per caller.
 */
function computePersonality(
  interests: SpecialtyInterest[],
  casesShared: number,
  casesFollowed: number,
): { label: string; description: string } {
  const totalSignal = interests.reduce((sum, s) => sum + s.count, 0);

  if (totalSignal === 0 && casesShared === 0) {
    return {
      label: "The Newcomer",
      description: "Follow a case or react to one to start building your recap.",
    };
  }
  if (casesShared >= 3 && casesShared >= casesFollowed) {
    return {
      label: "The Contributor",
      description: "You share more than you follow — teaching by example.",
    };
  }
  const top = interests[0];
  const topShare = top && totalSignal > 0 ? top.count / totalSignal : 0;
  if (top && topShare >= 0.6 && interests.length <= 2) {
    return {
      label: "The Specialist",
      description: `Deep in ${top.label} — that's where you keep coming back to.`,
    };
  }
  if (interests.length >= 5) {
    return {
      label: "The Explorer",
      description: `You've engaged with ${interests.length} different specialties this year.`,
    };
  }
  return {
    label: "The Learner",
    description: "Steadily building a read on what interests you most.",
  };
}

/**
 * One clinician's own "wrapped"-style recap — every number a real count,
 * nothing inferred beyond the personality label's rule-based framing above.
 * Built on the same fetch-everything getFeedCases pattern as
 * getPersonalAnalytics/getProfileByHandle rather than a dedicated table:
 * this is a personal, occasional view, not a hot path.
 */
export async function getUserRecap(
  supabase: Client,
  userId: string,
): Promise<UserRecap> {
  const [allCases, followedRowsRes, commentedRowsRes] = await Promise.all([
    getFeedCases(supabase, userId),
    supabase.from("case_followers").select("case_id").eq("user_id", userId),
    supabase.from("comments").select("case_id").eq("user_id", userId),
  ]);

  const byId = new Map(allCases.map((c) => [c.id, c]));
  const followedIds = (followedRowsRes.data ?? []).map((r) => r.case_id);
  const commentedIds = (commentedRowsRes.data ?? []).map((r) => r.case_id);
  const markedCases = allCases.filter((c) =>
    c.viewerReactions.some(isClinicalReaction),
  );

  // Every real signal that a case held someone's attention — marked,
  // followed, or replied to — counts once toward its specialty, regardless
  // of which of the three it was.
  const interestSpecialties = [
    ...markedCases.map((c) => c.specialty),
    ...followedIds.map((id) => byId.get(id)?.specialty ?? null),
    ...commentedIds.map((id) => byId.get(id)?.specialty ?? null),
  ];
  const interests = bucketBySpecialty(interestSpecialties);

  const casesShared = allCases.filter((c) => c.author_id === userId).length;

  const topFollowedCaseId = followedIds[followedIds.length - 1];
  const topFollowedCaseRow = topFollowedCaseId ? byId.get(topFollowedCaseId) : null;

  return {
    topSpecialty: interests[0] ?? null,
    specialtiesExplored: interests.length,
    casesFollowed: followedIds.length,
    casesMarked: markedCases.length,
    casesShared,
    topFollowedCase: topFollowedCaseRow
      ? { title: topFollowedCaseRow.title, caseNumber: topFollowedCaseRow.case_number }
      : null,
    personality: computePersonality(interests, casesShared, followedIds.length),
  };
}
