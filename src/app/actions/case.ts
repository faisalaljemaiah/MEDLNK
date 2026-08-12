"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { scanForIdentifiersAction, triggerRecapAction } from "@/app/actions/ai";
import { broadcastSafetyAlertAction } from "@/app/actions/safety-alerts";
import { resolveCaseNumbers } from "@/lib/comparisons";
import { caseTypeMeta, NEAR_MISS_PROMPTS } from "@/lib/case-types";
import type { CaseType, NearMiss } from "@/lib/database.types";

export type ComposeFormState =
  | { error: string }
  | { warning: string }
  | undefined;

function parseTags(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(",")
        .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, ""))
        .filter(Boolean),
    ),
  ];
}

function parseActions(raw: string): string[] {
  return raw
    .split("\n")
    .map((a) => a.trim())
    .filter(Boolean);
}

export async function createCaseAction(
  _prevState: ComposeFormState,
  formData: FormData,
): Promise<ComposeFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const short_caption = String(formData.get("short_caption") ?? "").trim();
  const presentation = String(formData.get("presentation") ?? "").trim();
  const tricky = String(formData.get("tricky") ?? "").trim();
  const actions = parseActions(String(formData.get("actions") ?? ""));
  const lesson = String(formData.get("lesson") ?? "").trim();
  const specialty = String(formData.get("specialty") ?? "").trim();
  const tags = parseTags(String(formData.get("tags") ?? ""));
  const rawCountry = String(formData.get("country_code") ?? "").trim().toUpperCase();
  const country_code = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : null;
  const image = formData.get("image");
  const acknowledgeWarning = formData.get("acknowledge_warning") === "true";

  // Post type decides which fields are required and which payloads are built.
  // caseTypeMeta falls back to the standard format, so an unknown value from a
  // tampered form degrades to a plain clinical case rather than erroring.
  const rawType = String(formData.get("case_type") ?? "clinical_case");
  const typeMeta = caseTypeMeta(rawType);
  const case_type = typeMeta.value as CaseType;

  let near_miss: NearMiss | null = null;
  if (typeMeta.usesNearMiss) {
    const entries = NEAR_MISS_PROMPTS.map(
      (p) => [p.name, String(formData.get(`near_miss_${p.name}`) ?? "").trim()] as const,
    );
    if (entries.some(([, value]) => !value)) {
      return { error: "Every patient-safety prompt needs an answer." };
    }
    near_miss = Object.fromEntries(entries) as unknown as NearMiss;
  }

  const questionPrompt = String(formData.get("question_prompt") ?? "").trim();
  const optionBodies = [0, 1, 2, 3].map((i) =>
    String(formData.get(`option_${i}`) ?? "").trim(),
  );
  const correctIndex = Number(formData.get("correct_option") ?? -1);

  if (typeMeta.usesQuestion) {
    const filled = optionBodies.filter(Boolean);
    if (!questionPrompt) {
      return { error: "An interactive case needs a question." };
    }
    if (filled.length < 2) {
      return { error: "Give readers at least two answers to choose between." };
    }
    if (!Number.isInteger(correctIndex) || !optionBodies[correctIndex]) {
      return { error: "Mark which answer is correct." };
    }
  }

  // Every format needs a headline and a caption; only the long-form clinical
  // formats require the full structured body. Short-form posts ("I saw this
  // today") and the safety formats carry their content elsewhere, and demanding
  // a four-part write-up would defeat the point of them.
  if (!title || !short_caption) {
    return { error: "A title and a short caption are required." };
  }

  // Case vs Case names two existing cases by their case number and says what
  // separates them. Resolved before the insert so a typo'd case number is an
  // error the author can fix, not a post with half a comparison attached.
  let comparison: { left: string; right: string; discriminator: string } | null =
    null;
  if (typeMeta.usesComparison) {
    const leftNumber = String(formData.get("compare_left") ?? "").trim();
    const rightNumber = String(formData.get("compare_right") ?? "").trim();
    const discriminator = String(formData.get("compare_what") ?? "").trim();

    if (!leftNumber || !rightNumber || !discriminator) {
      return {
        error:
          "Both case numbers and what changes the management are required for this format.",
      };
    }
    if (leftNumber.toUpperCase() === rightNumber.toUpperCase()) {
      return { error: "Pick two different cases to compare." };
    }

    const resolved = await resolveCaseNumbers(supabase, [leftNumber, rightNumber]);
    const left = resolved.get(leftNumber.toUpperCase());
    const right = resolved.get(rightNumber.toUpperCase());
    const missing = [
      left ? null : leftNumber,
      right ? null : rightNumber,
    ].filter(Boolean);

    if (missing.length > 0) {
      return { error: `No case found with number ${missing.join(" or ")}.` };
    }
    comparison = { left: left!, right: right!, discriminator };
  }

  const needsFullBody = !typeMeta.shortForm && !typeMeta.usesNearMiss;
  if (
    needsFullBody &&
    (!presentation || !tricky || actions.length === 0 || !lesson)
  ) {
    return {
      error:
        "Presentation, what was tricky, at least one action, and the lesson are all required for this format.",
    };
  }

  // Everything a reader could see goes through the identifier scan, not just
  // the standard body — a Near Miss prompt or an answer option is exactly as
  // capable of naming a patient.
  const combinedText = [
    title,
    short_caption,
    presentation,
    tricky,
    ...actions,
    lesson,
    ...(near_miss ? Object.values(near_miss) : []),
    questionPrompt,
    ...optionBodies,
    comparison?.discriminator ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  // Best-effort patient-identifier check (calls the Edge Function, which
  // calls Claude). Never blocks posting if the AI is unavailable — privacy
  // review is a nudge here, not a hard gate, since we don't want an AI
  // outage to stop clinicians from sharing real lessons.
  if (!acknowledgeWarning) {
    const scan = await scanForIdentifiersAction(combinedText);
    if (scan.flagged) {
      return { warning: scan.message };
    }
  }

  let media_url: string | null = null;
  if (image instanceof File && image.size > 0) {
    const ext = image.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("case-images")
      .upload(path, image, { contentType: image.type });

    if (uploadError) {
      return { error: `Image upload failed: ${uploadError.message}` };
    }
    const { data: publicUrl } = supabase.storage
      .from("case-images")
      .getPublicUrl(path);
    media_url = publicUrl.publicUrl;
  }

  const baseRow = {
    author_id: user.id,
    title,
    short_caption,
    full_body: { presentation, tricky, actions, lesson },
    tags,
    specialty: specialty || null,
    media_url,
  };

  const interactiveRow = {
    ...baseRow,
    case_type,
    near_miss,
    reveal_mode: (typeMeta.usesStagedReveal ? "staged" : "none") as
      | "staged"
      | "none",
  };

  let { data: inserted, error } = await supabase
    .from("cases")
    .insert({ ...interactiveRow, country_code })
    .select("id")
    .single();

  // 42703 = undefined_column. Two migrations added columns here (0008, then
  // 0017's country_code) and either, both, or neither may be applied to this
  // project, so retry in stages rather than dropping straight to the
  // lowest-common-denominator row — a project with 0008 but not yet 0017
  // should still get case_type recorded.
  if (error?.code === "42703") {
    ({ data: inserted, error } = await supabase
      .from("cases")
      .insert(interactiveRow)
      .select("id")
      .single());
  }

  if (error?.code === "42703") {
    ({ data: inserted, error } = await supabase
      .from("cases")
      .insert(baseRow)
      .select("id")
      .single());
  }

  if (error || !inserted) {
    if (error?.code === "42501") {
      return {
        error: "Only verified members can post cases — finish verification first.",
      };
    }
    return { error: error?.message ?? "Could not save the case." };
  }

  if (typeMeta.usesQuestion) {
    const { data: question, error: questionError } = await supabase
      .from("case_questions")
      .insert({
        case_id: inserted.id,
        prompt: questionPrompt,
        explanation: String(formData.get("question_explanation") ?? "").trim() || null,
        reasoning: String(formData.get("question_reasoning") ?? "").trim() || null,
        evidence: String(formData.get("question_evidence") ?? "").trim() || null,
        allow_change: formData.get("allow_change") === "on",
      })
      .select("id")
      .single();

    if (questionError || !question) {
      // The case itself is saved. Say so plainly rather than implying the whole
      // post was lost — the author can add the question from the case page.
      return {
        error:
          "The case was posted, but its question could not be saved. Open the case to add it.",
      };
    }

    const options = optionBodies
      .map((body, position) => ({ body, position }))
      .filter((o) => o.body)
      .map((o) => ({
        question_id: question.id,
        body: o.body,
        position: o.position,
        is_correct: o.position === correctIndex,
      }));

    const { error: optionsError } = await supabase
      .from("case_options")
      .insert(options);

    if (optionsError) {
      return {
        error:
          "The case was posted, but its answers could not be saved. Open the case to add them.",
      };
    }
  }

  if (comparison) {
    const { error: comparisonError } = await supabase
      .from("case_comparisons")
      .insert({
        case_id: inserted.id,
        left_case_id: comparison.left,
        right_case_id: comparison.right,
        discriminator: comparison.discriminator,
      });

    if (comparisonError) {
      // The case itself is saved. Say so plainly rather than implying the whole
      // post was lost, exactly as the question path above does.
      return {
        error:
          "The case was posted, but the two cases it compares could not be linked. Open the case to add them.",
      };
    }
  }

  await triggerRecapAction(inserted.id);

  // A safety alert is the one post type that goes out to the platform rather
  // than waiting its turn in the feed. Best-effort, after the insert: the alert
  // being posted matters more than the broadcast, and it can be re-fired.
  if (case_type === "safety_alert") {
    await broadcastSafetyAlertAction(inserted.id);
  }

  redirect(`/?posted=${inserted.id}`);
}
