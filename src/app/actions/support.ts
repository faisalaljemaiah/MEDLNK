"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isMissingTableError } from "@/lib/supabase/errors";

export type SupportFormState = { error: string } | { message: string } | undefined;

export async function submitSupportMessageAction(
  _prevState: SupportFormState,
  formData: FormData,
): Promise<SupportFormState> {
  const name = String(formData.get("name") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim();
  const reason = String(formData.get("reason") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  if (!email || !message) {
    return { error: "Email and message are required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("support_messages").insert({
    name,
    email,
    reason: reason || "general",
    message,
    reporter_id: user?.id ?? null,
  });

  if (error) {
    if (isMissingTableError(error)) {
      return {
        error:
          "Support isn't fully set up yet — please try again later, or email the address on our Privacy Policy page.",
      };
    }
    return { error: error.message };
  }

  return { message: "Thanks — we've received your message and will follow up by email." };
}

export async function resolveSupportMessageAction(id: string, basePath: string) {
  const supabase = await createClient();
  await supabase.from("support_messages").update({ resolved: true }).eq("id", id);
  revalidatePath(basePath);
}
