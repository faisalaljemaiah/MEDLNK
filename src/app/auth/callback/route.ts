import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/redirect-target";

/**
 * Every email-based auth link (password recovery, and any future
 * magic-link/invite flow) redirects here with a PKCE `?code=` — the actual
 * flow this project's Supabase clients use (createBrowserClient and
 * createServerClient, src/lib/supabase/client.ts and server.ts, both default
 * to PKCE since neither passes a flowType override). Exchanging that code
 * for a session has to happen server-side, via the same cookie-aware
 * server client resetPasswordForEmail (src/app/actions/auth.ts) used to
 * start the flow — that's where the PKCE code_verifier it set actually
 * lives, so only this request, in this same browser, can redeem it.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next")) ?? "/reset-password";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // No code, or the exchange failed (link already used, expired, or
  // tampered with) — land on the same page a stale link always showed,
  // rather than a bare error screen.
  return NextResponse.redirect(`${origin}${next}`);
}
