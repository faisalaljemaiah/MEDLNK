"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { updatePasswordAction } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { TextField } from "@/components/ui/text-field";
import { SubmitButton } from "@/components/ui/submit-button";

type LinkStatus = "checking" | "ready" | "expired";

/**
 * The recovery link redirects here with the session in a URL hash
 * fragment (#access_token=...&refresh_token=...&type=recovery) — this
 * project's Supabase Auth issues implicit-flow recovery links, but
 * `createBrowserClient` (src/lib/supabase/client.ts) hardcodes
 * `flowType: "pkce"`, whose own detectSessionInUrl only looks for a
 * `?code=` query param and never parses this hash at all. So this reads
 * the fragment itself and calls `setSession` directly — that works
 * regardless of the client's configured flow, since it's just handing
 * GoTrue the tokens rather than asking it to find them.
 */
export default function ResetPasswordPage() {
  const [state, action] = useActionState(updatePasswordAction, undefined);
  const [status, setStatus] = useState<LinkStatus>("checking");

  useEffect(() => {
    const supabase = createClient();

    async function establishSession() {
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const params = new URLSearchParams(hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (access_token && refresh_token && params.get("type") === "recovery") {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        // Clears the tokens from the visible URL/browser history either
        // way — they're single-use, but there's no reason to leave them
        // sitting in the address bar.
        window.history.replaceState(null, "", window.location.pathname);
        if (!error) {
          setStatus("ready");
          return;
        }
      }

      // No usable fragment (or setSession rejected it) — a page refresh
      // after the tokens were already cleared above still has a real
      // session to fall back on.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setStatus(session ? "ready" : "expired");
    }

    establishSession();
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
