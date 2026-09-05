import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { TwoFactorVerifyForm } from "@/components/two-factor-verify-form";
import { LogoMark } from "@/components/brand";

/**
 * Where signInAction (src/app/actions/auth.ts) and the (app) layout's own
 * AAL check both send an account that has 2FA enrolled but hasn't yet
 * completed this session's challenge — a password alone only reaches
 * aal1, this page is what raises it to aal2.
 */
export default async function Verify2faPage() {
  const user = await getViewer();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  // Nothing to verify — either this account has no factor enrolled, or the
  // challenge was already completed (e.g. a refresh right after verifying)
  // — send them on rather than showing a code prompt with nothing behind it.
  if (!aal || aal.currentLevel === aal.nextLevel) {
    redirect("/");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <div className="animate-welcome-logo flex flex-col items-center gap-3 text-center">
        <LogoMark size={40} />
        <h1 className="font-headline text-2xl text-text">Enter your 2FA code</h1>
        <p className="text-sm text-muted">
          Open your authenticator app and enter the 6-digit code for Asyashare.
        </p>
      </div>

      <TwoFactorVerifyForm />
    </div>
  );
}
