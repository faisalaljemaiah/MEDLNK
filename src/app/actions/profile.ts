"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isMissingColumnError } from "@/lib/supabase/errors";
import { ROLES } from "@/lib/roles";
import { COUNTRIES } from "@/lib/countries";
import { validateImageUpload } from "@/lib/uploads";

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

  const full_name = String(formData.get("full_name") ?? "").trim();
  const handle = String(formData.get("handle") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
  const role = String(formData.get("role") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const specialty = String(formData.get("specialty") ?? "").trim();
  const license_number = String(formData.get("license_number") ?? "").trim();
  const rawCountry = String(formData.get("country_code") ?? "").trim().toUpperCase();
  const country_code = COUNTRIES.some((c) => c.code === rawCountry)
    ? rawCountry
    : null;

  if (!full_name || !handle || !role || !license_number) {
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

  // country_code (0026) may not exist on this project yet — same
  // missing-column retry createCaseAction uses, so a profile edit still
  // saves everything else instead of failing outright.
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

  redirect(`/u/${handle}`);
}
