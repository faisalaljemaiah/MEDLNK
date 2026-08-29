"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { TextField } from "@/components/ui/text-field";
import { SubmitButton } from "@/components/ui/submit-button";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState(requestPasswordResetAction, undefined);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <Link
        href="/welcome"
        className="animate-welcome-logo flex flex-col items-center gap-3 text-center"
      >
        <h1 className="font-headline text-2xl text-text">Reset your password</h1>
        <p className="text-sm text-muted">
          Enter the email on your account and we&apos;ll send a link to reset it.
        </p>
      </Link>

      <form
        action={action}
        className="animate-welcome-rise flex flex-col gap-4"
        style={{ animationDelay: "120ms" }}
      >
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
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
        <SubmitButton>Send reset link</SubmitButton>
      </form>

      <p
        className="animate-welcome-rise text-center text-sm text-muted"
        style={{ animationDelay: "220ms" }}
      >
        <Link href="/login" className="text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
