"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type BlockActionResult = { error: string } | { ok: true };

export async function blockUserAction(
  blockedId: string,
  path: string,
): Promise<BlockActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in to block a user." };
  }
  if (user.id === blockedId) {
    return { error: "You can't block yourself." };
  }

  const { error } = await supabase
    .from("user_blocks")
    .insert({ blocker_id: user.id, blocked_id: blockedId });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(path);
  revalidatePath("/settings");
  return { ok: true };
}

export async function unblockUserAction(
  blockedId: string,
  path: string,
): Promise<BlockActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in to manage blocked accounts." };
  }

  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", blockedId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(path);
  revalidatePath("/settings");
  return { ok: true };
}
