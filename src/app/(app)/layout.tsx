import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/bottom-nav";
import { TopHeader } from "@/components/top-header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("handle, full_name, avatar_url")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <TopHeader loggedIn={Boolean(user)} />
        <main className="flex flex-1 flex-col pb-20">{children}</main>
      </div>
      <BottomNav profile={user ? profile : null} />
    </div>
  );
}
