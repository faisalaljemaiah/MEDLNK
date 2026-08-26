import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { OnboardingForm } from "@/components/onboarding-form";

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

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo size={44} />
        <h1 className="font-headline text-2xl text-text">
          {isEdit ? "Edit your profile" : "Set up your profile"}
        </h1>
        <p className="text-sm text-muted">
          {isEdit
            ? "Update your picture, details, and specialty."
            : "We manually review every license before you can post a case. You can browse MEDLNK while you wait."}
        </p>
      </div>

      {profile.verification_status === "pending" && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          Verification pending — you can read and save cases now; posting
          unlocks once we approve your license.
        </div>
      )}

      {profile.verification_status === "rejected" && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          Your license verification was not approved. Double-check your
          license number and upload a clearer document below to resubmit.
        </div>
      )}

      <OnboardingForm
        profile={profile}
        documentUploadAvailable={documentUploadAvailable}
      />
    </div>
  );
}
