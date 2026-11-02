import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/onboarding-form";
import { AnalyticsPageView } from "@/components/analytics-page-view";
import {
  ChevronRight,
  FlowScreen,
  GlassBackButton,
  GlassBackLink,
  GroupedList,
  Lede,
  StampTitle,
  StepProgress,
} from "@/components/ui/ios";
import { LICENSE_VERIFICATION_ENABLED } from "@/lib/verification";
import { signOutAction } from "@/app/actions/auth";

/**
 * Step 1 of sign-up ("Who are you?") and, once a handle exists, the Edit
 * Profile screen. Interests and verification are their own steps now
 * (/onboarding/interests, /onboarding/verify); Edit Profile links to both.
 */
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
  const interestCount = Array.isArray(profile.interests) ? profile.interests.length : 0;

  const verificationLabel = profile.verified
    ? "Verified"
    : profile.verification_status === "rejected"
      ? "Not approved"
      : profile.license_document_path
        ? "In review"
        : "Not started";

  return (
    <FlowScreen
      nav={
        isEdit ? (
          <>
            <GlassBackLink href={`/u/${profile.handle}`} />
            <span className="size-11" />
          </>
        ) : (
          <>
            {/* First-time setup has nowhere to go back to — every other
                route requires a finished profile (src/app/(app)/layout.tsx)
                — so signing out is the real exit. */}
            <GlassBackButton action={signOutAction} label="Cancel and sign out" />
            <StepProgress step={1} />
            <span className="size-11" />
          </>
        )
      }
    >
      {!isEdit && <AnalyticsPageView event="onboarding_viewed" />}
      <StampTitle className="mt-1.5">{isEdit ? "Edit profile." : "Who are you?"}</StampTitle>
      <Lede>This is how other clinicians will see you.</Lede>

      <OnboardingForm profile={profile} isEdit={isEdit}>
        {isEdit && (
          <GroupedList className="mt-4">
            <Link href="/onboarding/interests" className="flex min-h-[50px] items-center gap-3 px-4 text-[17px] text-text">
              Interests
              <span className="ml-auto flex items-center gap-2 text-muted">
                {interestCount > 0 ? `${interestCount} picked` : "None yet"}
                <ChevronRight />
              </span>
            </Link>
            {LICENSE_VERIFICATION_ENABLED && (
              <Link href="/onboarding/verify" className="flex min-h-[50px] items-center gap-3 px-4 text-[17px] text-text">
                Verification
                <span className="ml-auto flex items-center gap-2 text-muted">
                  {verificationLabel}
                  <ChevronRight />
                </span>
              </Link>
            )}
          </GroupedList>
        )}
      </OnboardingForm>
    </FlowScreen>
  );
}
