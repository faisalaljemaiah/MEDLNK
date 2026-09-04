"use client";

import { useActionState, useState } from "react";
import { clsx } from "clsx";
import Link from "next/link";
import { signUpAction } from "@/app/actions/auth";
import { TextField } from "@/components/ui/text-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { AnalyticsPageView } from "@/components/analytics-page-view";
import { LogoMark } from "@/components/brand";
import { LOCALES } from "@/lib/i18n";
import type { Locale } from "@/lib/database.types";

export default function SignUpPage() {
  const [state, action] = useActionState(signUpAction, undefined);
  const [agreed, setAgreed] = useState(false);
  // No server-side signal to default this from yet — the account doesn't
  // exist until this form submits. English first, since that's this list's
  // first entry and the app's existing default everywhere else a locale is
  // unset (0021).
  const [locale, setLocale] = useState<Locale>("en");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <AnalyticsPageView event="signup_viewed" />
      <Link
        href="/welcome"
        className="animate-welcome-logo flex flex-col items-center gap-3 text-center"
      >
        <LogoMark size={40} />
        <h1 className="font-headline text-2xl text-text">Join Asyashare</h1>
        <p className="text-sm text-muted">
          A clinical knowledge network for verified medical professionals.
        </p>
      </Link>

      <form
        action={action}
        className="animate-welcome-rise flex flex-col gap-4"
        style={{ animationDelay: "120ms" }}
      >
        <input type="hidden" name="locale" value={locale} />
        <div className="flex flex-col gap-1.5">
          <span className="font-label text-xs uppercase tracking-wide text-muted">
            Preferred language
          </span>
          <div className="flex gap-2">
            {LOCALES.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLocale(l.value)}
                aria-pressed={locale === l.value}
                className={clsx(
                  "flex-1 rounded-lg border px-3.5 py-2.5 text-sm transition-colors duration-150",
                  locale === l.value
                    ? "border-accent bg-accent/10 font-medium text-accent"
                    : "border-line text-muted hover:text-text",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        {state && "error" in state && (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}
        {state && "message" in state && (
          <p className="text-sm text-accent" role="status">
            {state.message}
          </p>
        )}
        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-muted">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            required
            className="mt-0.5 size-3.5 shrink-0 accent-[var(--accent)]"
          />
          <span>
            I agree to Asyashare&apos;s{" "}
            <Link href="/terms" className="text-accent hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-accent hover:underline">
              Privacy Policy
            </Link>
            , including the requirement that everything I post is fully
            de-identified.
          </span>
        </label>
        <SubmitButton disabled={!agreed}>Create account</SubmitButton>
      </form>

      <p
        className="animate-welcome-rise text-center text-sm text-muted"
        style={{ animationDelay: "220ms" }}
      >
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
