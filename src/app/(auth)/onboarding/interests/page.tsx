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
import { roleGroupFor } from "@/lib/roles";

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

  const group = roleGroupFor(profile.role);

  return (
    <FlowScreen
      nav={
        setup ? (
          <>
            <GlassBackLink href="/onboarding" />
            <StepProgress step={2} />
            <Link
              href="/onboarding/verify?setup=1"
              className="flex h-11 items-center px-1 text-base font-semibold text-muted active:opacity-60"
            >
              Skip
            </Link>
          </>
        ) : (
          <>
            <GlassBackLink href="/onboarding" />
            <span className="size-11" />
          </>
        )
      }
    >
      <StampTitle className="mt-1.5">
        Pick your
        <br />
        interests.
      </StampTitle>
      <Lede>This shapes your feed. Change it anytime.</Lede>
      <InterestsPicker
        initial={Array.isArray(profile.interests) ? profile.interests : []}
        setup={setup}
        specialty={profile.specialty || group?.label || null}
        specialtyArt={group?.art ?? "🩺"}
      />
    </FlowScreen>
  );
}
