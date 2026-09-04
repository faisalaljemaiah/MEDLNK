"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isMissingColumnError, isMissingBucketError } from "@/lib/supabase/errors";
import { ROLES } from "@/lib/roles";
import { COUNTRIES } from "@/lib/countries";
import { validateImageUpload, validateDocumentUpload } from "@/lib/uploads";
import { trackEventAction } from "@/app/actions/analytics";

export type ProfileFormState = { error: string } | undefined;

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

  // select("*") rather than naming license_document_path — that column
  // (0027) may not exist on this project yet, and unlike a naive column
  // list, "*" never errors over a column that isn't there.
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const full_name = String(formData.get("full_name") ?? "").trim();
  const handle = String(formData.get("handle") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
  const role = String(formData.get("role") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const specialty = String(formData.get("specialty") ?? "").trim();
  // Verified members no longer see this field at all (onboarding-form.tsx),
  // so nothing is submitted for it on a routine edit — fall back to whatever
  // is already on file rather than reading that absence as "clear it out."
  const submittedLicenseNumber = String(formData.get("license_number") ?? "").trim();
  const license_number = submittedLicenseNumber || existing?.license_number || "";
  const rawCountry = String(formData.get("country_code") ?? "").trim().toUpperCase();
  const country_code = COUNTRIES.some((c) => c.code === rawCountry)
    ? rawCountry
    : null;

  if (!full_name || !handle || !role || (!existing?.verified && !license_number)) {
    return {
      error: "Full name, handle, role, and license number are required.",
    };
  }
  if (handle.length < 3) {
    return { error: "Handle must be at least 3 characters (letters, numbers, _)." };
  }
  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    return { error: "Please choose a valid role." };
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
      return { error: `Avatar upload failed: ${uploadError.message}` };
    }
    const { data: publicUrl } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);
    avatar_url = publicUrl.publicUrl;
  }

  // "in", not a falsy check on the value — select("*") only omits a key
  // when the column genuinely doesn't exist in the live table yet (0027
  // unapplied on this project); once it exists the key is always present,
  // even holding null. Required only once the feature is actually live,
  // so profile edits on a not-yet-migrated project don't suddenly demand a
  // document nobody was ever asked to upload during signup.
  const documentFeatureLive = existing ? "license_document_path" in existing : false;

  // Required until a document is on file at all (first-time onboarding);
  // optional afterwards — a rejected member can replace it, everyone else
  // can leave it as-is on every later profile edit.
  let license_document_path: string | undefined;
  const document = formData.get("license_document");
  if (document instanceof File && document.size > 0) {
    const validated = validateDocumentUpload(document);
    if (!validated.ok) {
      return { error: validated.error };
    }
    const path = `${user.id}/${crypto.randomUUID()}.${validated.ext}`;
    const { error: uploadError } = await supabase.storage
      .from("verification-docs")
      .upload(path, document, { contentType: document.type });

    if (uploadError && !isMissingBucketError(uploadError)) {
      return { error: `Document upload failed: ${uploadError.message}` };
    }
    // A missing bucket means 0027 hasn't been applied to this project yet —
    // degrades the same way a missing column does elsewhere in this action:
    // the rest of the profile still saves, just without the document, rather
    // than blocking onboarding entirely on one not-yet-migrated bucket.
    if (!uploadError) {
      license_document_path = path;
    }
  } else if (
    documentFeatureLive &&
    !existing?.verified &&
    !existing?.license_document_path
  ) {
    return {
      error: "Upload your license or proof of study to continue.",
    };
  }

  // A corrected license number or a freshly uploaded document, submitted
  // after a rejection, re-enters the admin's verification queue — the
  // privilege-guard triggers (0028) allow exactly this one self-driven
  // transition and nothing else.
  const resubmitting =
    existing?.verification_status === "rejected" &&
    (license_document_path !== undefined ||
      license_number !== existing.license_number);

  // Deliberately excludes country_code and license_document_path — each may
  // not exist on this project yet (0026, 0027), so they're layered in only
  // for the attempts below that need them, rather than needing to be
  // stripped back out of one shared object on retry.
  const baseUpdate = {
    full_name,
    handle,
    role,
    city: city || null,
    specialty: specialty || null,
    license_number,
    ...(avatar_url ? { avatar_url } : {}),
    ...(resubmitting ? { verification_status: "pending" as const } : {}),
  };

  let { error } = await supabase
    .from("profiles")
    .update({
      ...baseUpdate,
      country_code,
      ...(license_document_path ? { license_document_path } : {}),
    })
    .eq("id", user.id);

  // Same cascading missing-column retry createCaseAction uses, so a profile
  // edit still saves everything else instead of failing outright.
  if (isMissingColumnError(error)) {
    ({ error } = await supabase
      .from("profiles")
      .update({ ...baseUpdate, country_code })
      .eq("id", user.id));
  }
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

  if (!existing?.handle) {
    await trackEventAction("onboarding_completed");
  }

  redirect(`/u/${handle}`);
}
