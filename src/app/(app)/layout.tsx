import { redirect } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { TopHeader } from "@/components/top-header";
import { DesktopSidebar } from "@/components/desktop-sidebar";
import { getViewer, getViewerProfile } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [viewer, profile] = await Promise.all([getViewer(), getViewerProfile()]);

  // A password-only sign-in on an account with 2FA enrolled leaves the
  // session at aal1 — a real, cookie-valid session, just not yet cleared to
  // actually use the app. Every page under this layout is gated on
  // completing that challenge first, not just the sign-in redirect
  // (signInAction, src/app/actions/auth.ts) — someone who closes the tab
  // mid-challenge and reopens any app URL directly must still land back on
  // /verify-2fa rather than straight into their feed.
  if (viewer) {
    const supabase = await createClient();
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
      redirect("/verify-2fa");
    }
  }

  // An account inside its 30-day deletion window (deleteAccountAction,
  // src/app/actions/account.ts) is still a valid, cookie-valid session —
  // signInAction already redirects a fresh sign-in to /restore-account, but
  // an existing session (another tab, a device that was already signed in
  // when the deletion happened elsewhere) has to be caught here too, before
  // it ever reaches a feed is_verified()/is_active() would refuse every
  // write on anyway.
  if (viewer && profile?.deleted_at) {
    redirect("/restore-account");
  }

  // A session exists the moment signup completes, before onboarding is ever
  // touched — handle_new_user (0003/0035) inserts the profile row with only
  // full_name and locale set, and profiles.handle stays null until
  // onboarding itself sets it (OnboardingForm; see also the isEdit check on
  // that page). So a null handle here means exactly one thing: this account
  // was created and then abandoned before finishing setup. Every route
  // under this layout requires that setup be done, the same way every route
  // already requires being signed in at all — someone who closes the tab
  // mid-onboarding and reopens any app URL directly must land back on
  // /onboarding, not into a feed they never actually set up for.
  if (viewer && !profile?.handle) {
    redirect("/onboarding");
  }

  // Badges the header's notifications icon — 0 (and no badge) whenever the
  // count fails, same "must never take the header down" stance as
  // getUnreadNotificationCount itself already takes.
  const unreadNotifications = viewer
    ? await getUnreadNotificationCount(await createClient(), viewer.id)
    : 0;

  return (
    // Mobile shell (single centered column, floating bottom nav) is
    // untouched below `md:` — this is purely additive, the app's first
    // tablet/desktop layout. From `md:` up (roughly iPad-portrait and
    // wider), a left nav rail takes over navigation and the bottom nav
    // hides. The sidebar is `fixed` to the actual left edge of the browser
    // window (not a flex sibling inside a centered wrapper) — a centered
    // wrapper would leave a wide, empty margin in front of it on anything
    // wider than the content column, which is exactly what looked broken
    // before this. `md:pl-56` on the content column reserves the sidebar's
    // width so nothing sits underneath it.
    <div className="flex min-h-dvh flex-1 flex-col md:pl-56">
      <DesktopSidebar profile={profile} />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <TopHeader unreadNotifications={unreadNotifications} />
        <main className="flex flex-1 flex-col pb-24 md:pb-10">{children}</main>
      </div>
      <div className="md:hidden">
        <BottomNav profile={profile} />
      </div>
    </div>
  );
}
