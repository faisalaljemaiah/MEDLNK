"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type MfaEnrollResult =
  | { error: string }
  | { factorId: string; qrCode: string; secret: string };

/**
 * Starts TOTP enrollment for the signed-in viewer — returns the QR code
 * (already a data: URI per Supabase's own enroll() response) and the
 * secret for manual entry, so Settings can render both without a second
 * round trip.
 */
export async function startMfaEnrollmentAction(): Promise<MfaEnrollResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again to continue." };

  // An abandoned attempt (QR shown, never confirmed) leaves an unverified
  // factor behind on the account — Supabase caps factors per user, so clear
  // those out before starting a fresh one rather than letting them pile up
  // across repeated visits to this section.
  const { data: existing } = await supabase.auth.mfa.listFactors();
  for (const factor of existing?.all ?? []) {
    if (factor.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: "Asyashare",
  });
  if (error || !data.totp) {
    return { error: error?.message ?? "Could not start setup. Try again." };
  }
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

/** The one-time code from the authenticator app that turns an unverified
 *  enrollment into a real, active factor. */
export async function confirmMfaEnrollmentAction(
  factorId: string,
  code: string,
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

/** Removes every factor on the viewer's own account — there's only ever
 *  one in this app's UI (a single "set up 2FA" toggle, not a factor list),
 *  but this clears all of them rather than assuming exactly one exists. */
export async function disableMfaAction(): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  for (const factor of data?.all ?? []) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) return { error: error.message };
  }
  return { ok: true };
}

export type VerifyMfaState = { error: string } | undefined;

/**
 * The code entered on /verify-2fa after a password sign-in — this is the
 * step that actually raises the session from aal1 to aal2. Looks up the
 * viewer's own verified TOTP factor itself rather than trusting a
 * client-supplied factor id; there's normally only one, and finding none
 * here means this account doesn't actually have MFA enrolled (a stale
 * client state), so it just moves on instead of dead-ending.
 */
export async function verifyMfaLoginAction(
  _prevState: VerifyMfaState,
  formData: FormData,
): Promise<VerifyMfaState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Enter the 6-digit code." };

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totp = factors?.totp?.[0];
  if (!totp) redirect("/");

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: totp.id,
    code,
  });
  if (error) return { error: error.message };

  redirect("/");
}
