"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { TextField } from "@/components/ui/text-field";
import { SubmitButton } from "@/components/ui/submit-button";

export default function SignUpPage() {
  const [state, action] = useActionState(signUpAction, undefined);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <Link
        href="/welcome"
        className="animate-welcome-logo flex flex-col items-center gap-3 text-center"
      >
        <Logo size={44} />
        <h1 className="font-headline text-2xl text-text">Join MEDLNK</h1>
        <p className="text-sm text-muted">
          A clinical knowledge network for verified medical professionals.
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
        <SubmitButton>Create account</SubmitButton>
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
