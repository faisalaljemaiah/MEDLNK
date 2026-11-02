"use client";

import { useActionState, useState } from "react";
import { clsx } from "clsx";
import Link from "next/link";
import { signUpAction } from "@/app/actions/auth";
import { AnalyticsPageView } from "@/components/analytics-page-view";
import { LogoMark } from "@/components/brand";
import {
  CapsuleSubmit,
  CheckCircle,
  EmptyCircle,
  FlowScreen,
  FormError,
  GlassPillLink,
  GroupFooter,
  GroupedList,
  InputRow,
  Lede,
  StampTitle,
} from "@/components/ui/ios";
import { LOCALES } from "@/lib/i18n";
import type { Locale } from "@/lib/database.types";

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" aria-hidden className="text-muted">
      <path d="M1.5 8S5 1.5 11 1.5 20.5 8 20.5 8 17 14.5 11 14.5 1.5 8 1.5 8Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="11" cy="8" r="3.2" fill="currentColor" />
      {!open && <path d="M3 1.5 19 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
    </svg>
  );
}

export default function SignUpPage() {
  const [state, action] = useActionState(signUpAction, undefined);
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // No server-side signal to default this from yet — the account doesn't
  // exist until this form submits. English first, since that's this list's
  // first entry and the app's existing default everywhere else a locale is
  // unset (0021).
  const [locale, setLocale] = useState<Locale>("en");

  return (
    <FlowScreen
      nav={
        <>
          <Link href="/welcome" aria-label="Asyashare home">
            <LogoMark size={30} />
          </Link>
          <GlassPillLink href="/login">Sign In</GlassPillLink>
        </>
      }
    >
      <AnalyticsPageView event="signup_viewed" />
      <StampTitle className="mt-3">
        Create your
        <br />
        account.
      </StampTitle>
      <Lede>A clinical knowledge network for verified medical professionals.</Lede>

      <form action={action} className="flex flex-1 flex-col">
        <input type="hidden" name="locale" value={locale} />
        <GroupedList>
          <InputRow label="First name" name="first_name" autoComplete="given-name" placeholder="Required" required />
          <InputRow label="Last name" name="last_name" autoComplete="family-name" placeholder="Required" required />
        </GroupedList>

        <GroupedList className="mt-3.5">
          <InputRow
            label="Email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="name@example.com"
            required
          />
          <InputRow
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            placeholder="Required"
            required
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="-mr-1 flex size-9 items-center justify-center rounded-full active:opacity-60"
              >
                <EyeIcon open={showPassword} />
              </button>
            }
          />
        </GroupedList>
        <GroupFooter>At least 8 characters.</GroupFooter>

        <GroupedList className="mt-4">
          <label className="flex cursor-pointer items-start gap-3 px-4 py-3 text-[15px] leading-[1.35] text-text focus-within:bg-accent-soft/40">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              required
              className="sr-only"
            />
            {agreed ? <CheckCircle /> : <EmptyCircle />}
            <span>
              I agree to the{" "}
              <Link href="/terms" className="font-semibold text-accent underline-offset-2 hover:underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-semibold text-accent underline-offset-2 hover:underline">
                Privacy Policy
              </Link>
              , including that everything I post is fully de-identified.
            </span>
          </label>
        </GroupedList>

        {state && "error" in state && <FormError>{state.error}</FormError>}
        {state && "message" in state && (
          <p role="status" className="px-4 pt-3 text-[13px] text-accent">
            {state.message}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-3 pt-8">
          <div className="flex justify-center gap-4 text-[12.5px] font-medium text-muted">
            <span>🩺 Clinicians only</span>
            <span>🔒 De-identified</span>
            <span>✨ Free</span>
          </div>
          <CapsuleSubmit disabled={!agreed}>Create Account</CapsuleSubmit>
          {/* A quiet utility control, not a decision the page leads with —
              the language itself is what a signed-out visitor needs to read
              everything above, so it only needs to be findable. */}
          <div role="group" aria-label="Preferred language" className="flex items-center justify-center gap-2 text-[13px] text-muted">
            {LOCALES.map((l, i) => (
              <span key={l.value} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden="true">·</span>}
                <button
                  type="button"
                  onClick={() => setLocale(l.value)}
                  aria-pressed={locale === l.value}
                  className={clsx(locale === l.value ? "font-semibold text-text" : "hover:text-text")}
                >
                  {l.label}
                </button>
              </span>
            ))}
          </div>
        </div>
      </form>
    </FlowScreen>
  );
}
