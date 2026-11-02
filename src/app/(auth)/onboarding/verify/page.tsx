import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VerifyForm } from "@/components/verify-form";
import {
  CapsuleLink,
  FlowScreen,
  GlassBackLink,
  Lede,
  PlainLink,
  StampTitle,
  StepProgress,
} from "@/components/ui/ios";
import { getVerificationAttemptStatus, LICENSE_VERIFICATION_ENABLED } from "@/lib/verification";

/**
 * Step 3 of sign-up ("Get verified"). Also the one place to come back to
 * after "I'll Do It Later", to resubmit after a rejection, or to check on a
 * document that's in review. `?setup=1` marks the sign-up pass.
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>;
}) {
  const { setup: setupParam } = await searchParams;
  const setup = setupParam === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");
  if (!profile.handle) redirect("/onboarding");

  // Nothing to verify while the feature is off — everyone is auto-approved
  // on step 1 (updateProfileAction).
  if (!LICENSE_VERIFICATION_ENABLED) {
    redirect(setup ? "/onboarding/done" : "/onboarding");
  }

  const backHref = setup ? "/onboarding/interests?setup=1" : "/onboarding";
  const nav = (
    <>
      <GlassBackLink href={backHref} />
      {setup ? <StepProgress step={3} /> : null}
      <span className="size-11" />
    </>
  );

  if (profile.verified) {
    return (
      <FlowScreen nav={nav} footer={<CapsuleLink href={setup ? "/onboarding/done" : `/u/${profile.handle}`}>Done</CapsuleLink>}>
        <StampTitle className="mt-1.5">You&rsquo;re verified.</StampTitle>
        <Lede>Your license has been approved. You can post cases and message other clinicians.</Lede>
      </FlowScreen>
    );
  }

  const rejected = profile.verification_status === "rejected";
  const inReview = !rejected && Boolean(profile.license_document_path);
  const attemptStatus = rejected ? await getVerificationAttemptStatus(supabase, user.id) : null;
  const locked = rejected && attemptStatus?.attemptsRemaining === 0;

  return (
    <FlowScreen nav={nav}>
      <StampTitle className="mt-1.5">Get verified.</StampTitle>
      <Lede>
        {inReview
          ? "Your document is in review. You can read, save and follow now; posting unlocks once we approve it. Upload a new one only if you need to replace it."
          : "A photo of your license or student ID. A person on our team reviews it."}
      </Lede>

      {rejected && attemptStatus && (
        <div role="status" className="-mt-2 mb-4 rounded-[18px] bg-danger/10 px-4 py-3 text-[14px] leading-snug text-danger">
          {attemptStatus.attemptsRemaining > 0 ? (
            <>
              Your last document wasn&rsquo;t approved. Upload a clearer one to resubmit.
              <span className="mt-1 block text-[12.5px]">
                {attemptStatus.attemptsRemaining} of 3 resubmissions left this month.
              </span>
            </>
          ) : (
            <>
              You&rsquo;ve used all 3 resubmissions allowed in 30 days. You can try again on{" "}
              {new Date(attemptStatus.nextEligibleAt!).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
              })}
              .
            </>
          )}
        </div>
      )}

      <VerifyForm setup={setup} locked={locked} />

      {setup && (
        <PlainLink href="/onboarding/done" className="mt-3.5">
          I&rsquo;ll Do It Later
        </PlainLink>
      )}
    </FlowScreen>
  );
}
