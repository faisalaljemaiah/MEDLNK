/**
 * Seeds ~6 realistic pharmacy cases (with verified author profiles) so the
 * feed isn't empty during development.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY — never run this against production
 * with real patient data, and never ship this key to the client.
 *
 * Usage: npm run seed
 */
import { config } from "dotenv";
import { existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import type { Database, CaseBody } from "../src/lib/database.types";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) config({ path: file });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local and fill them in.",
  );
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface SeedAuthor {
  email: string;
  full_name: string;
  handle: string;
  role: string;
  city: string;
  specialty: string;
  license_number: string;
}

const authors: SeedAuthor[] = [
  {
    email: "seed.amina@asyashare.dev",
    full_name: "Amina Al-Rashid, PharmD",
    handle: "amina_rx",
    role: "Clinical Pharmacist",
    city: "Riyadh",
    specialty: "Internal Medicine",
    license_number: "SA-PH-10245",
  },
  {
    email: "seed.marcus@asyashare.dev",
    full_name: "Marcus Ferreira, PharmD",
    handle: "marcus_ferreira",
    role: "Hospital Pharmacist",
    city: "Lisbon",
    specialty: "Cardiology",
    license_number: "PT-PH-88213",
  },
  {
    email: "seed.priya@asyashare.dev",
    full_name: "Priya Nair, PharmD",
    handle: "priya_nair",
    role: "Pediatric Pharmacist",
    city: "Toronto",
    specialty: "Pediatrics",
    license_number: "ON-PH-55210",
  },
  {
    email: "seed.tom@asyashare.dev",
    full_name: "Tom Whitfield, PharmD",
    handle: "tom_whitfield",
    role: "Oncology Pharmacist",
    city: "Manchester",
    specialty: "Oncology",
    license_number: "UK-PH-33871",
  },
  {
    email: "seed.layla@asyashare.dev",
    full_name: "Layla Haddad, PharmD",
    handle: "layla_haddad",
    role: "ICU Pharmacist",
    city: "Amman",
    specialty: "Critical Care",
    license_number: "JO-PH-12094",
  },
  {
    email: "seed.diego@asyashare.dev",
    full_name: "Diego Morales, PharmD",
    handle: "diego_morales",
    role: "Community Pharmacist",
    city: "Mexico City",
    specialty: "Ambulatory Care",
    license_number: "MX-PH-40982",
  },
];

interface SeedCase {
  authorEmail: string;
  title: string;
  short_caption: string;
  full_body: CaseBody;
  tags: string[];
  specialty: string;
}

