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
import { LOCALES, localeDir, t } from "@/lib/i18n";
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
  // Signed-out, so there's no saved preference yet — English by default.
  // Switching it re-renders this page in that language right away and is
  // stored on the new profile (handle_new_user, 0035), so every step after
  // this one follows it too.
  const [locale, setLocale] = useState<Locale>("en");
  const ar = locale === "ar";
  // Arabic labels run longer ("البريد الإلكتروني"); one shared width keeps
  // every value in the two groups lined up.
  const labelWidth = ar ? 140 : 108;

  return (
    <FlowScreen
      dir={localeDir(locale)}
      lang={locale}
      nav={
        <>
          <Link href="/welcome" aria-label={t(locale, "signup.home")}>
            <LogoMark size={30} />
          </Link>
          <GlassPillLink href="/login">{t(locale, "signup.signIn")}</GlassPillLink>
        </>
      }
    >
      <AnalyticsPageView event="signup_viewed" />
      <StampTitle className="mt-3">
        {t(locale, "signup.titleLine1")}
        <br />
        {t(locale, "signup.titleLine2")}
      </StampTitle>
      <Lede>{t(locale, "signup.lede")}</Lede>

      <form action={action} className="flex flex-1 flex-col">
        <input type="hidden" name="locale" value={locale} />
        <GroupedList>
          <InputRow
            label={t(locale, "signup.firstName")}
            labelWidth={labelWidth}
            name="first_name"
            autoComplete="given-name"
            placeholder={t(locale, "flow.required")}
            required
          />
          <InputRow
            label={t(locale, "signup.lastName")}
            labelWidth={labelWidth}
            name="last_name"
            autoComplete="family-name"
            placeholder={t(locale, "flow.required")}
            required
          />
        </GroupedList>

        <GroupedList className="mt-3.5">
          <InputRow
            label={t(locale, "signup.email")}
            labelWidth={labelWidth}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            dir="ltr"
            placeholder="name@example.com"
            required
          />
          <InputRow
            label={t(locale, "signup.password")}
            labelWidth={labelWidth}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            placeholder={t(locale, "flow.required")}
            required
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={t(locale, showPassword ? "signup.hidePassword" : "signup.showPassword")}
                className="-me-1 flex size-9 shrink-0 items-center justify-center rounded-full active:opacity-60"
              >
                <EyeIcon open={showPassword} />
              </button>
            }
          />
        </GroupedList>
        <GroupFooter>{t(locale, "signup.passwordHint")}</GroupFooter>

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
              {t(locale, "signup.agreePrefix")}{" "}
              <Link href="/terms" className="font-semibold text-accent underline-offset-2 hover:underline">
                {t(locale, "signup.terms")}
              </Link>{" "}
              {t(locale, "signup.and")}
              {ar ? "" : " "}
              <Link href="/privacy" className="font-semibold text-accent underline-offset-2 hover:underline">
                {t(locale, "signup.privacy")}
              </Link>
              {t(locale, "signup.agreeSuffix")}
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
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12.5px] font-medium text-muted">
            <span>🩺 {t(locale, "signup.trustClinicians")}</span>
            <span>🔒 {t(locale, "signup.trustDeidentified")}</span>
            <span>✨ {t(locale, "signup.trustFree")}</span>
          </div>
          <CapsuleSubmit disabled={!agreed} pendingLabel={t(locale, "flow.pleaseWait")}>
            {t(locale, "signup.createAccount")}
          </CapsuleSubmit>
          {/* A quiet utility control, not a decision the page leads with —
              it only needs to be findable. */}
          <div
            role="group"
            aria-label={t(locale, "signup.language")}
            className="flex items-center justify-center gap-2 text-[13px] text-muted"
          >
            {LOCALES.map((l, i) => (
              <span key={l.value} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden="true">·</span>}
                <button
                  type="button"
                  lang={l.value}
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
