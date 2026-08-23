import { BottomNav } from "@/components/bottom-nav";
import { TopHeader } from "@/components/top-header";
import { getViewer, getViewerProfile } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, profile] = await Promise.all([getViewer(), getViewerProfile()]);

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <TopHeader loggedIn={Boolean(user)} />
        <main className="flex flex-1 flex-col pb-24">{children}</main>
      </div>
      <BottomNav profile={profile} />
    </div>
  );
}
