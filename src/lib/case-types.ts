import type { CaseType } from "@/lib/database.types";

/**
 * Single source of truth for post types: the composer builds its selector from
 * this, the feed builds its badges and filters from it, and the case page picks
 * its layout from it. Adding a format means adding one entry here plus its
 * value in the case_type check constraint.
 */
export type CaseTypeMeta = {
  value: CaseType;
  label: string;
  /** One line shown under the label in the composer's type picker. */
  hint: string;
  /** Short badge text in the feed. Null means "no badge" — the default format. */
  badge: string | null;
  /**
   * Tailwind classes for the badge. Kept to existing tokens so new formats
   * inherit the current palette instead of introducing new colours.
   */
  badgeClass: string;
  /** Structured Near Miss prompts instead of the standard case body. */
  usesNearMiss?: boolean;
  /** Author attaches a multiple-choice question readers answer before reveal. */
  usesQuestion?: boolean;
  /** Closing sections stay hidden until the reader reveals them. */
  usesStagedReveal?: boolean;
  /** Short-form: only the caption is required, full body is optional. */
  shortForm?: boolean;
};

export const CASE_TYPES: CaseTypeMeta[] = [
  {
    value: "clinical_case",
    label: "Clinical case",
    hint: "The standard write-up: presentation, what was tricky, what you did, the lesson.",
    badge: null,
    badgeClass: "",
  },
  {
    value: "what_would_you_do",
    label: "What would you do?",
    hint: "Readers commit to an answer before they see yours.",
    badge: "What would you do?",
    badgeClass: "border-accent/40 bg-accent/10 text-accent",
    usesQuestion: true,
  },
  {
    value: "blind_case",
    label: "Blind case",
    hint: "Hide the lesson until the reader has reasoned it through.",
    badge: "Blind case",
    badgeClass: "border-accent-2/40 bg-accent-2/10 text-accent-2",
    usesStagedReveal: true,
  },
  {
    value: "case_evolution",
    label: "Case evolution",
    hint: "Publish the case now, add updates as it unfolds.",
    badge: "Evolving",
    badgeClass: "border-accent/40 bg-accent/10 text-accent",
  },
  {
    value: "near_miss",
    label: "Near miss",
    hint: "Something caught before it reached the patient.",
    badge: "Near miss",
    badgeClass: "border-warning/40 bg-warning/10 text-warning",
    usesNearMiss: true,
  },
  {
    value: "safety_alert",
    label: "Safety alert",
    hint: "A hazard other clinicians should know about now.",
    badge: "Safety alert",
    badgeClass: "border-danger/40 bg-danger/10 text-danger",
    usesNearMiss: true,
  },
  {
    value: "saw_this_today",
    label: "I saw this today",
    hint: "Something interesting, in a sentence or two. No full write-up needed.",
    badge: "Saw this today",
    badgeClass: "border-line bg-surface-2 text-muted",
    shortForm: true,
  },
  {
    value: "clinical_pearl",
    label: "Clinical pearl",
    hint: "A small, durable piece of practice wisdom.",
    badge: "Pearl",
    badgeClass: "border-positive/40 bg-positive/10 text-positive",
    shortForm: true,
  },
  {
    value: "things_i_wish_i_knew",
    label: "Things I wish I knew",
    hint: "What you'd tell yourself before that rotation, shift or role.",
    badge: "Wish I knew",
    badgeClass: "border-line bg-surface-2 text-muted",
    shortForm: true,
  },
  {
    value: "case_vs_case",
    label: "Case vs case",
    hint: "Two cases side by side — what changes the management?",
    badge: "Case vs case",
    badgeClass: "border-line bg-surface-2 text-muted",
  },
  {
    value: "research_finding",
    label: "Research finding",
    hint: "A paper or result worth other clinicians' attention.",
    badge: "Research",
    badgeClass: "border-line bg-surface-2 text-muted",
  },
];

const BY_VALUE = new Map<string, CaseTypeMeta>(
  CASE_TYPES.map((t) => [t.value, t]),
);

/** Falls back to the standard format for unknown values (e.g. a row written by a newer client). */
export function caseTypeMeta(value: string | null | undefined): CaseTypeMeta {
  return BY_VALUE.get(value ?? "") ?? CASE_TYPES[0];
}

export const NEAR_MISS_PROMPTS = [
  { name: "almost", label: "What almost went wrong?" },
  { name: "caught_by", label: "What caught it?" },
  { name: "prevention", label: "What should have prevented it?" },
  { name: "learned", label: "What did you learn?" },
  { name: "system_change", label: "What system change could prevent a repeat?" },
] as const;
