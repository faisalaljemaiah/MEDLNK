import type { CommentLabel } from "@/lib/database.types";

/**
 * Single source of truth for reply labels (spec §25). The composer builds its
 * picker from this and the thread builds its badges from it. Adding one means
 * adding an entry here plus its value in the comments label check constraint.
 *
 * Was deliberately five, on the theory that a picker long enough to need
 * thought stops being used — "Other" is the deliberate exception: a reply
 * that's genuinely none of the five shouldn't be forced into the
 * closest-fitting one just because there's no honest option, and it's the
 * kind of pressure-release valve that keeps the other five meaningful rather
 * than becoming catch-alls themselves.
 */
export type CommentLabelMeta = {
  value: CommentLabel;
  /** Badge text on the reply. Written from the commenter's point of view. */
  label: string;
  /** Shown in the picker when there is room to say what it's for. */
  hint: string;
  /** Token-based colours. Never a raw hex. */
  badgeClass: string;
};

export const COMMENT_LABELS: CommentLabelMeta[] = [
  {
    value: "agree",
    label: "I'd do the same",
    hint: "You'd have managed it the same way",
    badgeClass: "border-positive/40 bg-positive/10 text-positive",
  },
  {
    value: "differ",
    label: "I'd do it differently",
    hint: "You'd have taken another approach — say what and why",
    badgeClass: "border-accent/40 bg-accent/10 text-accent",
  },
  {
    value: "question",
    label: "Question",
    hint: "Something you want the author to clarify",
    badgeClass: "border-accent-2/40 bg-accent-2/10 text-accent-2",
  },
  {
    value: "teaching",
    label: "Teaching point",
    hint: "Something worth the whole thread knowing",
    badgeClass: "border-warning/40 bg-warning/10 text-warning",
  },
  {
    value: "evidence",
    label: "Evidence",
    hint: "A guideline, trial or reference that bears on this",
    badgeClass: "border-line bg-surface-2 text-muted",
  },
  {
    value: "other",
    label: "Other",
    hint: "Doesn't fit the rest — say what it is",
    badgeClass: "border-line bg-surface-2 text-muted",
  },
];

const BY_VALUE = new Map<string, CommentLabelMeta>(
  COMMENT_LABELS.map((l) => [l.value, l]),
);

/** Null for no label and for values this build doesn't know. */
export function commentLabelMeta(
  value: string | null | undefined,
): CommentLabelMeta | null {
  return BY_VALUE.get(value ?? "") ?? null;
}

export function isCommentLabel(value: string): value is CommentLabel {
  return BY_VALUE.has(value);
}
