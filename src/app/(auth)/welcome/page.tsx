import Link from "next/link";
import { AnalyticsPageView } from "@/components/analytics-page-view";

/**
 * The signed-out entry point: a brief, animated welcome before the sign-in/
 * sign-up forms rather than dropping a new visitor straight into one.
 *
 * Deliberately not a gate — the feed already works signed out (RLS lets
 * anon read cases), and this screen must not take that away. "Browse
 * without an account" keeps that path exactly as discoverable as the two
 * that lead to a form.
 */
export default function WelcomePage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center gap-10 px-6 py-12 text-center">
      <AnalyticsPageView event="welcome_viewed" />
      <div className="animate-welcome-logo flex flex-col items-center gap-4">
        <h1 className="font-headline text-3xl text-text">Asyashare</h1>
      </div>

      <div
        className="animate-welcome-rise flex flex-col gap-2"
        style={{ animationDelay: "150ms" }}
      >
        <p className="text-lg font-medium text-text">
          See a case. Think it through. Find out what happened.
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
          className="rounded-full bg-accent px-5 py-3 text-center text-sm font-medium text-white transition-transform duration-150 ease-out active:scale-95"
        >
          Create account
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-line px-5 py-3 text-center text-sm font-medium text-text transition-[border-color,color] duration-150 ease-out hover:border-accent hover:text-accent active:scale-95"
        >
          Sign in
        </Link>
        <Link href="/" className="mt-1 text-xs text-muted hover:text-text">
          Browse without an account →
        </Link>
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
