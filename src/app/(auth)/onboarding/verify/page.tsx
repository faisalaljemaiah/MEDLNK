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
import { t } from "@/lib/i18n";

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

  const locale = profile.locale ?? "en";

  // Nothing to verify while the feature is off — everyone is auto-approved
  // on step 1 (updateProfileAction).
  if (!LICENSE_VERIFICATION_ENABLED) {
    redirect(setup ? "/onboarding/done" : "/onboarding");
  }

  const backHref = setup ? "/onboarding/interests?setup=1" : "/onboarding";
  const nav = (
    <>
      <GlassBackLink href={backHref} label={t(locale, "flow.back")} />
      {setup ? <StepProgress step={3} label={t(locale, "flow.step", { n: "3", total: "3" })} /> : null}
      <span className="size-11" />
    </>
  );

  if (profile.verified) {
    return (
      <FlowScreen nav={nav} footer={<CapsuleLink href={setup ? "/onboarding/done" : `/u/${profile.handle}`}>{t(locale, "flow.done")}</CapsuleLink>}>
        <StampTitle className="mt-1.5">{t(locale, "verify.verifiedTitle")}</StampTitle>
        <Lede>{t(locale, "verify.verifiedLede")}</Lede>
      </FlowScreen>
    );
  }

  const rejected = profile.verification_status === "rejected";
  const inReview = !rejected && Boolean(profile.license_document_path);
  const attemptStatus = rejected ? await getVerificationAttemptStatus(supabase, user.id) : null;
  const locked = rejected && attemptStatus?.attemptsRemaining === 0;

  return (
    <FlowScreen nav={nav}>
      <StampTitle className="mt-1.5">{t(locale, "verify.title")}</StampTitle>
      <Lede>{t(locale, inReview ? "verify.ledeInReview" : "verify.lede")}</Lede>

      {rejected && attemptStatus && (
        <div role="status" className="-mt-2 mb-4 rounded-[18px] bg-danger/10 px-4 py-3 text-[14px] leading-snug text-danger">
          {attemptStatus.attemptsRemaining > 0 ? (
            <>
              {t(locale, "verify.rejected")}
              <span className="mt-1 block text-[12.5px]">
                {t(locale, "verify.attemptsLeft", { n: String(attemptStatus.attemptsRemaining) })}
              </span>
            </>
          ) : (
            t(locale, "verify.locked", {
              date: new Date(attemptStatus.nextEligibleAt!).toLocaleDateString(locale === "ar" ? "ar" : "en", {
                month: "long",
                day: "numeric",
              }),
            })
          )}
        </div>
      )}

      <VerifyForm setup={setup} locked={locked} locale={locale} />

      {setup && (
        <PlainLink href="/onboarding/done" className="mt-3.5">
          {t(locale, "verify.later")}
        </PlainLink>
      )}
    </FlowScreen>
  );
}
