import { redirect } from "next/navigation";
import Link from "next/link";
import { getViewer, getViewerProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBlockedByViewer } from "@/lib/blocks";
import { LanguageSwitcher } from "@/components/language-switcher";
import { UnblockButton } from "@/components/block-button";
import { DeleteAccount } from "@/components/delete-account";
import { signOutAction } from "@/app/actions/auth";
import { t } from "@/lib/i18n";

export default async function SettingsPage() {
  const user = await getViewer();
  if (!user) redirect("/login");

  const profile = await getViewerProfile();
  const locale = profile?.locale ?? "en";
  const supabase = await createClient();
  const blockedAccounts = await getBlockedByViewer(supabase, user.id);

  return (
    <div className="px-4 py-6">
      <h1 className="font-headline text-xl text-text">{t(locale, "settings.title")}</h1>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-4">
        <LanguageSwitcher current={locale} />
      </section>

      {blockedAccounts.length > 0 && (
        <section className="mt-4 rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-sm font-medium text-text">Blocked accounts</h2>
          <div className="mt-3 flex flex-col gap-3">
            {blockedAccounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between gap-3">
                <span className="truncate text-sm text-text">
                  {account.full_name || `@${account.handle}`}
                </span>
                <UnblockButton blockedId={account.id} path="/settings" />
              </div>
            ))}
          </div>
        </section>
      )}

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
        <Link
          href="/terms"
          className="text-sm font-medium text-text hover:text-accent"
        >
          Terms of Service →
        </Link>
        <Link
          href="/privacy"
          className="text-sm font-medium text-text hover:text-accent"
        >
          Privacy Policy →
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

      <section className="mt-4 rounded-2xl border border-line bg-surface p-4">
        <DeleteAccount />
      </section>
    </div>
  );
}
