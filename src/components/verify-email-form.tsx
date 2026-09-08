"use client";

import { useActionState, useState, useTransition } from "react";
import { verifySignupOtpAction, resendSignupOtpAction } from "@/app/actions/auth";
import { TextField } from "@/components/ui/text-field";
import { SubmitButton } from "@/components/ui/submit-button";

export function VerifyEmailForm({ email }: { email: string }) {
  const [state, action] = useActionState(verifySignupOtpAction, undefined);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isResending, startResend] = useTransition();

  return (
    <>
      <form
        action={action}
        className="animate-welcome-rise flex flex-col gap-4"
        style={{ animationDelay: "120ms" }}
      >
        <input type="hidden" name="email" value={email} />
        {/* Not capped at 6 digits — the OTP length is a project-level
            Supabase Auth setting (Email OTP Length), not something fixed
            in this app, and it defaults to more than 6. */}
        <TextField
          label="Verification code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          required
        />
        {state?.error && (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}
        <SubmitButton>Verify</SubmitButton>
      </form>

      <div
        className="animate-welcome-rise flex flex-col items-center gap-1.5 text-center"
        style={{ animationDelay: "220ms" }}
      >
        <button
          type="button"
          disabled={isResending}
          onClick={() =>
            startResend(async () => {
              setResendMessage(null);
              const result = await resendSignupOtpAction(email);
              setResendMessage("error" in result ? result.error : result.message);
            })
          }
          className="text-sm text-accent hover:underline disabled:opacity-60"
        >
          {isResending ? "Sending…" : "Resend code"}
        </button>
        {resendMessage && <p className="text-xs text-muted">{resendMessage}</p>}
      </div>
    </>
  );
}
