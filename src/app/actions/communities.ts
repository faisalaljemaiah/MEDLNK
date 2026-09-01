"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { trackEventAction } from "@/app/actions/analytics";
import type { CommunityScope } from "@/lib/database.types";

export type CommunityActionResult = { error: string } | { ok: true };

async function setMembership(
  communityId: string,
  path: string,
  status: "joined" | "saved",
): Promise<CommunityActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in to join a community." };
  }

  const { error } = await supabase
    .from("community_members")
    .upsert(
      { community_id: communityId, user_id: user.id, status },
      { onConflict: "community_id,user_id" },
    );

  if (error) {
    if (error.code === "42501") {
      return {
        error: "Only verified members can join communities — finish verification first.",
      };
    }
    return { error: error.message };
  }

  if (status === "joined") {
    await trackEventAction("community_joined");
  }

  revalidatePath(path);
  return { ok: true };
}

export async function joinCommunityAction(
  communityId: string,
  path: string,
): Promise<CommunityActionResult> {
  return setMembership(communityId, path, "joined");
}

export async function saveCommunityAction(
  communityId: string,
  path: string,
): Promise<CommunityActionResult> {
  return setMembership(communityId, path, "saved");
}

/** Covers both "leave" (was joined) and "unsave" (was only saved) — either
 *  way it's "remove my row", same as 0031's RLS delete policy treats them. */
export async function leaveCommunityAction(
  communityId: string,
  path: string,
): Promise<CommunityActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in to manage your communities." };
  }

  const { error } = await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(path);
  return { ok: true };
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "community"
  );
}

export type CreateCommunityState = { error: string } | undefined;

/**
 * The real 100-follower/verified gate is the communities_insert_eligible RLS
 * policy (0031_communities.sql) — this validates shape client-side-friendly
 * input and gives a readable message if the RLS check fails, same pattern as
 * toggleReactionAction's 42501 handling.
 */
export async function createCommunityAction(
  _prevState: CreateCommunityState,
  formData: FormData,
): Promise<CreateCommunityState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const scope = formData.get("scope") as CommunityScope;
  const countryCode = String(formData.get("country_code") ?? "").trim();

  if (!name) return { error: "Give the community a name." };
  if (scope !== "global" && scope !== "country") {
    return { error: "Choose whether this community is global or a single country." };
  }
  if (scope === "country" && !countryCode) {
    return { error: "Choose a country for a country-scoped community." };
  }

  const baseSlug = slugify(name);
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

  const { data: created, error } = await supabase
    .from("communities")
    .insert({
      name,
      slug,
      description: description || null,
      scope,
      country_code: scope === "country" ? countryCode : null,
      creator_id: user.id,
    })
    .select("slug")
    .single();

  if (error || !created) {
    if (error?.code === "42501") {
      return {
        error:
          "You need to be verified with at least 100 followers to start a community.",
      };
    }
    return { error: error?.message ?? "Could not create the community." };
  }

  revalidatePath("/messages");
  redirect(`/communities/${created.slug}`);
}
