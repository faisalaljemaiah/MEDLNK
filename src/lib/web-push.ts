import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export type PushPayload = {
  title: string;
  body: string;
  url: string;
};

/**
 * Lazily configured and soft-fails when the VAPID env vars aren't set, same
 * shape as src/lib/email.ts's getClient() for Resend: a missing or
 * misconfigured push provider must never be the reason a follow, comment, or
 * message fails to save. In-app notifications (0008) don't depend on this at
 * all — this only adds the OS-level popup on top of them.
 */
function isConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

let configured = false;
function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

/**
 * Sends a push to every subscribed browser for the given users. Best-effort
 * per subscription: one dead endpoint must not stop the rest of the fan-out,
 * and a 404/410 (the push service telling us the subscription is gone) is
 * cleaned up rather than retried forever.
 *
 * Called after the write it's about — a follow, a comment, a message, a
 * fan_out_* RPC — already succeeded. Never awaited by anything that would
 * fail the caller's own result if this throws; callers wrap it in try/catch
 * the same way they already do the in-app notification RPCs.
 */
export async function sendPushToUsers(
  supabase: Client,
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  if (!isConfigured() || userIds.length === 0) return;
  ensureConfigured();

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth_key")
    .in("user_id", userIds);

  if (!subs || subs.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      if (!sub.p256dh || !sub.auth_key) return;
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          body,
        );
      } catch (err) {
        const statusCode =
          err && typeof err === "object" && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;
        // 404/410: the push service has discarded this endpoint (uninstalled,
        // permission revoked, browser data cleared). Anything else — a
        // transient network error, a misconfigured VAPID key — is not this
        // subscription's fault, so it's left in place rather than deleted.
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }),
  );
}
