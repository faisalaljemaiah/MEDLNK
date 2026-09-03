import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

const MAX_ATTEMPTS = 3;
const WINDOW_DAYS = 30;

export type VerificationAttemptStatus = {
  attemptsUsed: number;
  attemptsRemaining: number;
  /** When the oldest attempt in the current window ages out and a new
   *  resubmission becomes possible again. Null once attemptsRemaining > 0. */
  nextEligibleAt: string | null;
};

/**
 * Mirrors 0033_verification_resubmission_limit.sql's trigger exactly (same
 * 3-per-30-days count, same window) so the onboarding page can tell a
 * rejected member where they stand *before* they fill out the form again,
 * instead of only finding out from the trigger's error at submit time.
 */
export async function getVerificationAttemptStatus(
  supabase: Client,
  profileId: string,
): Promise<VerificationAttemptStatus> {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("verification_attempts")
    .select("created_at")
    .eq("profile_id", profileId)
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const attempts = data ?? [];
  const attemptsUsed = attempts.length;
  const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - attemptsUsed);

  const nextEligibleAt =
    attemptsRemaining === 0 && attempts[0]
      ? new Date(
          new Date(attempts[0].created_at).getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString()
      : null;

  return { attemptsUsed, attemptsRemaining, nextEligibleAt };
}
