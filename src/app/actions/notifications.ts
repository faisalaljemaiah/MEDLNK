"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Opens a notification: marks it read, then sends the reader to what it's
 * about.
 *
 * Read state is written here rather than as a side effect of rendering
 * /notifications, so a glance at the inbox doesn't silently clear the badge on
 * things the reader hasn't looked at, and so nothing mutates during a render.
 *
 * The read write is best-effort: failing to clear the badge must not stop
 * someone reaching the case. RLS restricts notifications to their own rows, so
 * the id needs no ownership check here.
 */
export async function openNotificationAction(
  notificationId: string,
  href: string,
) {
  // `href` is bound server-side from the notification's own case number and
  // Next encrypts bound arguments, so it isn't reachable from the browser —
  // but this function redirects, and a redirect target is not somewhere to rely
  // on that alone. Anything that isn't a plain in-app path goes to the inbox.
  const destination =
    href.startsWith("/") && !href.startsWith("//") ? href : "/notifications";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .is("read_at", null);

  // "layout" scope because the unread dot lives in the app layout's header, so
  // clearing one notification has to invalidate more than the inbox page.
  revalidatePath("/", "layout");
  redirect(destination);
}

export async function markAllNotificationsReadAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/", "layout");
}
