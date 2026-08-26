import { redirect } from "next/navigation";
import Link from "next/link";
import { getViewer, getViewerProfile } from "@/lib/auth";
import { LanguageSwitcher } from "@/components/language-switcher";
import { signOutAction } from "@/app/actions/auth";
import { t } from "@/lib/i18n";

export default async function SettingsPage() {
  const user = await getViewer();
  if (!user) redirect("/login");

  const profile = await getViewerProfile();
  const locale = profile?.locale ?? "en";

  return (
    <div className="px-4 py-6">
      <h1 className="font-headline text-xl text-text">{t(locale, "settings.title")}</h1>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-4">
        <LanguageSwitcher current={locale} />
      </section>

      <section className="mt-4 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <Link
          href="/notifications"
          className="text-sm font-medium text-text hover:text-accent"
        >
          {t(locale, "nav.notifications")} →
        </Link>
        {/* An admin's own profile page (/u/[handle]) is the moderation
            dashboard rather than the normal profile, so it no longer
            carries these — this is the one place left to reach them. */}
        <Link
          href="/onboarding"
          className="text-sm font-medium text-text hover:text-accent"
        >
          Edit profile →
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-sm font-medium text-danger hover:underline"
          >
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}
