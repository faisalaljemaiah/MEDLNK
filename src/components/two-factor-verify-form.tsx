"use client";

import { useActionState } from "react";
import { verifyMfaLoginAction } from "@/app/actions/mfa";
import { signOutAction } from "@/app/actions/auth";
import { TextField } from "@/components/ui/text-field";
import { SubmitButton } from "@/components/ui/submit-button";

export function TwoFactorVerifyForm() {
  const [state, action] = useActionState(verifyMfaLoginAction, undefined);

  return (
    <>
      <form
        action={action}
        className="animate-welcome-rise flex flex-col gap-4"
        style={{ animationDelay: "120ms" }}
      >
        <TextField
          label="6-digit code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
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

      {/* A separate form, not nested inside the one above — signing out
          instead is the escape hatch for someone who can't complete the
          challenge right now (lost their device, wrong account), not a
          second field of the same submission. */}
      <form
        action={signOutAction}
        className="animate-welcome-rise text-center"
        style={{ animationDelay: "220ms" }}
      >
        <button type="submit" className="text-sm text-muted hover:text-text">
          Sign out instead
        </button>
      </form>
    </>
  );
}
