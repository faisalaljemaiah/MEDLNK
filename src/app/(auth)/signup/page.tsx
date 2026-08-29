"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signUpAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { TextField } from "@/components/ui/text-field";
import { SubmitButton } from "@/components/ui/submit-button";

export default function SignUpPage() {
  const [state, action] = useActionState(signUpAction, undefined);
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <Link
        href="/welcome"
        className="animate-welcome-logo flex flex-col items-center gap-3 text-center"
      >
        <Logo size={44} />
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
