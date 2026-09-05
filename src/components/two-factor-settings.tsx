"use client";

import { useState, useTransition } from "react";
import {
  startMfaEnrollmentAction,
  confirmMfaEnrollmentAction,
  disableMfaAction,
} from "@/app/actions/mfa";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/database.types";

type Enrollment = { factorId: string; qrCode: string; secret: string };

export function TwoFactorSettings({
  enabled: initialEnabled,
  locale,
}: {
  enabled: boolean;
  locale: Locale;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function beginEnroll() {
    setError(null);
    startTransition(async () => {
      const result = await startMfaEnrollmentAction();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setEnrollment(result);
    });
  }

  function confirm() {
    if (!enrollment) return;
    setError(null);
    startTransition(async () => {
      const result = await confirmMfaEnrollmentAction(enrollment.factorId, code);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setEnrollment(null);
      setCode("");
      setEnabled(true);
    });
  }

  function disable() {
    setError(null);
    startTransition(async () => {
      const result = await disableMfaAction();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setEnabled(false);
    });
  }

  function cancel() {
    setEnrollment(null);
    setCode("");
    setError(null);
  }

  if (enrollment) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-text">{t(locale, "twoFactor.scanTitle")}</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI from Supabase's own enroll() response, not a remote image next/image would need to optimize. */}
        <img
          src={enrollment.qrCode}
          alt="QR code for authenticator app setup"
          width={176}
          height={176}
          className="self-center rounded-lg border border-line"
        />
        <p className="text-xs text-muted">
          {t(locale, "twoFactor.manualEntry")}{" "}
          <span className="font-mono text-text">{enrollment.secret}</span>
        </p>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder={t(locale, "twoFactor.codePlaceholder")}
          className="rounded-lg border border-line bg-bg px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
        />
        {error && (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={confirm}
            disabled={isPending || code.length !== 6}
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-60"
          >
            {t(locale, "twoFactor.confirmCta")}
          </button>
          <button
            type="button"
            onClick={cancel}
            className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-text"
          >
            {t(locale, "common.cancel")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text">{t(locale, "twoFactor.title")}</p>
        <p className="text-xs text-muted">
          {enabled ? t(locale, "twoFactor.onBody") : t(locale, "twoFactor.offBody")}
        </p>
        {error && (
          <p className="mt-1 text-xs text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
      {enabled ? (
        <button
          type="button"
          onClick={disable}
          disabled={isPending}
          className="shrink-0 rounded-full border border-danger/40 px-3.5 py-1.5 text-xs font-medium text-danger disabled:opacity-60"
        >
          {t(locale, "twoFactor.turnOff")}
        </button>
      ) : (
        <button
          type="button"
          onClick={beginEnroll}
          disabled={isPending}
          className="shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-60"
        >
          {t(locale, "twoFactor.setUp")}
        </button>
      )}
    </div>
  );
}
