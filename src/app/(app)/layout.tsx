import { BottomNav } from "@/components/bottom-nav";
import { TopHeader } from "@/components/top-header";
import { createClient } from "@/lib/supabase/server";
import { getViewer, getViewerProfile } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getViewer();

  // Both reads depend on the viewer and on nothing else, so they go out
  // together — the unread count costs no extra round trip in the layout.
  const [profile, unreadNotifications] = await Promise.all([
    getViewerProfile(),
    user
      ? createClient().then((supabase) =>
          getUnreadNotificationCount(supabase, user.id),
        )
      : Promise.resolve(0),
  ]);

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <TopHeader
          loggedIn={Boolean(user)}
          unreadNotifications={unreadNotifications}
        />
        <main className="flex flex-1 flex-col pb-24">{children}</main>
      </div>
      <BottomNav profile={profile} />
    </div>
  );
}
