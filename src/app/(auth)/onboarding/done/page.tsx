import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoMark } from "@/components/brand";
import { CapsuleLink, FlowScreen, PlainLink } from "@/components/ui/ios";
import { interestBySlug, interestLabel } from "@/lib/interests";
import { t } from "@/lib/i18n";
import { LICENSE_VERIFICATION_ENABLED } from "@/lib/verification";

/** The "You're in." screen at the end of sign-up. */
export default async function OnboardingDonePage() {
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
  const picked = (Array.isArray(profile.interests) ? profile.interests : [])
    .map(interestBySlug)
    .filter((i) => i !== undefined)
    .slice(0, 6);

  const needsDocument =
    LICENSE_VERIFICATION_ENABLED && !profile.verified && !profile.license_document_path;

  return (
    <FlowScreen
      footer={
        <>
          <CapsuleLink href="/">{t(locale, "done.goToFeed")}</CapsuleLink>
          {needsDocument && <PlainLink href="/onboarding/verify">{t(locale, "done.getVerifiedNow")}</PlainLink>}
        </>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center pt-10 text-center">
        <div className="mb-7 flex size-[150px] -rotate-[8deg] items-center justify-center rounded-full border-[3px] border-dashed border-accent/35 bg-accent-soft">
          <LogoMark size={92} />
        </div>
        <h1 className="font-stamp stamp-ink text-[50px] text-accent">{t(locale, "done.title")}</h1>
        <p className="mt-2.5 max-w-[290px] text-[15px] leading-normal text-muted">
          {t(locale, picked.length > 0 ? "done.withPicks" : "done.noPicks")}
        </p>

        {picked.length > 0 && (
          <div className="mt-6 flex max-w-[330px] flex-wrap justify-center gap-2">
            {picked.map((i, idx) => (
              <span
                key={i.slug}
                style={{ ["--tile" as string]: i.tint }}
                className={`picture-tile flex items-center gap-1.5 rounded-xl border-2 border-accent px-3 py-1.5 text-[13px] font-bold text-accent ${idx % 2 ? "rotate-[2.5deg]" : "-rotate-3"}`}
              >
                <span aria-hidden>{i.art}</span>
                {interestLabel(i, locale)}
              </span>
            ))}
          </div>
        )}

        {LICENSE_VERIFICATION_ENABLED && !profile.verified && (
          <p className="mt-7 max-w-[300px] text-[13px] leading-snug text-muted">
            {t(locale, needsDocument ? "done.needsDocument" : "done.inReview")}
          </p>
        )}
      </div>
    </FlowScreen>
  );
}
