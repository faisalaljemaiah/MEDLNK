"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingColumnError, isMissingBucketError } from "@/lib/supabase/errors";
import { ROLES } from "@/lib/roles";
import { COUNTRIES } from "@/lib/countries";
import { validateImageUpload, validateDocumentUpload } from "@/lib/uploads";
import { trackEventAction } from "@/app/actions/analytics";
import { LICENSE_VERIFICATION_ENABLED } from "@/lib/verification";
import { sanitizeInterests } from "@/lib/interests";

export type ProfileFormState = { error: string } | undefined;

/** Lowercase letters, digits and underscores — same rule the form enforces. */
function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

/**
 * Step 1 of sign-up ("Who are you?") and the Edit Profile screen — same
 * form, same action. The verification document used to be part of this
 * form; it's its own step now (submitVerificationAction below), so this
 * only saves the profile itself.
 *
 * First-time setup (no handle yet) continues to the interests step; an
 * edit goes back to the profile.
 */
export async function updateProfileAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const full_name = String(formData.get("full_name") ?? "").trim();
  const handle = normalizeHandle(String(formData.get("handle") ?? ""));
  const rawRole = String(formData.get("role") ?? "").trim();
  const rawCity = String(formData.get("city") ?? "").trim();
  const specialty = String(formData.get("specialty") ?? "").trim();
  // No longer a form field at all — a reviewed document is what actually
  // verifies anyone, so this just preserves whatever an older profile
  // already has on file rather than clearing it.
  const license_number = existing?.license_number || "";
  const rawCountry = String(formData.get("country_code") ?? "").trim().toUpperCase();
  const country_code = COUNTRIES.some((c) => c.code === rawCountry)
    ? rawCountry
    : null;

  if (!ROLES.includes(rawRole as (typeof ROLES)[number])) {
    return { error: "Please choose your role." };
  }
  // "Other" stores whatever the member actually typed, not the literal word
  // "Other" — the column is plain text with no CHECK constraint.
  const role =
    rawRole === "Other"
      ? String(formData.get("role_other") ?? "").trim()
      : rawRole;
  const city =
    rawCity === "__other__"
      ? String(formData.get("city_other") ?? "").trim()
      : rawCity;

  if (!full_name) {
    return { error: "Your name is required." };
  }
  if (!role) {
    return { error: "Tell us your role." };
  }
  if (handle.length < 3) {
    return { error: "Handle must be at least 3 characters (letters, numbers, _)." };
  }

  let avatar_url: string | undefined;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    const validated = validateImageUpload(avatar);
    if (!validated.ok) {
      return { error: validated.error };
    }
    const path = `${user.id}/${crypto.randomUUID()}.${validated.ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatar, { contentType: avatar.type });

    if (uploadError) {
      return { error: `Photo upload failed: ${uploadError.message}` };
    }
    const { data: publicUrl } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);
    avatar_url = publicUrl.publicUrl;
  }

  // Deliberately excludes country_code — it may not exist on this project
  // yet (0026), so it's layered in only for the first attempt below.
  const baseUpdate = {
    full_name,
    handle,
    role,
    city: city || null,
    specialty: specialty || null,
    license_number,
    ...(avatar_url ? { avatar_url } : {}),
  };

  let { error } = await supabase
    .from("profiles")
    .update({ ...baseUpdate, country_code })
    .eq("id", user.id);

  if (isMissingColumnError(error)) {
    ({ error } = await supabase
      .from("profiles")
      .update(baseUpdate)
      .eq("id", user.id));
  }

  if (error) {
    if (error.code === "23505") {
      return { error: "That handle is already taken — try another." };
    }
    return { error: error.message };
  }

  const firstTime = !existing?.handle;
  if (firstTime) {
    await trackEventAction("onboarding_completed");
  }

  // While license verification is switched off (src/lib/verification.ts),
  // nobody should be stuck waiting in the admin's manual review queue —
  // approve on the spot instead. Needs the service-role client: the
  // privilege-guard triggers (0028) block a regular user from ever setting
  // `verified` on their own row, by design.
  if (!LICENSE_VERIFICATION_ENABLED && !existing?.verified) {
    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({
        verified: true,
        verification_status: "approved",
        verified_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  }

  redirect(firstTime ? "/onboarding/interests?setup=1" : `/u/${handle}`);
}

export type HandleAvailability = "available" | "taken" | "invalid";

/** Live check behind the ✓ next to the Handle field on step 1. */
export async function checkHandleAction(raw: string): Promise<HandleAvailability> {
  const handle = normalizeHandle(raw);
  if (handle.length < 3 || handle !== raw.trim().toLowerCase()) return "invalid";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "invalid";

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", handle)
    .neq("id", user.id)
    .maybeSingle();
  return data ? "taken" : "available";
}

/**
 * Step 2 ("Pick your interests") and Settings → Interests. During setup it
 * continues to the verification step; from Settings it goes back there.
 * A project that hasn't applied 0044 yet just skips the save rather than
 * blocking sign-up on it.
 */
export async function saveInterestsAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const setup = formData.get("setup") === "1";
  const interests = sanitizeInterests(formData.getAll("interests").map(String));

  const { error } = await supabase
    .from("profiles")
    .update({ interests })
    .eq("id", user.id);

  if (error && !isMissingColumnError(error)) {
    return { error: error.message };
  }

  redirect(setup ? "/onboarding/verify?setup=1" : "/settings");
}

/**
 * Step 3 ("Get verified") — also where a rejected member resubmits, and
 * where anyone who tapped "I'll Do It Later" comes back to. Uploads the
 * license or student ID to the private verification-docs bucket (0027).
 * A rejected member's new upload puts them back in the admin queue; the
 * privilege-guard triggers (0028) allow exactly that one self-driven
 * transition, and 0033 caps it at 3 per 30 days.
 */
export async function submitVerificationAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const setup = formData.get("setup") === "1";

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!existing) redirect("/login");
  if (existing.verified) redirect(setup ? "/onboarding/done" : `/u/${existing.handle}`);

  const document = formData.get("license_document");
  if (!(document instanceof File) || document.size === 0) {
    return { error: "Take a photo or choose a file first." };
  }
  const validated = validateDocumentUpload(document);
  if (!validated.ok) {
    return { error: validated.error };
  }

  const path = `${user.id}/${crypto.randomUUID()}.${validated.ext}`;
  const { error: uploadError } = await supabase.storage
    .from("verification-docs")
    .upload(path, document, { contentType: document.type });

  if (uploadError) {
    if (isMissingBucketError(uploadError)) {
      return { error: "Document upload isn't available yet. Please try again later." };
    }
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const resubmitting = existing.verification_status === "rejected";
  const { error } = await supabase
    .from("profiles")
    .update({
      license_document_path: path,
      ...(resubmitting ? { verification_status: "pending" as const } : {}),
    })
    .eq("id", user.id);

  if (error) {
    // 0033's trigger raises when a rejected member is out of resubmissions.
    return { error: error.message };
  }

  redirect(setup ? "/onboarding/done" : `/u/${existing.handle}`);
}
