"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = { error: string } | undefined;

const ROLES = [
  "Clinical Pharmacist",
  "Hospital Pharmacist",
  "Community Pharmacist",
  "Pharmacy Resident",
  "Pharmacy Student",
] as const;

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

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      handle,
      role,
      city: city || null,
      specialty: specialty || null,
      license_number,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "That handle is already taken — try another." };
    }
    return { error: error.message };
  }

  redirect("/");
}

export { ROLES };
