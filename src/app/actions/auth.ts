"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackEventAction } from "@/app/actions/analytics";
import { LOCALES } from "@/lib/i18n";
import { sanitizeNextPath } from "@/lib/redirect-target";

export type AuthFormState =
  | { error: string }
  | { message: string }
  | undefined;


export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const rawLocale = String(formData.get("locale") ?? "");
  // Carried through auth.users.raw_user_meta_data into the new profile row
  // by the handle_new_user trigger (0035) — same mechanism full_name already
  // used, and the trigger itself falls back to 'en' for anything outside
  // this list, so an invalid value here is harmless rather than needing its
  // own error path.
  const locale = LOCALES.some((l) => l.value === rawLocale) ? rawLocale : "en";

  if (!fullName) {
    return { error: "Your name is required." };
  }
  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  // Checked with the service-role client, not the anon session — the RLS
  // policy on blocked_emails is admin-select-only, so an unauthenticated
  // signup request would just see no rows either way. This is the only
  // gate: someone an admin has removed-and-blocked (blocked_emails, 0037)
  // never reaches supabase.auth.signUp at all.
  const admin = createAdminClient();
  const { data: blocked } = await admin
    .from("blocked_emails")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (blocked) {
    return { error: "You have been blocked from our app." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { locale, full_name: fullName } },
  });

  if (error) {
    return { error: error.message };
  }

  await trackEventAction("signup_completed");

  // No session yet means "Confirm email" is on for this project — the
  // account exists but can't do anything until the code emailed to them
  // (the "Confirm signup" template, sent as {{ .Token }} rather than a
  // link — see /verify-email) is entered back here.
  if (!data.session) {
    redirect(`/verify-email?email=${encodeURIComponent(email)}`);
  }

  redirect("/onboarding");
}

export type VerifyEmailFormState = { error: string } | undefined;

/**
 * The code from the "Confirm signup" email. type: "signup" is what tells
 * Supabase Auth this token is a signup confirmation rather than a
 * recovery/magic-link/email-change code — same token value the classic
 * confirmation-link flow uses, just entered by hand instead of clicked.
 * Success returns a session the same way clicking the link would, and this
 * server client (createClient(), src/lib/supabase/server.ts) persists it
 * into cookies the same way signInAction's signInWithPassword already does.
 */
export async function verifySignupOtpAction(
  _prevState: VerifyEmailFormState,
  formData: FormData,
): Promise<VerifyEmailFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const token = String(formData.get("code") ?? "").trim();

  if (!email || !token) {
    return { error: "Enter the code we emailed you." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/onboarding");
}

export type ResendCodeResult = { error: string } | { message: string };

export async function resendSignupOtpAction(email: string): Promise<ResendCodeResult> {
  if (!email) {
    return { error: "Missing email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) {
    return { error: error.message };
  }

  return { message: "We sent a new code." };
}

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = sanitizeNextPath(formData.get("next"));

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Signed up but never entered the code from the confirmation email (or
    // closed that tab) — send them back to finish that instead of a dead
    // end error, same as signUpAction sends a brand-new signup there.
    if (error.code === "email_not_confirmed") {
      redirect(`/verify-email?email=${encodeURIComponent(email)}`);
    }
    return { error: error.message };
  }

  // A password alone only ever reaches aal1 — an account with 2FA enrolled
  // (nextLevel "aal2") still needs the authenticator-app code before it's
  // actually signed in, so this sends them to that step instead of the
  // feed. The (app) layout enforces the same check on every page under it,
  // so this redirect is a better first landing, not the only gate.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
    redirect(next ? `/verify-2fa?next=${encodeURIComponent(next)}` : "/verify-2fa");
  }

  redirect(next ?? "/");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/**
 * NEXT_PUBLIC_SITE_URL first, when it's set — this value ends up embedded
 * in an email sent to whatever address the caller typed in, so it can't be
 * trusted from request headers alone. Origin/Host/X-Forwarded-Host are all
 * attacker-controlled on an unauthenticated POST: without this, someone
 * could spoof one of those headers and get a password-reset link pointing
 * at their own domain mailed to a victim's real inbox (Supabase's own
 * Redirect URL allowlist is a backstop, but shouldn't be the only one).
 * Falls back to header-derivation, same as before, only when the env var
 * isn't set — e.g. a Vercel preview deploy that doesn't have it configured.
 */
async function requestOrigin() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) return siteUrl;
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${proto}://${host}`;
}

/**
 * Always returns the same generic message whether or not the address has
 * an account — same "don't confirm which emails exist" stance Supabase's
 * own resetPasswordForEmail already takes at the API level, kept here too
 * so a slow response or a thrown error couldn't become a timing side
 * channel either.
 */
export async function requestPasswordResetAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Enter your email address." };
  }

  const supabase = await createClient();
  const origin = await requestOrigin();
  // Straight to /reset-password, not through a server-side code-exchange
  // route — this project's Supabase Auth is configured for the implicit
  // flow, so the recovery link redirects with the session in a URL hash
  // fragment (#access_token=...), which only client-side JS can ever see.
  // /reset-password itself picks that up via onAuthStateChange's
  // PASSWORD_RECOVERY event (see that page).
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  return {
    message:
      "If an account exists for that address, a password reset link is on its way.",
  };
}

export async function updatePasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  // Only a session established via the recovery link's callback (see
  // src/app/auth/callback/route.ts) can reach this successfully — RLS/Auth
  // itself is the real gate, this is just a clear message instead of a
  // confusing failure if someone lands here without one.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "That reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  redirect("/");
}