const cases: SeedCase[] = [
  {
    authorEmail: "seed.amina@asyashare.dev",
    title: "Hydralazine, meet hydroxyzine",
    short_caption:
      "A LASA pair almost turned a blood pressure order into an antihistamine dose — caught at final verification.",
    full_body: {
      presentation:
        "A 68-year-old inpatient had a new order for 'hydralazine 25mg PO TID' for BP control. The order entered the queue as 'hydroxyzine 25mg PO TID' after a look-alike/sound-alike (LASA) selection slip in the prescriber's order-entry search.",
      tricky:
        "Both drugs come in 25mg tablets, both are dosed TID in this hospital's common order sets, and the patient's chart had no allergy or itching complaint that would have made hydroxyzine an obvious fit — nothing about the order screamed 'wrong drug' at a glance.",
      actions: [
        "Cross-checked the order against the documented indication (hypertension, not pruritus) before verifying.",
        "Called the prescriber to confirm intent rather than assuming a typo.",
        "Corrected the order to hydralazine and flagged the two drug names for a LASA alert in our order-entry system.",
      ],
      lesson:
        "Always verify a new order against the documented indication, not just the sig — LASA pairs slip through spelling checks but not indication checks.",
    },
    tags: ["LASA", "medication-error", "order-verification", "hypertension"],
    specialty: "Internal Medicine",
  },
  {
    authorEmail: "seed.marcus@asyashare.dev",
    title: "The INR that wouldn't stay put",
    short_caption:
      "A 'routine' antibiotic course sent a stable warfarin patient's INR to 6.8 within a week.",
    full_body: {
      presentation:
        "A 74-year-old on long-term warfarin for atrial fibrillation (stable INR 2-3 for over a year) was started on trimethoprim-sulfamethoxazole for a UTI by an urgent-care clinic that didn't have visibility into his anticoagulation clinic records.",
      tricky:
        "Both prescribers were acting reasonably in isolation — the UTI needed treatment, and the warfarin dose hadn't changed. The interaction (TMP-SMX significantly potentiates warfarin via CYP2C9 inhibition and protein binding displacement) only becomes obvious when you're looking at the full medication list, which neither system surfaced automatically.",
      actions: [
        "Flagged the interaction when the antibiotic prescription came through for filling, before the patient started it.",
        "Recommended nitrofurantoin as a lower-interaction alternative for his renal function, discussed with the prescriber.",
        "Scheduled an early INR recheck at 4-5 days given his baseline risk, instead of waiting for the routine 4-week check.",
      ],
      lesson:
        "Any new antibiotic in a warfarin patient is a trigger to actively check for an interaction and pre-emptively adjust monitoring — don't wait for the INR to tell you something changed.",
    },
    tags: ["warfarin", "drug-interaction", "anticoagulation", "antibiotics"],
    specialty: "Cardiology",
  },
  {
    authorEmail: "seed.priya@asyashare.dev",
    title: "One decimal point from a 10x overdose",
    short_caption:
      "A weight-based pediatric dose was transcribed without the decimal point — and almost dispensed that way.",
    full_body: {
      presentation:
        "A 2-year-old, 12kg, was prescribed oral morphine solution for post-op pain at 0.2mg/kg/dose. The handwritten order was scanned and transcribed into the pharmacy system as '2mg/kg/dose' — the decimal point was lost in a faint scan.",
      tricky:
        "2mg/kg would still round to a plausible-looking absolute dose (24mg) for a clinician skimming quickly, and the scanned image genuinely was ambiguous — this wasn't a transcription typo you'd catch by re-reading the same document.",
      actions: [
        "Ran the calculated dose against our pediatric opioid dosing ceiling, which flagged it as more than 10x the typical max — that's what stopped it, not the visual read of the order.",
        "Pulled the original paper order and confirmed with the surgical team by phone before dispensing anything.",
        "Documented the near-miss and pushed for e-prescribing on all pediatric opioid orders on that unit going forward.",
      ],
      lesson:
        "A dose that's technically 'plausible' on its face can still be caught by a hard ceiling check — build and trust automated dose-range alerts for high-risk pediatric drugs, especially opioids.",
    },
    tags: ["pediatrics", "dosing-error", "opioids", "near-miss"],
    specialty: "Pediatrics",
  },
  {
    authorEmail: "seed.tom@asyashare.dev",
    title: "Daily methotrexate, weekly consequences",
    short_caption:
      "A rheumatology patient's methotrexate was re-prescribed as a daily dose after a hospital admission — caught at the counter.",
    full_body: {
      presentation:
        "A 55-year-old with rheumatoid arthritis on weekly oral methotrexate 15mg was discharged after an unrelated hospital stay. The discharge summary listed 'methotrexate 15mg PO' without the weekly frequency, and the community pharmacy's system defaulted the sig to once daily.",
      tricky:
        "Methotrexate for RA and methotrexate for oncology use completely different frequencies, and a discharge summary that just says 'PO' with no explicit interval reads as unremarkable unless you already know this drug is a high-alert exception to 'as written'.",
      actions: [
        "Recognized methotrexate as one of our hard-stop high-alert drugs requiring frequency confirmation on every fill, regardless of how routine the patient looks.",
        "Called the discharging hospital to confirm the intended weekly dosing before releasing the prescription.",
        "Counseled the patient explicitly on the weekly schedule and provided a dosing calendar, since this was the point of failure the last two times nationally reported.",
      ],
      lesson:
        "Certain drugs (methotrexate, insulin, opioids, anticoagulants) deserve a mandatory frequency/indication check on every single fill — treat 'PO' without an interval as incomplete, not implied.",
    },
    tags: ["methotrexate", "high-alert-medication", "transitions-of-care"],
    specialty: "Oncology",
  },
  {
    authorEmail: "seed.layla@asyashare.dev",
    title: "Potassium chloride almost went in as a push",
    short_caption:
      "A verbal order in a code situation was nearly executed as an IV push instead of a diluted infusion.",
    full_body: {
      presentation:
        "During a rapid response for symptomatic hypokalemia (K+ 2.6), a verbal order for 'potassium chloride 20 mEq IV' was given. In the urgency, a nurse began preparing it from an undiluted vial for IV push, which is fatal at that concentration.",
      tricky:
        "In a genuine emergency, the instinct to move fast works against the extra 30 seconds needed to specify route and dilution — verbal orders under pressure routinely drop qualifying details that everyone assumes are 'obviously implied'.",
      actions: [
        "Intervened before the push, confirming this needed to be a diluted infusion over at least 1 hour via a controlled pump, never a bolus.",
        "Prepared the correct diluted bag from our unit's pre-mixed high-alert stock instead of compounding from a concentrated vial under time pressure.",
        "After the event, pushed to remove concentrated KCl vials from all crash carts and rapid-response kits — floor stock was the root enabler here, not just the verbal order.",
      ],
      lesson:
        "Verbal orders for high-alert IV electrolytes need a mandatory read-back that includes route AND rate/dilution, not just drug and dose — and concentrated vials shouldn't be reachable in a code in the first place.",
    },
    tags: ["potassium-chloride", "high-alert-medication", "critical-care", "near-miss"],
    specialty: "Critical Care",
  },
  {
    authorEmail: "seed.diego@asyashare.dev",
    title: "Two prescribers, two ACE inhibitors",
    short_caption:
      "A patient was on both lisinopril and enalapril simultaneously after seeing two different specialists.",
    full_body: {
      presentation:
        "A 61-year-old with diabetes and hypertension came in for a refill and turned out to be taking lisinopril 10mg (from his primary care doctor) and enalapril 5mg (started by a cardiologist after a recent visit, unaware of the existing lisinopril) — both filled at different pharmacies.",
      tricky:
        "Because the two prescriptions were filled at different pharmacies, no single system's duplicate-therapy check ever saw both drugs together — the patient himself didn't recognize the overlap since the pills looked and were named differently.",
      actions: [
        "Ran a full medication reconciliation at pickup instead of just filling the new prescription, which is what surfaced the overlap.",
        "Contacted both prescribers to establish who should stay in charge of BP management and consolidate to a single ACE inhibitor.",
        "Enrolled the patient in our pharmacy's single-pharmacy medication sync program to reduce future fragmentation.",
      ],
      lesson:
        "Duplicate therapy across drug classes (not just identical drugs) is easy to miss when care is fragmented across prescribers and pharmacies — ask patients to name every medication out loud rather than just filling what's presented.",
    },
    tags: ["duplicate-therapy", "ace-inhibitors", "medication-reconciliation", "ambulatory-care"],
    specialty: "Ambulatory Care",
  },
];

