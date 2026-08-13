import type { ClinicalReactionType, ReactionType } from "@/lib/database.types";

/**
 * Single source of truth for the clinical-value reactions (spec §9).
 *
 * The reaction bar builds its buttons from this, the profile builds its
 * contribution stats from it, and anything later that reads "how did this land
 * clinically" should too. Adding one means adding an entry here plus its value
 * in the reactions type check constraint.
 */
export type ClinicalReactionMeta = {
  value: ClinicalReactionType;
  emoji: string;
  /** Shown on the case page, where there is room to be explicit. */
  label: string;
  /** Shown in the feed and reel, where there isn't. */
  shortLabel: string;
  /** What pressing it is claiming — used as the accessible name. */
  hint: string;
  /** Token-based colour for the active state. Never a raw hex. */
  activeClass: string;
};

export const CLINICAL_REACTIONS: ClinicalReactionMeta[] = [
  {
    value: "interesting",
    emoji: "💡",
    label: "Interesting",
    shortLabel: "Interesting",
    hint: "Mark as interesting — worth knowing",
    activeClass: "border-accent-2/40 bg-accent-2/10 text-accent-2",
  },
  {
    value: "changed_thinking",
    emoji: "🧠",
    label: "Changed my thinking",
    shortLabel: "Changed my mind",
    hint: "Mark as having changed how you would practise",
    activeClass: "border-accent/40 bg-accent/10 text-accent",
  },
  {
    value: "patient_safety",
    emoji: "⚠️",
    label: "Patient safety",
    shortLabel: "Safety",
    hint: "Flag as a patient-safety issue others should see",
    activeClass: "border-warning/40 bg-warning/10 text-warning",
  },
];

export const CLINICAL_REACTION_TYPES: ClinicalReactionType[] =
  CLINICAL_REACTIONS.map((r) => r.value);

export function isClinicalReaction(
  type: ReactionType,
): type is ClinicalReactionType {
  return (CLINICAL_REACTION_TYPES as ReactionType[]).includes(type);
}

/**
 * The reel's double-tap gesture. It used to record a like; with likes gone it
 * records the mildest of the three, which is what a tap-to-appreciate actually
 * means. Named rather than inlined so the gesture and the button agree.
 */
export const DOUBLE_TAP_REACTION: ClinicalReactionType = "interesting";
