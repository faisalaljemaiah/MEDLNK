"use client";

import { useRef, useState, useTransition } from "react";
import { clsx } from "clsx";
import { addReasoningNodeAction } from "@/app/actions/reasoning-trees";
import type { ReasoningNodeType } from "@/lib/database.types";
import type { ReasoningTreeNode } from "@/lib/reasoning-trees";

const NODE_TYPE_META: Record<
  ReasoningNodeType,
  { label: string; className: string }
> = {
  finding: { label: "Finding", className: "border-line text-muted" },
  differential: {
    label: "Differential",
    className: "border-accent/40 text-accent",
  },
  action: { label: "Action", className: "border-accent-2/40 text-accent-2" },
  conclusion: {
    label: "Conclusion",
    className: "border-positive/40 text-positive",
  },
};

/**
 * Clinical Reasoning Trees (spec §8): how the author actually got from
 * presentation to conclusion, as branches rather than one linear write-up.
 * Author-only, added after the case is published — same pattern as Case
 * Evolution's timeline.
 */
export function ReasoningTree({
  caseId,
  tree,
  isAuthor,
  path,
}: {
  caseId: string;
  tree: ReasoningTreeNode[];
  isAuthor: boolean;
  path: string;
}) {
  if (tree.length === 0 && !isAuthor) return null;

  return (
    <section className="mt-6 border-t border-line pt-4">
      <p className="font-label text-xs uppercase tracking-wide text-muted">
        Reasoning tree
      </p>

      {tree.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          No branches yet — lay out how you actually reasoned through this
          case, step by step.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {tree.map((node) => (
            <TreeNode
              key={node.id}
              caseId={caseId}
              node={node}
              isAuthor={isAuthor}
              path={path}
              depth={0}
            />
          ))}
        </ul>
      )}

      {isAuthor && (
        <div className="mt-3">
          <AddNodeForm caseId={caseId} parentId={null} path={path} />
        </div>
      )}
    </section>
  );
}

function TreeNode({
  caseId,
  node,
  isAuthor,
  path,
  depth,
}: {
  caseId: string;
  node: ReasoningTreeNode;
  isAuthor: boolean;
  path: string;
  depth: number;
}) {
  const meta = NODE_TYPE_META[node.node_type];

  return (
    <li
      className={clsx(depth > 0 && "ml-4 border-l border-line pl-4")}
      style={depth > 0 ? { marginLeft: `${Math.min(depth, 4) * 4}px` } : undefined}
    >
      <span
        className={clsx(
          "inline-block rounded-full border px-2 py-0.5 font-label text-[11px]",
          meta.className,
        )}
      >
        {meta.label}
      </span>
      <p className="mt-1 text-sm font-medium text-text">{node.label}</p>
      {node.body && (
        <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-muted">
          {node.body}
        </p>
      )}

      {node.children.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              caseId={caseId}
              node={child}
              isAuthor={isAuthor}
              path={path}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}

      {isAuthor && (
        <div className="mt-2">
          <AddNodeForm caseId={caseId} parentId={node.id} path={path} compact />
        </div>
      )}
    </li>
  );
}

function AddNodeForm({
  caseId,
  parentId,
  path,
  compact,
}: {
  caseId: string;
  parentId: string | null;
  path: string;
  compact?: boolean;
}) {
  const [composing, setComposing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addReasoningNodeAction(caseId, parentId, formData, path);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setComposing(false);
    });
  }

  if (!composing) {
    return (
      <button
        type="button"
        onClick={() => setComposing(true)}
        className={clsx(
          "rounded-lg border border-line font-medium text-text hover:border-accent hover:text-accent",
          compact ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm",
        )}
      >
        {parentId ? "+ Add branch" : "+ Add a finding or conclusion"}
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3"
    >
      <select
        name="node_type"
        defaultValue="differential"
        className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
      >
        <option value="finding">Finding</option>
        <option value="differential">Differential considered</option>
        <option value="action">Action taken</option>
        <option value="conclusion">Conclusion</option>
      </select>
      <input
        type="text"
        name="label"
        placeholder="Short label — e.g. Elevated troponin"
        required
        className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <textarea
        name="body"
        placeholder="Why it mattered, or why it was ruled out (optional)."
        className="min-h-16 resize-y rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add branch"}
        </button>
        <button
          type="button"
          onClick={() => setComposing(false)}
          className="rounded-lg border border-line px-3.5 py-2 text-sm text-muted"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
