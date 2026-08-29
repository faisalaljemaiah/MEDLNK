"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeleteAccountResult = { error: string } | undefined;

/**
 * App Store 5.1.1(v) and Google Play both require self-service account
 * deletion, reachable from inside the app — not just "contact support."
 * profiles.id references auth.users(id) on delete cascade, and every other
 * table (cases, comments, messages, follows, reactions, user_blocks, ...)
 * references profiles(id) on delete cascade in turn, so deleting the auth
 * user is a genuine, complete deletion of everything tied to the account —
 * not a soft deactivation.
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

  // Only reachable after the session above confirmed this user's own ID —
  // never pass through a client-supplied ID here.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return { error: "Something went wrong deleting your account. Please try again." };
  }

  await supabase.auth.signOut();
  redirect("/welcome");
}
