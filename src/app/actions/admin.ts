"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");
  return supabase;
}

export async function approveUserAction(profileId: string) {
  const supabase = await requireAdmin();
  await supabase
    .from("profiles")
    .update({ verified: true, verification_status: "approved" })
    .eq("id", profileId);
  revalidatePath("/admin");
}

export async function rejectUserAction(profileId: string) {
  const supabase = await requireAdmin();
  await supabase
    .from("profiles")
    .update({ verified: false, verification_status: "rejected" })
    .eq("id", profileId);
  revalidatePath("/admin");
}