async function ensureAuthor(author: SeedAuthor): Promise<string> {
  const { data: created, error: createError } =
    await supabase.auth.admin.createUser({
      email: author.email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { full_name: author.full_name },
    });

  if (!createError && created.user) {
    console.log(`Created auth user for ${author.email}`);
    return created.user.id;
  }

  // Already exists — look it up.
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const match = data.users.find((u) => u.email === author.email);
    if (match) return match.id;
    if (data.users.length < 200) break;
    page += 1;
  }

  throw new Error(`Could not create or find auth user for ${author.email}`);
}

async function main() {
  const { count } = await supabase
    .from("cases")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) {
    console.log(`Database already has ${count} case(s) — skipping seed.`);
    return;
  }

  const authorIds = new Map<string, string>();

  for (const author of authors) {
    const id = await ensureAuthor(author);
    authorIds.set(author.email, id);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: author.full_name,
        handle: author.handle,
        role: author.role,
        city: author.city,
        specialty: author.specialty,
        license_number: author.license_number,
        verified: true,
        verification_status: "approved",
      })
      .eq("id", id);

    if (error) throw error;
    console.log(`Verified profile for ${author.handle}`);
  }

  for (const seedCase of cases) {
    const authorId = authorIds.get(seedCase.authorEmail);
    if (!authorId) throw new Error(`No author id for ${seedCase.authorEmail}`);

    const { error } = await supabase.from("cases").insert({
      author_id: authorId,
      title: seedCase.title,
      short_caption: seedCase.short_caption,
      full_body: seedCase.full_body,
      tags: seedCase.tags,
      specialty: seedCase.specialty,
    });

    if (error) throw error;
    console.log(`Inserted case: ${seedCase.title}`);
  }

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
