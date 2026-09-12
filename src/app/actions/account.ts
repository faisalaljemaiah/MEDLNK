"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type DeleteAccountResult = { error: string } | undefined;

/**
 * App Store 5.1.1(v) and Google Play both require self-service account
 * deletion, reachable from inside the app — not just "contact support." This
 * used to delete the auth user outright; it now only marks the profile
 * (deleted_at), giving a 30-day restore window before that same complete,
 * irreversible cascade actually runs — src/app/api/cron/purge-deleted-accounts
 * hard-deletes anything past 30 days, via the exact same
 * `admin.auth.admin.deleteUser` call this action used to make directly.
 *
 * A plain RLS-scoped update, not the admin client — profiles_update_own
 * (0004) already lets a member write their own row, and is_verified()/
 * is_active() (0042) both refuse every write in this schema the moment
 * deleted_at is set, so this one column is the entire "soft" half of the
 * deletion.
 */
export async function deleteAccountAction(
  confirmation: string,
): Promise<DeleteAccountResult> {
  if (confirmation !== "DELETE") {
    return { error: 'Type "DELETE" to confirm.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) {
    return { error: "Something went wrong deleting your account. Please try again." };
  }

  await supabase.auth.signOut();
  redirect("/welcome");
}

export type RestoreAccountResult = { error: string } | undefined;

/**
 * The other half of deleteAccountAction — reachable from /restore-account,
 * where signInAction (src/app/actions/auth.ts) and the (app) layout's own
 * deleted_at check both send an account that's still within its 30-day
 * window. Clearing the column is all restoring means: nothing was actually
 * removed yet, so there's nothing else to undo.
 */
export async function restoreAccountAction(): Promise<RestoreAccountResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ deleted_at: null })
    .eq("id", user.id);
  if (error) {
    return { error: "Something went wrong restoring your account. Please try again." };
  }

  redirect("/");
}
