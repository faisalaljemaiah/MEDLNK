import type { Locale } from "@/lib/database.types";

/**
 * What a member can pick on the "Pick your interests" sign-up step
 * (/onboarding/interests) and later from Edit Profile. Stored as plain slugs in
 * profiles.interests (0044). Topic slugs and case-type values share one
 * list; case types reuse the real values from src/lib/case-types.ts so the
 * personalized feed can match them against cases.case_type directly.
 *
 * `art` is the picture on the tile. Emoji for now, so there's nothing to
 * license; swap for one consistent illustration set later without touching
 * anything else. `tint` is the tile's background in light mode; dark mode
 * uses the same hue at low opacity (see .picture-tile in globals.css).
 */
export type Interest = {
  slug: string;
  label: string;
  labelAr: string;
  art: string;
  tint: string;
};

export const INTEREST_TOPICS: Interest[] = [
  { slug: "patient-safety", label: "Patient safety", labelAr: "سلامة المرضى", art: "⚠️", tint: "#f6e3c8" },
  { slug: "pharmacology", label: "Pharmacology", labelAr: "علم الأدوية", art: "💊", tint: "#dfe9dc" },
  { slug: "cardiology", label: "Cardiology", labelAr: "أمراض القلب", art: "🫀", tint: "#f4dcd6" },
  { slug: "communication", label: "Communication", labelAr: "التواصل", art: "💬", tint: "#dde6f1" },
  { slug: "emergency", label: "Emergency", labelAr: "الطوارئ", art: "🚑", tint: "#f6e1d2" },
  { slug: "infectious-disease", label: "Infectious", labelAr: "الأمراض المعدية", art: "🦠", tint: "#e3ecd8" },
  { slug: "neurology", label: "Neurology", labelAr: "الأعصاب", art: "🧠", tint: "#e7e0ef" },
  { slug: "pediatrics", label: "Pediatrics", labelAr: "طب الأطفال", art: "👶", tint: "#f3ead3" },
  { slug: "diagnostics", label: "Diagnostics", labelAr: "التشخيص", art: "🔬", tint: "#dceaec" },
  { slug: "oncology", label: "Oncology", labelAr: "الأورام", art: "🎗️", tint: "#efdde6" },
  { slug: "critical-care", label: "Critical care", labelAr: "العناية المركزة", art: "🫁", tint: "#e0e4f2" },
  { slug: "mental-health", label: "Mental health", labelAr: "الصحة النفسية", art: "🌱", tint: "#e2eedb" },
];

export const INTEREST_CASE_TYPES: Interest[] = [
  { slug: "near_miss", label: "Near misses", labelAr: "أخطاء كادت تقع", art: "🚨", tint: "#f6e3c8" },
  { slug: "clinical_pearl", label: "Clinical pearls", labelAr: "درر سريرية", art: "💎", tint: "#e7e0ef" },
  { slug: "what_would_you_do", label: "What would you do?", labelAr: "ماذا كنت لتفعل؟", art: "🤔", tint: "#dde6f1" },
  { slug: "research_finding", label: "Research", labelAr: "أبحاث", art: "📊", tint: "#dfe9dc" },
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

export function interestLabel(i: Interest, locale: Locale): string {
  return locale === "ar" ? i.labelAr : i.label;
}
