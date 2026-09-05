"use server";

import { createClient } from "@/lib/supabase/server";

export type PushActionResult = { error: string } | { ok: true };

/**
 * Registers (or re-registers) this browser for push. Called from the client
 * right after `PushManager.subscribe()` succeeds — the raw PushSubscription
 * is serialized to JSON on the client (`.toJSON()`), which is exactly the
 * `{endpoint, keys: {p256dh, auth}}` shape expected here.
 *
 * Upserts on (user_id, endpoint) rather than inserting: re-subscribing the
 * same browser (a permission re-grant, a page reload before this ever ran)
 * must update the keys in place, not pile up duplicate rows the dispatch
 * would then push to twice.
 */
export async function subscribeToPushAction(
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  },
): Promise<PushActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sign in to enable notifications." };
  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return { error: "That subscription looks incomplete." };
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      kind: "web",
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
    },
    { onConflict: "user_id,endpoint" },
  );

  if (error) return { error: error.message };
  return { ok: true };
}

/**
 * Drops this browser's subscription — both when the member turns the toggle
 * off and, defensively, right before subscribing when the browser reports it
 * already has a stale one the server doesn't know about.
 */
export async function unsubscribeFromPushAction(
  endpoint: string,
): Promise<PushActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sign in first." };

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  return { ok: true };
}
