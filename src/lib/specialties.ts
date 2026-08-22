/**
 * A curated set of specialty quick filters for the search page — distinct
 * from the search page's own specialty <select>, which is deliberately
 * built only from specialties that already have posted cases behind them
 * (see the comment in src/app/(app)/search/page.tsx). These pills exist so
 * a reader can jump straight to a discipline even before anyone has posted
 * in it yet; specialty itself stays free text on the composer
 * (src/components/compose-form.tsx), so a pill only surfaces results when
 * its label matches what an author actually typed.
 */
export const SPECIALTIES = [
  "Internal Medicine",
  "Emergency Medicine",
  "Critical Care",
  "Surgery",
  "Pediatrics",
  "Obstetrics & Gynecology",
  "Psychiatry",
  "Nursing",
  "Pharmacy",
  "Laboratory Medicine",
  "Radiology",
  "Anesthesiology",
  "Cardiology",
  "Oncology",
  "Physiotherapy",
  "Sports Medicine",
  "Psychology",
  "Social Work",
  "Nutrition & Dietetics",
  "Dentistry",
  "Public Health",
] as const;
