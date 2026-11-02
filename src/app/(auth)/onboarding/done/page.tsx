import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoMark } from "@/components/brand";
import { CapsuleLink, FlowScreen, PlainLink } from "@/components/ui/ios";
import { interestBySlug } from "@/lib/interests";
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
          <CapsuleLink href="/">Go to My Feed</CapsuleLink>
          {needsDocument && <PlainLink href="/onboarding/verify">Get Verified Now</PlainLink>}
        </>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center pt-10 text-center">
        <div className="mb-7 flex size-[150px] -rotate-[8deg] items-center justify-center rounded-full border-[3px] border-dashed border-accent/35 bg-accent-soft">
          <LogoMark size={92} />
        </div>
        <h1 className="font-stamp stamp-ink text-[50px] text-accent">You&rsquo;re in.</h1>
        <p className="mt-2.5 max-w-[290px] text-[15px] leading-normal text-muted">
          {picked.length > 0
            ? "Your feed will be built around what you picked."
            : "Welcome to Asyashare. You can pick interests anytime from Edit Profile."}
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
                {i.label}
              </span>
            ))}
          </div>
        )}

        {LICENSE_VERIFICATION_ENABLED && !profile.verified && (
          <p className="mt-7 max-w-[300px] text-[13px] leading-snug text-muted">
            {needsDocument
              ? "You can read, save and follow now. Get verified to post cases and send messages."
              : "We're reviewing your document. Posting unlocks once you're approved."}
          </p>
        )}
      </div>
    </FlowScreen>
  );
}
