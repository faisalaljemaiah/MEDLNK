import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/actions/auth";
import { RestoreAccountButton } from "@/components/restore-account-button";
import { LogoMark } from "@/components/brand";

const GRACE_DAYS = 30;

/**
 * Where signInAction and the (app) layout's own deleted_at check both send
 * an account that's still inside its 30-day window (deleteAccountAction,
 * src/app/actions/account.ts) — the one thing standing between "restore" and
 * the feed for an account in that state, the same way /verify-2fa is the one
 * thing standing between a password and the feed for 2FA.
 */
export default async function RestoreAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("deleted_at")
    .eq("id", user.id)
    .single();

  // Nothing to restore — either this account was never deleted, or it
  // already was restored (e.g. a second tab open to this same page) —
  // send it on rather than showing a stale prompt.
  if (!profile?.deleted_at) redirect("/");

  const purgeDate = new Date(
    new Date(profile.deleted_at).getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000,
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <div className="animate-welcome-logo flex flex-col items-center gap-3 text-center">
        <LogoMark size={40} />
        <h1 className="font-headline text-2xl text-text">Restore your account?</h1>
        <p className="text-sm text-muted">
          You deleted your account on{" "}
          {new Date(profile.deleted_at).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
          . It&apos;s scheduled for permanent deletion on{" "}
          <span className="font-medium text-text">
            {purgeDate.toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          . Restoring it now keeps everything exactly as it was — your posts,
          comments, and messages.
        </p>
      </div>

      <div className="animate-welcome-rise">
        <RestoreAccountButton />
      </div>

      <form action={signOutAction} className="animate-welcome-rise text-center">
        <button type="submit" className="text-sm text-muted hover:text-text">
          Sign out instead
        </button>
      </form>
    </div>
  );
}
