import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InterestsPicker } from "@/components/interests-picker";
import {
  FlowScreen,
  GlassBackLink,
  Lede,
  StampTitle,
  StepProgress,
} from "@/components/ui/ios";
import { roleGroupFor, roleGroupLabel } from "@/lib/roles";
import { t } from "@/lib/i18n";

/**
 * Step 2 of sign-up ("Pick your interests"), and Edit Profile → Interests
 * afterwards. `?setup=1` marks the sign-up pass: it shows the step
 * progress and Skip, and continues to verification.
 */
export default async function InterestsPage({
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
  const group = roleGroupFor(profile.role);

  return (
    <FlowScreen
      nav={
        setup ? (
          <>
            <GlassBackLink href="/onboarding?setup=1" label={t(locale, "flow.back")} />
            <StepProgress step={2} label={t(locale, "flow.step", { n: "2", total: "3" })} />
            <Link
              href="/onboarding/verify?setup=1"
              className="flex h-11 items-center px-1 text-base font-semibold text-muted active:opacity-60"
            >
              {t(locale, "flow.skip")}
            </Link>
          </>
        ) : (
          <>
            <GlassBackLink href="/onboarding" label={t(locale, "flow.back")} />
            <span className="size-11" />
          </>
        )
      }
    >
      <StampTitle className="mt-1.5">
        {t(locale, "interests.titleLine1")}
        <br />
        {t(locale, "interests.titleLine2")}
      </StampTitle>
      <Lede>{t(locale, "interests.lede")}</Lede>
      <InterestsPicker
        initial={Array.isArray(profile.interests) ? profile.interests : []}
        setup={setup}
        specialty={profile.specialty || (group ? roleGroupLabel(group, locale) : null)}
        specialtyArt={group?.art ?? "🩺"}
        locale={locale}
      />
    </FlowScreen>
  );
}
