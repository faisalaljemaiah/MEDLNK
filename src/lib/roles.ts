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
  art: string;
  tint: string;
  options: { role: (typeof ROLES)[number]; short: string }[];
};

export const ROLE_GROUPS: RoleGroup[] = [
  {
    id: "pharmacist",
    label: "Pharmacist",
    art: "💊",
    tint: "#dfe9dc",
    options: [
      { role: "Clinical Pharmacist", short: "Clinical" },
      { role: "Hospital Pharmacist", short: "Hospital" },
      { role: "Community Pharmacist", short: "Community" },
      { role: "Pharmacy Resident", short: "Resident" },
    ],
  },
  {
    id: "physician",
    label: "Physician",
    art: "🩺",
    tint: "#dde6f1",
    options: [
      { role: "Physician - Family Medicine / General Practice", short: "Family Medicine / GP" },
      { role: "Physician - Internal Medicine", short: "Internal Medicine" },
      { role: "Surgeon", short: "Surgeon" },
      { role: "Orthopedic Surgeon", short: "Orthopedic Surgeon" },
      { role: "Obstetrician / Gynecologist", short: "OB/GYN" },
      { role: "Pediatrician", short: "Pediatrician" },
      { role: "Psychiatrist", short: "Psychiatrist" },
      { role: "Cardiologist", short: "Cardiologist" },
      { role: "Anesthesiologist", short: "Anesthesiologist" },
      { role: "Emergency Medicine Physician", short: "Emergency Medicine" },
      { role: "Radiologist", short: "Radiologist" },
      { role: "Dermatologist", short: "Dermatologist" },
      { role: "Neurologist", short: "Neurologist" },
      { role: "Oncologist", short: "Oncologist" },
      { role: "Physician Assistant", short: "Physician Assistant" },
    ],
  },
  {
    id: "nurse",
    label: "Nurse",
    art: "💉",
    tint: "#f4dcd6",
    options: [
      { role: "Registered Nurse", short: "Registered" },
      { role: "Nurse Practitioner", short: "Practitioner" },
      { role: "Midwife", short: "Midwife" },
    ],
  },
  {
    id: "student",
    label: "Student",
    art: "🎓",
    tint: "#f3ead3",
    options: [
      { role: "Medical Student", short: "Medicine" },
      { role: "Pharmacy Student", short: "Pharmacy" },
      { role: "Nursing Student", short: "Nursing" },
    ],
  },
  {
    id: "dentist",
    label: "Dentist",
    art: "🦷",
    tint: "#e7e0ef",
    options: [{ role: "Dentist", short: "Dentist" }],
  },
  {
    id: "other",
    label: "Other",
    art: "✏️",
    tint: "#f6e1d2",
    options: [
      { role: "Physical Therapist", short: "Physical Therapist" },
      { role: "Occupational Therapist", short: "Occupational Therapist" },
      { role: "Speech-Language Pathologist", short: "Speech-Language Pathologist" },
      { role: "Respiratory Therapist", short: "Respiratory Therapist" },
      { role: "Dietitian / Nutritionist", short: "Dietitian / Nutritionist" },
      { role: "Psychologist", short: "Psychologist" },
      { role: "Medical Laboratory Scientist", short: "Lab Scientist" },
      { role: "Radiologic Technologist", short: "Radiologic Technologist" },
      { role: "Paramedic / EMT", short: "Paramedic / EMT" },
      { role: "Other", short: "Something else" },
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
