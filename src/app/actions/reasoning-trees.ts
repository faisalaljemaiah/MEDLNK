"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ReasoningNodeType } from "@/lib/database.types";

const NODE_TYPES: ReasoningNodeType[] = [
  "finding",
  "differential",
  "action",
  "conclusion",
];

export type ReasoningNodeResult = { error: string } | { ok: true };

/**
 * Adds one branch to a case's reasoning tree. RLS already restricts inserts
 * to a verified author of the parent case and requires a given parent_id to
 * belong to the same case, so this doesn't re-check either — the database is
 * the authority, same as publishCaseUpdateAction.
 */
export async function addReasoningNodeAction(
  caseId: string,
  parentId: string | null,
  formData: FormData,
  path: string,
): Promise<ReasoningNodeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sign in to build a reasoning tree." };

  const rawType = String(formData.get("node_type") ?? "differential");
  const node_type = NODE_TYPES.includes(rawType as ReasoningNodeType)
    ? (rawType as ReasoningNodeType)
    : "differential";
  const label = String(formData.get("label") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!label) {
    return { error: "Give the branch a short label." };
  }

  let siblingQuery = supabase
    .from("case_reasoning_nodes")
    .select("*", { count: "exact", head: true })
    .eq("case_id", caseId);
  siblingQuery = parentId
    ? siblingQuery.eq("parent_id", parentId)
    : siblingQuery.is("parent_id", null);
  const { count } = await siblingQuery;

  const { error } = await supabase.from("case_reasoning_nodes").insert({
    case_id: caseId,
    parent_id: parentId,
    node_type,
    label,
    body: body || null,
    position: count ?? 0,
  });

  if (error) {
    if (error.code === "42501") {
      return { error: "Only the case author can build its reasoning tree." };
    }
    return { error: error.message };
  }

  revalidatePath(path);
  return { ok: true };
}
