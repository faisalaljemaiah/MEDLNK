import { redirect } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { TopHeader } from "@/components/top-header";
import { DesktopSidebar } from "@/components/desktop-sidebar";
import { getViewer, getViewerProfile } from "@/lib/auth";
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
        <TopHeader />
        <main className="flex flex-1 flex-col pb-24 md:pb-10">{children}</main>
      </div>
      <div className="md:hidden">
        <BottomNav profile={profile} />
      </div>
    </div>
  );
}
