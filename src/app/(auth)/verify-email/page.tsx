import { redirect } from "next/navigation";
import Link from "next/link";
import { VerifyEmailForm } from "@/components/verify-email-form";
import { AnalyticsPageView } from "@/components/analytics-page-view";
import { LogoMark } from "@/components/brand";

/**
 * Landed on from signUpAction (a brand-new account, "Confirm email" on) or
 * signInAction (an account that never finished this step) — never reachable
 * with a session already established, so there's no getViewer() gate here
 * the way most (auth) pages have one the other direction.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  if (!email) {
    redirect("/signup");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <AnalyticsPageView event="verify_email_viewed" />
      <div className="animate-welcome-logo flex flex-col items-center gap-3 text-center">
        <LogoMark size={40} />
        <h1 className="font-headline text-2xl text-text">Check your email</h1>
        <p className="text-sm text-muted">
          We sent a code to <span className="text-text">{email}</span>. Enter
          it below to activate your account.
        </p>
      </div>

      <VerifyEmailForm email={email} />

      <p
        className="animate-welcome-rise text-center text-sm text-muted"
        style={{ animationDelay: "260ms" }}
      >
        Wrong email?{" "}
        <Link href="/signup" className="text-accent hover:underline">
          Start over
        </Link>
      </p>
    </div>
  );
}
