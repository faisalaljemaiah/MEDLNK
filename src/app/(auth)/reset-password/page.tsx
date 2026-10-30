"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { updatePasswordAction } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { TextField } from "@/components/ui/text-field";
import { SubmitButton } from "@/components/ui/submit-button";

type LinkStatus = "checking" | "ready" | "expired";

/**
 * By the time this page loads, /auth/callback has already exchanged the
 * recovery link's PKCE code for a session and set the session cookies
 * server-side — this just confirms one actually landed (an expired/reused
 * link, or someone opening this URL directly, means no session arrived).
 */
export default function ResetPasswordPage() {
  const [state, action] = useActionState(updatePasswordAction, undefined);
  const [status, setStatus] = useState<LinkStatus>("checking");

  useEffect(() => {
    const supabase = createClient();

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setStatus(session ? "ready" : "expired");
    }

    checkSession();
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <div className="animate-welcome-logo flex flex-col items-center gap-3 text-center">
        <h1 className="font-headline text-2xl text-text">Choose a new password</h1>
      </div>

      {status === "checking" && (
        <p className="animate-welcome-rise text-center text-sm text-muted">
          Checking your reset link…
        </p>
      )}

      {status === "expired" && (
        <div className="animate-welcome-rise flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-danger" role="alert">
            This link is invalid or has expired.
          </p>
          <Link href="/forgot-password" className="text-sm text-accent hover:underline">
            Request a new reset link
          </Link>
        </div>
      )}

      {status === "ready" && (
        <form
          action={action}
          className="animate-welcome-rise flex flex-col gap-4"
          style={{ animationDelay: "120ms" }}
        >
          <TextField
            label="New password"
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
          <SubmitButton>Update password</SubmitButton>
        </form>
      )}
    </div>
  );
}
