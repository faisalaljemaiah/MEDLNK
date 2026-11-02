/**
 * What a member can pick on the "Pick your interests" sign-up step
 * (/onboarding/interests) and later in Settings. Stored as plain slugs in
 * profiles.interests (0044). Topic slugs and case-type values share one
 * list; case types reuse the real values from src/lib/case-types.ts so the
 * personalized feed can match them against cases.case_type directly.
 *
 * `art` is the picture on the tile. Emoji for now, so there's nothing to
 * license; swap for one consistent illustration set later without touching
 * anything else. `tint` is the tile's background in light mode; dark mode
 * uses the same hue at low opacity (see .interest-tile in globals.css).
 */
export type Interest = {
  slug: string;
  label: string;
  art: string;
  tint: string;
};

export const INTEREST_TOPICS: Interest[] = [
  { slug: "patient-safety", label: "Patient safety", art: "⚠️", tint: "#f6e3c8" },
  { slug: "pharmacology", label: "Pharmacology", art: "💊", tint: "#dfe9dc" },
  { slug: "cardiology", label: "Cardiology", art: "🫀", tint: "#f4dcd6" },
  { slug: "communication", label: "Communication", art: "💬", tint: "#dde6f1" },
  { slug: "emergency", label: "Emergency", art: "🚑", tint: "#f6e1d2" },
  { slug: "infectious-disease", label: "Infectious", art: "🦠", tint: "#e3ecd8" },
  { slug: "neurology", label: "Neurology", art: "🧠", tint: "#e7e0ef" },
  { slug: "pediatrics", label: "Pediatrics", art: "👶", tint: "#f3ead3" },
  { slug: "diagnostics", label: "Diagnostics", art: "🔬", tint: "#dceaec" },
  { slug: "oncology", label: "Oncology", art: "🎗️", tint: "#efdde6" },
  { slug: "critical-care", label: "Critical care", art: "🫁", tint: "#e0e4f2" },
  { slug: "mental-health", label: "Mental health", art: "🌱", tint: "#e2eedb" },
];

export const INTEREST_CASE_TYPES: Interest[] = [
  { slug: "near_miss", label: "Near misses", art: "🚨", tint: "#f6e3c8" },
  { slug: "clinical_pearl", label: "Clinical pearls", art: "💎", tint: "#e7e0ef" },
  { slug: "what_would_you_do", label: "What would you do?", art: "🤔", tint: "#dde6f1" },
  { slug: "research_finding", label: "Research", art: "📊", tint: "#dfe9dc" },
];

export const ALL_INTERESTS = [...INTEREST_TOPICS, ...INTEREST_CASE_TYPES];

export const MIN_INTERESTS = 3;

export function interestBySlug(slug: string): Interest | undefined {
  return ALL_INTERESTS.find((i) => i.slug === slug);
}

/** Keeps only known slugs, in list order, without duplicates. */
export function sanitizeInterests(raw: string[]): string[] {
  const wanted = new Set(raw);
  return ALL_INTERESTS.filter((i) => wanted.has(i.slug)).map((i) => i.slug);
}
