import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { signOutAction } from "@/app/actions/auth";

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("handle, verified, is_admin")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={28} />
          <span className="font-headline text-lg text-text">MEDLNK</span>
        </Link>

        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              {profile?.is_admin && (
                <Link href="/admin" className="text-muted hover:text-text">
                  Admin
                </Link>
              )}
              {profile?.verified ? (
                <Link
                  href="/compose"
                  className="rounded-full bg-accent px-3.5 py-1.5 font-medium text-white"
                >
                  New case
                </Link>
              ) : (
                <Link
                  href="/onboarding"
                  className="font-label text-xs uppercase tracking-wide text-warning"
                >
                  {profile?.handle ? "Pending review" : "Finish setup"}
                </Link>
              )}
              <form action={signOutAction}>
                <button type="submit" className="text-muted hover:text-text">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-muted hover:text-text">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-accent px-3.5 py-1.5 font-medium text-white"
              >
                Join
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
