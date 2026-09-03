"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction } from "@/app/actions/auth";
import { TextField } from "@/components/ui/text-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { AnalyticsPageView } from "@/components/analytics-page-view";
import { PlasmaCells } from "@/components/ui/plasma-cells";

export default function LoginPage() {
  const [state, action] = useActionState(signInAction, undefined);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <PlasmaCells />
      <AnalyticsPageView event="login_viewed" />
      <Link
        href="/welcome"
        className="animate-welcome-logo flex flex-col items-center gap-3 text-center"
      >
        <h1 className="font-headline text-2xl text-text">Welcome back</h1>
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
          autoComplete="current-password"
          required
        />
        <Link
          href="/forgot-password"
          className="-mt-2 self-end text-xs text-muted hover:text-accent"
        >
          Forgot password?
        </Link>
        {state && "error" in state && (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}
        <SubmitButton>Sign in</SubmitButton>
      </form>

      <p
        className="animate-welcome-rise text-center text-sm text-muted"
        style={{ animationDelay: "220ms" }}
      >
        New to Asyashare?{" "}
        <Link href="/signup" className="text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
