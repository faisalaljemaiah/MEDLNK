import { redirect } from "next/navigation";
import Link from "next/link";
import { getViewer, getViewerProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBlockedByViewer } from "@/lib/blocks";
import { LanguageSwitcher } from "@/components/language-switcher";
import { UnblockButton } from "@/components/block-button";
import { DeleteAccount } from "@/components/delete-account";
import { TwoFactorSettings } from "@/components/two-factor-settings";
import { signOutAction } from "@/app/actions/auth";
import { t } from "@/lib/i18n";

export default async function SettingsPage() {
  const user = await getViewer();
  if (!user) redirect("/login");

  const profile = await getViewerProfile();
  const locale = profile?.locale ?? "en";
  const supabase = await createClient();
  const [blockedAccounts, { data: mfaFactors }] = await Promise.all([
    getBlockedByViewer(supabase, user.id),
    supabase.auth.mfa.listFactors(),
  ]);
  const mfaEnabled = Boolean(mfaFactors?.totp && mfaFactors.totp.length > 0);

  return (
    <div className="px-4 py-6">
      <h1 className="font-headline text-xl text-text">{t(locale, "settings.title")}</h1>

      <SettingsGroupLabel>{t(locale, "settings.preferences")}</SettingsGroupLabel>
      <section className="rounded-2xl border border-line bg-surface p-4">
        <LanguageSwitcher current={locale} />
      </section>

      <SettingsGroupLabel>{t(locale, "settings.security")}</SettingsGroupLabel>
      <section className="rounded-2xl border border-line bg-surface p-4">
        <TwoFactorSettings enabled={mfaEnabled} locale={locale} />
      </section>

      {blockedAccounts.length > 0 && (
        <>
          <SettingsGroupLabel>{t(locale, "settings.privacy")}</SettingsGroupLabel>
          <section className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="text-sm font-medium text-text">
              {t(locale, "settings.blockedAccounts")}
            </h2>
            <div className="mt-2 flex flex-col divide-y divide-line">
              {blockedAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-1.5 last:pb-1"
                >
                  <span className="truncate text-sm text-text">
                    {account.full_name || `@${account.handle}`}
                  </span>
                  <UnblockButton blockedId={account.id} path="/settings" locale={locale} />
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Messages/Consults/My Analytics/Learn used to live as a quick-link
          row on the profile header; moved here to keep that page from
          feeling crowded with navigation that isn't really about the
          profile itself. A grouped list with a trailing arrow per row
          (iOS Settings' own disclosure convention), not five identical
          boxes stacked with no way to tell them apart at a glance. */}
      <SettingsGroupLabel>{t(locale, "settings.shortcuts")}</SettingsGroupLabel>
      <section className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface px-4">
        <SettingsLink href="/messages">{t(locale, "messages.title")}</SettingsLink>
        <SettingsLink href="/consults">{t(locale, "settings.consults")}</SettingsLink>
        <SettingsLink href="/analytics">{t(locale, "settings.myAnalytics")}</SettingsLink>
        <SettingsLink href="/learn">{t(locale, "settings.learn")}</SettingsLink>
        <SettingsLink href="/notifications">{t(locale, "nav.notifications")}</SettingsLink>
      </section>

      <SettingsGroupLabel>{t(locale, "settings.account")}</SettingsGroupLabel>
      <section className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface px-4">
        {/* An admin's own profile page (/u/[handle]) is the moderation
            dashboard rather than the normal profile, so it no longer
            carries these — this is the one place left to reach them. */}
        <SettingsLink href="/onboarding">{t(locale, "settings.editProfile")}</SettingsLink>
        <SettingsLink href="/terms">{t(locale, "settings.termsOfService")}</SettingsLink>
        <SettingsLink href="/privacy">{t(locale, "settings.privacyPolicy")}</SettingsLink>
        <SettingsLink href="/contact">{t(locale, "settings.contactReport")}</SettingsLink>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full py-3 text-left text-sm font-medium text-danger transition-opacity duration-150 ease-out active:opacity-60"
          >
            {t(locale, "settings.signOut")}
          </button>
        </form>
      </section>

      <SettingsGroupLabel className="text-danger">
        {t(locale, "settings.dangerZone")}
      </SettingsGroupLabel>
      <section className="rounded-2xl border border-danger/30 bg-surface p-4">
        <DeleteAccount locale={locale} />
      </section>
    </div>
  );
}

function SettingsGroupLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`mb-2 mt-6 px-1 font-label text-xs uppercase tracking-wide text-muted first:mt-6 ${className ?? ""}`}
    >
      {children}
    </p>
  );
}

function SettingsLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 py-3 text-sm font-medium text-text transition-colors duration-150 ease-out hover:text-accent"
    >
      {children}
      <span aria-hidden className="text-muted">
        →
      </span>
    </Link>
  );
}
