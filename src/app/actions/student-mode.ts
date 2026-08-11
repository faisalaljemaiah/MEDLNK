"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Turns Student Mode on or off.
 *
 * Void-returning so it can be a plain `<form action>`. RLS restricts profile
 * updates to your own row (profiles_update_own, 0004), so there's no ownership
 * check here.
 *
 * Revalidates at "layout" scope because the mode changes the bottom nav, which
 * lives in the layout — revalidating the page alone would leave the toggle
 * flipped and the nav unchanged.
 */
export async function setStudentModeAction(enabled: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("profiles")
    .update({ student_mode: enabled })
    .eq("id", user.id);

  revalidatePath("/", "layout");
}
