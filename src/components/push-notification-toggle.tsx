"use client";

import { useEffect, useState, useTransition } from "react";
import { subscribeToPushAction, unsubscribeFromPushAction } from "@/app/actions/push";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/database.types";

type Status = "checking" | "unsupported" | "blocked" | "off" | "on";

/** VAPID public keys are base64url; PushManager wants a raw Uint8Array. */
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Push permission lives entirely in the browser (Notification.permission,
 * PushManager), so unlike TwoFactorSettings this can't take its initial state
 * as a server prop — it has to ask the browser on mount, hence the
 * "checking" status shown until that resolves.
 */
export function PushNotificationToggle({ locale }: { locale: Locale }) {
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      ) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("blocked");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const existing = await registration.pushManager.getSubscription();
        if (!cancelled) setStatus(existing ? "on" : "off");
      } catch {
        if (!cancelled) setStatus("off");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  function enable() {
    setError(null);
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "blocked" : "off");
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
          ),
        });

        const result = await subscribeToPushAction(subscription.toJSON() as {
          endpoint: string;
          keys: { p256dh: string; auth: string };
        });
        if ("error" in result) {
          setError(result.error);
          return;
        }
        setStatus("on");
      } catch {
        setError(t(locale, "pushNotifications.unsupported"));
      }
    });
  }

  function disable() {
    setError(null);
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await unsubscribeFromPushAction(subscription.endpoint);
          await subscription.unsubscribe();
        }
        setStatus("off");
      } catch {
        setStatus("off");
      }
    });
  }

  if (status === "checking") return null;

  if (status === "unsupported" || status === "blocked") {
    return (
      <div>
        <p className="text-sm font-medium text-text">{t(locale, "pushNotifications.title")}</p>
        <p className="text-xs text-muted">
          {t(
            locale,
            status === "unsupported" ? "pushNotifications.unsupported" : "pushNotifications.blocked",
          )}
        </p>
      </div>
    );
  }

  const enabled = status === "on";

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text">{t(locale, "pushNotifications.title")}</p>
        <p className="text-xs text-muted">
          {enabled
            ? t(locale, "pushNotifications.onBody")
            : t(locale, "pushNotifications.offBody")}
        </p>
        {error && (
          <p className="mt-1 text-xs text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
      {enabled ? (
        <button
          type="button"
          onClick={disable}
          disabled={isPending}
          className="shrink-0 rounded-full border border-danger/40 px-3.5 py-1.5 text-xs font-medium text-danger disabled:opacity-60"
        >
          {t(locale, "pushNotifications.disable")}
        </button>
      ) : (
        <button
          type="button"
          onClick={enable}
          disabled={isPending}
          className="shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-60"
        >
          {t(locale, "pushNotifications.enable")}
        </button>
      )}
    </div>
  );
}
