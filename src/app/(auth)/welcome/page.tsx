import Link from "next/link";
import { AnalyticsPageView } from "@/components/analytics-page-view";
import { WelcomeSplash } from "@/components/welcome-splash";
import { LogoMark, Wordmark } from "@/components/brand";
import { browseAsGuestAction } from "@/app/actions/guest";

/**
 * The signed-out entry point: a first-time, signed-out visit to the bare
 * domain lands here (the root feed page redirects to it — see the
 * medlnk_guest check in src/app/(app)/page.tsx) rather than straight into
 * the app shell, so someone who just searched the name meets the pitch
 * before the product.
 *
 * Not a permanent gate, though — the feed still works signed out (RLS lets
 * anon read cases), and "Browse without an account" below is a real,
 * one-time opt-out: it sets the same cookie the redirect checks
 * (browseAsGuestAction, src/app/actions/guest.ts), so choosing it once
 * means never landing back here again on this browser, same as signing up
 * or signing in would.
 */
export default function WelcomePage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center gap-10 px-6 py-12 text-center">
      <WelcomeSplash />
      <AnalyticsPageView event="welcome_viewed" />
      <div className="animate-welcome-logo flex flex-col items-center gap-3">
        <LogoMark size={56} />
        <Wordmark className="text-lg text-text" />
      </div>

      <div
        className="animate-welcome-rise flex flex-col gap-2"
        style={{ animationDelay: "150ms" }}
      >
        <p className="text-lg font-medium text-text">
          See a case | Think it through | Find out what happened
        </p>
        <p className="text-sm text-muted">
          A clinical knowledge network for verified healthcare professionals.
        </p>
      </div>

      <div
        className="animate-welcome-rise flex w-full flex-col gap-3"
        style={{ animationDelay: "300ms" }}
      >
        <Link
          href="/signup"
          className="rounded-full bg-accent px-5 py-3 text-center text-sm font-medium text-accent-foreground transition-transform duration-150 ease-out active:scale-95"
        >
          Create account
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-line px-5 py-3 text-center text-sm font-medium text-text transition-[border-color,color] duration-150 ease-out hover:border-accent hover:text-accent active:scale-95"
        >
          Sign in
        </Link>
        <form action={browseAsGuestAction} className="mt-1">
          <button
            type="submit"
            className="text-xs text-muted hover:text-text"
          >
            Browse without an account →
          </button>
        </form>
      </div>

      <p
        className="animate-welcome-rise text-xs text-muted"
        style={{ animationDelay: "400ms" }}
      >
        <Link href="/terms" className="hover:text-text">
          Terms
        </Link>{" "}
        ·{" "}
        <Link href="/privacy" className="hover:text-text">
          Privacy
        </Link>{" "}
        ·{" "}
        <Link href="/contact" className="hover:text-text">
          Contact
        </Link>
      </p>
    </div>
  );
}
