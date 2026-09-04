"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { trackEventAction } from "@/app/actions/analytics";
import { LOCALES } from "@/lib/i18n";

export type AuthFormState =
  | { error: string }
  | { message: string }
  | undefined;

export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const rawLocale = String(formData.get("locale") ?? "");
  // Carried through auth.users.raw_user_meta_data into the new profile row
  // by the handle_new_user trigger (0035) — same mechanism full_name already
  // used, and the trigger itself falls back to 'en' for anything outside
  // this list, so an invalid value here is harmless rather than needing its
  // own error path.
  const locale = LOCALES.some((l) => l.value === rawLocale) ? rawLocale : "en";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { locale } },
  });

  if (error) {
    return { error: error.message };
  }

  await trackEventAction("signup_completed");

  if (!data.session) {
    return {
      message:
        "Check your email to confirm your account, then sign in to finish setting up your profile.",
    };
  }

  redirect("/onboarding");
}

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
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
