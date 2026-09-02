import { BottomNav } from "@/components/bottom-nav";
import { TopHeader } from "@/components/top-header";
import { DesktopSidebar } from "@/components/desktop-sidebar";
import { getViewerProfile } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getViewerProfile();

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
        {/* Nav and header have swapped places (an experiment) — nav now
            floats at the top, the header bar now sits fixed at the bottom.
            Neither reserves flow space any more (both are `fixed`), so the
            content column carries the padding that used to come for free:
            pt- clears the floating nav (mobile only, md:hidden below),
            pb- clears the header bar now fixed at the bottom on every
            width. */}
        <main className="flex flex-1 flex-col pt-24 pb-16 md:pt-0">{children}</main>
        <TopHeader />
      </div>
      <div className="md:hidden">
        <BottomNav profile={profile} />
      </div>
    </div>
  );
}
