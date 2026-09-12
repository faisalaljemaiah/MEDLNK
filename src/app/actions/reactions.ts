"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { trackEventAction } from "@/app/actions/analytics";
import { sendPushToUsers } from "@/lib/web-push";
import { isClinicalReaction } from "@/lib/reaction-types";
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
      // Only a suspended account fails is_active() at this point — reacting
      // no longer waits on license verification (0038).
      if (error.code === "42501") {
        return {
          error: "Your account can't do that right now.",
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

    // "Likes" in the notifications inbox means one of the three clinical
    // values — repost and save are bookmarking/sharing, not the same
    // "someone appreciated this" signal, so they don't notify. Best-effort,
    // same as every other notification dispatch in this codebase: the
    // reaction is saved regardless of whether the push (or the in-app
    // notification row behind it) goes through.
    if (isClinicalReaction(type)) {
      try {
        const { data: authorId } = await supabase.rpc("notify_new_reaction", {
          p_case_id: caseId,
          p_type: type,
        });
        if (authorId) {
          const { data: caseRow } = await supabase
            .from("cases")
            .select("case_number")
            .eq("id", caseId)
            .single();
          const { data: actor } = await supabase
            .from("profiles")
            .select("handle,full_name")
            .eq("id", user.id)
            .single();
          await sendPushToUsers(supabase, [authorId], {
            title: "New reaction",
            body: `${actor?.full_name || `@${actor?.handle}` || "Someone"} reacted to your case`,
            url: caseRow?.case_number ? `/case/${caseRow.case_number}` : "/",
          });
        }
      } catch {
        // Reaction is saved; notifying the author is not worth failing it for.
      }
    }
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
      // A suspended account, or a block between the two profiles
      // (is_blocked_pair, 0029) — following no longer waits on license
      // verification (0038).
      if (error.code === "42501") {
        return {
          error: "You can't follow this account right now.",
        };
      }
      return { error: error.message };
    }

    // Best-effort, same as every other notification dispatch in this
    // codebase: the follow is saved regardless of whether the push (or even
    // the in-app notification row behind it) goes through.
    try {
      const { data: recipientId } = await supabase.rpc("notify_new_follower", {
        p_followee_id: followeeId,
      });
      if (recipientId) {
        const { data: actor } = await supabase
          .from("profiles")
          .select("handle,full_name")
          .eq("id", user.id)
          .single();
        await sendPushToUsers(supabase, [recipientId], {
          title: "New follower",
          body: `${actor?.full_name || `@${actor?.handle}` || "Someone"} started following you`,
          url: actor?.handle ? `/u/${actor.handle}` : "/",
        });
      }
    } catch {
      // Follow is saved; notifying the followee is not worth failing it for.
    }
  }

  revalidatePath(path);
  return { ok: true };
}
