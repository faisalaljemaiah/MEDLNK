import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, CaseReasoningNode } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export type ReasoningTreeNode = CaseReasoningNode & {
  children: ReasoningTreeNode[];
};

/**
 * The case's reasoning tree, nested. Returns null — not [] — when the read
 * fails, which it will pre-migration since case_reasoning_nodes doesn't exist
 * on the hosted project yet. An empty tree and an unavailable one look
 * identical to a naive caller, and this codebase has already shipped that bug
 * once (getFollowedCases); the caller decides what null renders as.
 */
export async function getReasoningTree(
  supabase: Client,
  caseId: string,
): Promise<ReasoningTreeNode[] | null> {
  const { data, error } = await supabase
    .from("case_reasoning_nodes")
    .select("*")
    .eq("case_id", caseId)
    .order("position", { ascending: true });

  if (error) return null;
  return buildTree((data ?? []) as CaseReasoningNode[]);
}

function buildTree(rows: CaseReasoningNode[]): ReasoningTreeNode[] {
  const byId = new Map<string, ReasoningTreeNode>();
  for (const row of rows) byId.set(row.id, { ...row, children: [] });

  const roots: ReasoningTreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
