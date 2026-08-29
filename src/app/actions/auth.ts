"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

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

  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

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

/** Same origin-detection every Vercel deploy needs — no NEXT_PUBLIC_SITE_URL
 *  exists in this project, so the redirect target is derived from the
 *  request itself rather than a hardcoded/env-configured URL that would
 *  drift from whatever preview/production domain actually served the
 *  request. */
async function requestOrigin() {
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
