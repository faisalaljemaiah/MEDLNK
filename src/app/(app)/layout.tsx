import { BottomNav } from "@/components/bottom-nav";
import { TopHeader } from "@/components/top-header";
import { DesktopSidebar } from "@/components/desktop-sidebar";
import { getViewer, getViewerProfile } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, profile] = await Promise.all([getViewer(), getViewerProfile()]);

  return (
    // The mobile shell (single centered column, floating bottom nav) is
    // untouched below `lg:` — this is purely additive, the app's first
    // desktop-specific layout. Above `lg:`, a left nav rail takes over
    // navigation and the bottom nav hides; any per-page right rail (e.g.
    // Home's trending/people column) is that page's own concern, not this
    // shared shell's — see src/app/(app)/page.tsx.
    <div className="flex min-h-dvh flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-6xl lg:flex-row lg:items-start lg:gap-6 lg:px-6">
      <DesktopSidebar profile={profile} />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col lg:mx-0 lg:min-w-0">
        <TopHeader loggedIn={Boolean(user)} />
        <main className="flex flex-1 flex-col pb-24 lg:pb-10">{children}</main>
      </div>
      <div className="lg:hidden">
        <BottomNav profile={profile} />
      </div>
    </div>
  );
}
