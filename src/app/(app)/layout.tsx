import { BottomNav } from "@/components/bottom-nav";
import { TopHeader } from "@/components/top-header";
import { DesktopSidebar } from "@/components/desktop-sidebar";
import { getViewer, getViewerProfile } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, profile] = await Promise.all([getViewer(), getViewerProfile()]);

  return (
    // Mobile shell (single centered column, floating bottom nav) is
    // untouched below `md:` — this is purely additive, the app's first
    // tablet/desktop layout. From `md:` up (roughly iPad-portrait and
    // wider), a left nav rail takes over navigation and the bottom nav
    // hides.
    <div className="flex min-h-dvh flex-1 flex-col md:mx-auto md:w-full md:max-w-5xl md:flex-row md:items-start md:gap-6 md:px-6">
      <DesktopSidebar profile={profile} />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col md:mx-0 md:min-w-0">
        <TopHeader loggedIn={Boolean(user)} />
        <main className="flex flex-1 flex-col pb-24 md:pb-10">{children}</main>
      </div>
      <div className="md:hidden">
        <BottomNav profile={profile} />
      </div>
    </div>
  );
}
