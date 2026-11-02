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
import { t } from "@/lib/i18n";
import { signOutAction } from "@/app/actions/auth";

/**
 * Step 1 of sign-up ("Who are you?") and, once a handle exists, the Edit
 * Profile screen. Interests and verification are their own steps
 * (/onboarding/interests, /onboarding/verify); Edit Profile links to both.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>;
}) {
  const { setup: setupParam } = await searchParams;
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

  const locale = profile.locale ?? "en";
  // Sign-up mode: no handle yet, or coming back here from step 2 with
  // ?setup=1 (the handle already exists by then, but this is still the
  // sign-up pass, not Edit Profile).
  const isEdit = Boolean(profile.handle) && setupParam !== "1";
  const interestCount = Array.isArray(profile.interests) ? profile.interests.length : 0;

  const verificationLabel = profile.verified
    ? t(locale, "onboarding.statusVerified")
    : profile.verification_status === "rejected"
      ? t(locale, "onboarding.statusRejected")
      : profile.license_document_path
        ? t(locale, "onboarding.statusInReview")
        : t(locale, "onboarding.statusNotStarted");

  const rowClass = "flex min-h-[50px] items-center gap-3 px-4 text-[17px] text-text";

  return (
    <FlowScreen
      nav={
        isEdit ? (
          <>
            <GlassBackLink href={`/u/${profile.handle}`} label={t(locale, "flow.back")} />
            <span className="size-11" />
          </>
        ) : (
          <>
            {/* First-time setup has nowhere to go back to — every other
                route requires a finished profile (src/app/(app)/layout.tsx)
                — so signing out is the real exit. */}
            {profile.handle ? (
              <span className="size-11" />
            ) : (
              <GlassBackButton action={signOutAction} label={t(locale, "flow.cancelSignOut")} />
            )}
            <StepProgress step={1} label={t(locale, "flow.step", { n: "1", total: "3" })} />
            <span className="size-11" />
          </>
        )
      }
    >
      {!profile.handle && <AnalyticsPageView event="onboarding_viewed" />}
      <StampTitle className="mt-1.5">
        {t(locale, isEdit ? "onboarding.editTitle" : "onboarding.whoTitle")}
      </StampTitle>
      <Lede>{t(locale, "onboarding.lede")}</Lede>

      <OnboardingForm profile={profile} isEdit={isEdit} locale={locale}>
        {isEdit && (
          <GroupedList className="mt-4">
            <Link href="/onboarding/interests" className={rowClass}>
              {t(locale, "onboarding.interestsRow")}
              <span className="ms-auto flex items-center gap-2 text-muted">
                {interestCount > 0
                  ? t(locale, "onboarding.interestsPicked", { n: String(interestCount) })
                  : t(locale, "onboarding.interestsNone")}
                <ChevronRight />
              </span>
            </Link>
            {LICENSE_VERIFICATION_ENABLED && (
              <Link href="/onboarding/verify" className={rowClass}>
                {t(locale, "onboarding.verificationRow")}
                <span className="ms-auto flex items-center gap-2 text-muted">
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
