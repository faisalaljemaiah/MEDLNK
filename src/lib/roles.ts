import type { Locale } from "@/lib/database.types";

export const ROLES = [
  "Physician - Family Medicine / General Practice",
  "Physician - Internal Medicine",
  "Surgeon",
  "Orthopedic Surgeon",
  "Obstetrician / Gynecologist",
  "Pediatrician",
  "Psychiatrist",
  "Cardiologist",
  "Anesthesiologist",
  "Emergency Medicine Physician",
  "Radiologist",
  "Dermatologist",
  "Neurologist",
  "Oncologist",
  "Medical Student",
  "Registered Nurse",
  "Nurse Practitioner",
  "Nursing Student",
  "Midwife",
  "Physician Assistant",
  "Clinical Pharmacist",
  "Hospital Pharmacist",
  "Community Pharmacist",
  "Pharmacy Resident",
  "Pharmacy Student",
  "Dentist",
  "Physical Therapist",
  "Occupational Therapist",
  "Speech-Language Pathologist",
  "Respiratory Therapist",
  "Dietitian / Nutritionist",
  "Psychologist",
  "Medical Laboratory Scientist",
  "Radiologic Technologist",
  "Paramedic / EMT",
  "Other",
] as const;

/**
 * The sign-up "Who are you?" step shows roles as six picture tiles first,
 * then narrows to the exact ROLES entry inside the picked group — as a
 * segmented control when there are only a few options, a picker row when
 * there are more. Every ROLES entry belongs to exactly one group, so any
 * stored role maps back to its tile; a custom typed role (not in ROLES)
 * maps to "other".
 */
export type RoleGroup = {
  id: "pharmacist" | "physician" | "nurse" | "student" | "dentist" | "other";
  label: string;
  labelAr: string;
  art: string;
  tint: string;
  options: { role: (typeof ROLES)[number]; short: string; shortAr: string }[];
};

export const ROLE_GROUPS: RoleGroup[] = [
  {
    id: "pharmacist",
    label: "Pharmacist",
    labelAr: "صيدلي",
    art: "💊",
    tint: "#dfe9dc",
    options: [
      { role: "Clinical Pharmacist", short: "Clinical", shortAr: "سريري" },
      { role: "Hospital Pharmacist", short: "Hospital", shortAr: "مستشفى" },
      { role: "Community Pharmacist", short: "Community", shortAr: "مجتمعي" },
      { role: "Pharmacy Resident", short: "Resident", shortAr: "مقيم" },
    ],
  },
  {
    id: "physician",
    label: "Physician",
    labelAr: "طبيب",
    art: "🩺",
    tint: "#dde6f1",
    options: [
      { role: "Physician - Family Medicine / General Practice", short: "Family Medicine / GP", shortAr: "طب الأسرة / ممارس عام" },
      { role: "Physician - Internal Medicine", short: "Internal Medicine", shortAr: "الباطنية" },
      { role: "Surgeon", short: "Surgeon", shortAr: "جرّاح" },
      { role: "Orthopedic Surgeon", short: "Orthopedic Surgeon", shortAr: "جرّاح عظام" },
      { role: "Obstetrician / Gynecologist", short: "OB/GYN", shortAr: "نساء وولادة" },
      { role: "Pediatrician", short: "Pediatrician", shortAr: "طبيب أطفال" },
      { role: "Psychiatrist", short: "Psychiatrist", shortAr: "طبيب نفسي" },
      { role: "Cardiologist", short: "Cardiologist", shortAr: "طبيب قلب" },
      { role: "Anesthesiologist", short: "Anesthesiologist", shortAr: "طبيب تخدير" },
      { role: "Emergency Medicine Physician", short: "Emergency Medicine", shortAr: "طب الطوارئ" },
      { role: "Radiologist", short: "Radiologist", shortAr: "أخصائي أشعة" },
      { role: "Dermatologist", short: "Dermatologist", shortAr: "طبيب جلدية" },
      { role: "Neurologist", short: "Neurologist", shortAr: "طبيب أعصاب" },
      { role: "Oncologist", short: "Oncologist", shortAr: "طبيب أورام" },
      { role: "Physician Assistant", short: "Physician Assistant", shortAr: "مساعد طبيب" },
    ],
  },
  {
    id: "nurse",
    label: "Nurse",
    labelAr: "تمريض",
    art: "💉",
    tint: "#f4dcd6",
    options: [
      { role: "Registered Nurse", short: "Registered", shortAr: "مسجّل" },
      { role: "Nurse Practitioner", short: "Practitioner", shortAr: "ممارس" },
      { role: "Midwife", short: "Midwife", shortAr: "قابلة" },
    ],
  },
  {
    id: "student",
    label: "Student",
    labelAr: "طالب",
    art: "🎓",
    tint: "#f3ead3",
    options: [
      { role: "Medical Student", short: "Medicine", shortAr: "طب" },
      { role: "Pharmacy Student", short: "Pharmacy", shortAr: "صيدلة" },
      { role: "Nursing Student", short: "Nursing", shortAr: "تمريض" },
    ],
  },
  {
    id: "dentist",
    label: "Dentist",
    labelAr: "طبيب أسنان",
    art: "🦷",
    tint: "#e7e0ef",
    options: [{ role: "Dentist", short: "Dentist", shortAr: "طبيب أسنان" }],
  },
  {
    id: "other",
    label: "Other",
    labelAr: "أخرى",
    art: "✏️",
    tint: "#f6e1d2",
    options: [
      { role: "Physical Therapist", short: "Physical Therapist", shortAr: "علاج طبيعي" },
      { role: "Occupational Therapist", short: "Occupational Therapist", shortAr: "علاج وظيفي" },
      { role: "Speech-Language Pathologist", short: "Speech-Language Pathologist", shortAr: "نطق وتخاطب" },
      { role: "Respiratory Therapist", short: "Respiratory Therapist", shortAr: "علاج تنفسي" },
      { role: "Dietitian / Nutritionist", short: "Dietitian / Nutritionist", shortAr: "تغذية" },
      { role: "Psychologist", short: "Psychologist", shortAr: "أخصائي نفسي" },
      { role: "Medical Laboratory Scientist", short: "Lab Scientist", shortAr: "مختبرات" },
      { role: "Radiologic Technologist", short: "Radiologic Technologist", shortAr: "فني أشعة" },
      { role: "Paramedic / EMT", short: "Paramedic / EMT", shortAr: "إسعاف" },
      { role: "Other", short: "Something else", shortAr: "دور آخر" },
    ],
  },
];

/** The group a stored role belongs to; a custom typed role is "other". */
export function roleGroupFor(role: string | null | undefined): RoleGroup | null {
  if (!role) return null;
  return (
    ROLE_GROUPS.find((g) => g.options.some((o) => o.role === role)) ??
    ROLE_GROUPS.find((g) => g.id === "other")!
  );
}

export function roleGroupLabel(g: RoleGroup, locale: Locale): string {
  return locale === "ar" ? g.labelAr : g.label;
}

export function roleOptionLabel(o: RoleGroup["options"][number], locale: Locale): string {
  return locale === "ar" ? o.shortAr : o.short;
}
