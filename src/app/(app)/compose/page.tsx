import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ComposeForm } from "@/components/compose-form";

export default async function ComposePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("verified, verification_status")
    .eq("id", user.id)
    .single();

  if (!profile?.verified) {
    return (
      <div className="px-4 py-10 text-center">
        <h1 className="font-headline text-xl text-text">
          Verification required
        </h1>
        <p className="mt-2 text-sm text-muted">
          {profile?.verification_status === "rejected"
            ? "Your license verification was not approved. Contact support if you think this is a mistake."
            : "We manually review every license before you can post a case. You'll be able to post as soon as you're approved."}
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="mb-1 font-headline text-xl text-text">Share a case</h1>
      <p className="mb-6 text-sm text-muted">
        Cases are public to every verified clinician on MEDLNK.
      </p>
      <ComposeForm />
    </div>
  );
}
