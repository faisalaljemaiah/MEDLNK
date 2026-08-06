"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { scanForIdentifiersAction, triggerRecapAction } from "@/app/actions/ai";

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
  const image = formData.get("image");
  const acknowledgeWarning = formData.get("acknowledge_warning") === "true";

  if (
    !title ||
    !short_caption ||
    !presentation ||
    !tricky ||
    actions.length === 0 ||
    !lesson
  ) {
    return {
      error:
        "Title, caption, presentation, what was tricky, at least one action, and the lesson are all required.",
    };
  }

  const combinedText = [title, short_caption, presentation, tricky, ...actions, lesson].join(
    "\n",
  );

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

  const { data: inserted, error } = await supabase
    .from("cases")
    .insert({
      author_id: user.id,
      title,
      short_caption,
      full_body: { presentation, tricky, actions, lesson },
      tags,
      specialty: specialty || null,
      media_url,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "42501") {
      return {
        error: "Only verified members can post cases — finish verification first.",
      };
    }
    return { error: error.message };
  }

  await triggerRecapAction(inserted.id);

  redirect(`/?posted=${inserted.id}`);
}
