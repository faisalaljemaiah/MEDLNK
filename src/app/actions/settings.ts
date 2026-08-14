"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LOCALES } from "@/lib/i18n";
import type { Locale } from "@/lib/database.types";

/**
 * Sets the viewer's display language. Same shape as setStudentModeAction:
 * void-returning so it can be a plain `<form action>`, RLS already restricts
 * this to the caller's own row, and revalidation is at "layout" scope
 * because locale changes `<html lang/dir>`, which the root layout sets.
 */
export async function setLocaleAction(locale: Locale) {
  if (!LOCALES.some((l) => l.value === locale)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("profiles").update({ locale }).eq("id", user.id);

  revalidatePath("/", "layout");
}
