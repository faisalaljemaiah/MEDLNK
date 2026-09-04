import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/onboarding-form";
import { AnalyticsPageView } from "@/components/analytics-page-view";
import { ArrowLeftIcon } from "@/components/icons";
import { getVerificationAttemptStatus, LICENSE_VERIFICATION_ENABLED } from "@/lib/verification";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const isEdit = Boolean(profile.handle);
  // "in", not a falsy check — select("*") only omits the key when the
  // column genuinely doesn't exist yet (0027 unapplied on this project).
  // Once it exists the key is always present, even holding null.
  const documentUploadAvailable = "license_document_path" in profile;

  // Only matters once rejected — a pending or approved member has nothing
  // to resubmit yet, so there's no attempt count worth a query for them.
  // Skipped outright while verification is switched off: nothing reads it.
  const attemptStatus =
    LICENSE_VERIFICATION_ENABLED && profile.verification_status === "rejected"
      ? await getVerificationAttemptStatus(supabase, user.id)
      : null;

  // Required the first time (a pending/rejected member still needs this
  // page reachable from wherever they land), but not a dead end — this
  // screen's own subtitle already says browsing works while verification is
  // pending, so leaving should be as easy as arriving. Edit mode goes back
  // to the profile being edited rather than home, since that's where it was
  // opened from.
  const backHref = isEdit ? `/u/${profile.handle}` : "/";

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      {!isEdit && <AnalyticsPageView event="onboarding_viewed" />}
      {/* Pinned to the actual top of the screen, not the centered content
          column below it — this page previously had no way out at all. */}
      <Link
        href={backHref}
        aria-label="Back"
        className="absolute left-4 top-[calc(1rem+env(safe-area-inset-top))] flex size-9 items-center justify-center rounded-full text-text transition-transform duration-150 ease-out active:scale-90"
      >
        <ArrowLeftIcon />
      </Link>
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="font-headline text-2xl text-text">
          {isEdit ? "Edit your profile" : "Set up your profile"}
        </h1>
        <p className="text-sm text-muted">
          {isEdit
            ? "Update your picture, details, and specialty."
            : LICENSE_VERIFICATION_ENABLED
              ? "We manually review every license before you can post a case. You can browse Asyashare while you wait."
              : "Fill in your details to start using Asyashare."}
        </p>
      </div>

      {LICENSE_VERIFICATION_ENABLED && profile.verification_status === "pending" && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          Verification pending — you can read and save cases now; posting
          unlocks once we approve your license.
        </div>
      )}

      {LICENSE_VERIFICATION_ENABLED && profile.verification_status === "rejected" && attemptStatus && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {attemptStatus.attemptsRemaining > 0 ? (
            <>
              Your license verification was not approved. Double-check your
              license number and upload a clearer document below to resubmit.
              <p className="mt-1.5 text-xs">
                {attemptStatus.attemptsRemaining} of 3 resubmissions left this
                month.
              </p>
            </>
          ) : (
            <>
              You&apos;ve used all 3 resubmissions allowed in a 30-day period.
              You can try again on{" "}
              {new Date(attemptStatus.nextEligibleAt!).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
              })}
              .
            </>
          )}
        </div>
      )}

      <OnboardingForm
        profile={profile}
        documentUploadAvailable={documentUploadAvailable}
        resubmissionLocked={
          profile.verification_status === "rejected" &&
          attemptStatus?.attemptsRemaining === 0
        }
      />
    </div>
  );
}
