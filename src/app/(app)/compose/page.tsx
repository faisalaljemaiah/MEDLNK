import { redirect } from "next/navigation";
import { getViewer, getViewerProfile } from "@/lib/auth";
import { ComposeForm } from "@/components/compose-form";

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const [user, { type }] = await Promise.all([getViewer(), searchParams]);

  if (!user) redirect("/login");

  const profile = await getViewerProfile();

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
      <ComposeForm initialType={type} />
    </div>
  );
}
