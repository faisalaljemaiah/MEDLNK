import { redirect } from "next/navigation";
import { getViewer, getViewerProfile } from "@/lib/auth";
import { ComposeForm } from "@/components/compose-form";
import { caseTypeMeta } from "@/lib/case-types";
import { t } from "@/lib/i18n";

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const [user, { type }] = await Promise.all([getViewer(), searchParams]);

  if (!user) redirect("/login");

  const profile = await getViewerProfile();
  const locale = profile?.locale ?? "en";

  if (!profile?.verified) {
    return (
      <div className="px-4 py-10 text-center">
        <h1 className="font-headline text-xl text-text">
          {t(locale, "messages.verificationRequired")}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {profile?.verification_status === "rejected"
            ? t(locale, "messages.verificationRejected")
            : t(locale, "compose.verificationPendingCase")}
        </p>
      </div>
    );
  }

  const isVideo = caseTypeMeta(type).requiresVideo;

  return (
    <div className="px-4 py-6">
      <h1 className="mb-1 font-headline text-xl text-text">
        {isVideo ? t(locale, "compose.newVideoTitle") : t(locale, "compose.shareCaseTitle")}
      </h1>
      <p className="mb-6 text-sm text-muted">
        {isVideo
          ? t(locale, "compose.videoPublicSubtitle")
          : t(locale, "compose.casePublicSubtitle")}
      </p>
      <ComposeForm
        initialType={type}
        viewerCountryCode={profile.country_code}
        locale={locale}
      />
    </div>
  );
}
