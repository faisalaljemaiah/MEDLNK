import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/redirect-target";

/**
 * Handles email-based auth links (password recovery, and any future
 * magic-link/invite flow) via `token_hash` + `type`, not a PKCE `?code=`.
 *
 * PKCE's `exchangeCodeForSession` needs the code_verifier cookie that was
 * set in whatever browser/webview originally called resetPasswordForEmail —
 * but on a mobile device that request comes from the app's own webview,
 * while tapping the emailed link opens the system browser (Safari/Chrome),
 * a completely different cookie jar. That combination can never succeed, so
 * every real user hit "link is invalid or expired" even though the link
 * itself was otherwise correct. verifyOtp(token_hash) has no such
 * requirement — GoTrue validates the one-time token entirely server-side
 * and hands back a session right here, regardless of where it's opened.
 *
 * This means the Reset Password email template must link here with
 * `?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`
 * instead of Supabase's default `{{ .ConfirmationURL }}` (which still
 * produces the old PKCE `?code=` redirect through /auth/v1/verify).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = sanitizeNextPath(searchParams.get("next")) ?? "/reset-password";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // No usable params, or verification failed (link already used, expired,
  // or tampered with) — land on the same page a stale link always showed,
  // rather than a bare error screen.
  return NextResponse.redirect(`${origin}${next}`);
}
