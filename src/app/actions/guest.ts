"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** One year — long enough that "browse without an account" is a one-time
 *  choice, not something re-asked on every visit; not permanent, since
 *  nothing here is tied to an account that could otherwise expire it. */
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Marks this browser as having explicitly chosen to browse signed out, from
 * the Welcome page's "Browse without an account" action. The root feed
 * page (src/app/(app)/page.tsx) redirects a signed-out visitor to /welcome
 * unless this cookie is set — so a first-time visit to the bare domain
 * lands on the marketing splash, while this one click keeps the
 * RLS-backed signed-out browsing (cases are readable by anon) exactly as
 * available as it always was, without bouncing back through /welcome on
 * every subsequent page.
 */
export async function browseAsGuestAction() {
  const cookieStore = await cookies();
  cookieStore.set("medlnk_guest", "1", {
    maxAge: GUEST_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });
  redirect("/");
}
