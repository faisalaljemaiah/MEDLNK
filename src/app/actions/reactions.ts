"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { trackEventAction } from "@/app/actions/analytics";
import type { ReactionType } from "@/lib/database.types";

export type ReactionActionResult = { error: string } | { ok: true };

export async function toggleReactionAction(
  caseId: string,
  type: ReactionType,
  path: string,
): Promise<ReactionActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in to react to cases." };
  }

  const { data: existing } = await supabase
    .from("reactions")
    .select("id")
    .eq("case_id", caseId)
    .eq("user_id", user.id)
    .eq("type", type)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("reactions")
      .delete()
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("reactions").insert({
      case_id: caseId,
      user_id: user.id,
      type,
    });
    if (error) {
      if (error.code === "42501") {
        return {
          error: "Only verified members can react — finish verification first.",
        };
      }
      // 23514 is a check-constraint violation, which for this table means one
      // thing: the app is writing the clinical reaction values from 0010 and
      // the database is still on the old like/repost/save constraint. Worth
      // naming, because the raw Postgres text sends you looking at the wrong
      // layer entirely.
      if (error.code === "23514") {
        return {
          error:
            "Reactions need a database update that hasn't been applied yet " +
            "(migration 0010). Nothing was recorded.",
        };
      }
      return { error: error.message };
    }
    // Only the "adding" branch counts as feature usage — removing a
    // reaction is the same click undoing itself, not a second use.
    await trackEventAction("reaction_toggled", { type });
  }

  revalidatePath(path);
  return { ok: true };
}

export async function toggleFollowAction(
  followeeId: string,
  path: string,
): Promise<ReactionActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in to follow clinicians." };
  }
  if (user.id === followeeId) {
    return { error: "You can't follow yourself." };
  }

  const { data: existing } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("followee_id", followeeId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("followee_id", followeeId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("follows").insert({
      follower_id: user.id,
      followee_id: followeeId,
    });
    if (error) {
      if (error.code === "42501") {
        return {
          error: "Only verified members can follow — finish verification first.",
        };
      }
      return { error: error.message };
    }
  }

  revalidatePath(path);
  return { ok: true };
}
