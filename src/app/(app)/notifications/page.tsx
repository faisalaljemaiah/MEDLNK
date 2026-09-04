import { redirect } from "next/navigation";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/server";
import { getViewer, getViewerProfile } from "@/lib/auth";
import { getNotifications } from "@/lib/notifications";
import { Avatar } from "@/components/avatar";
import { UnavailableNotice } from "@/components/unavailable-notice";
import {
  markAllNotificationsReadAction,
  openNotificationAction,
} from "@/app/actions/notifications";
import { t } from "@/lib/i18n";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const user = await getViewer();

  if (!user) redirect("/login");

  const profile = await getViewerProfile();
  const locale = profile?.locale ?? "en";

  // null means the read failed, which pre-migration it will — distinct from an
  // inbox that is genuinely empty.
  const notifications = await getNotifications(supabase, user.id);
  const unread = notifications?.filter((n) => !n.read_at).length ?? 0;

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-4">
        <h1 className="font-headline text-xl text-text">{t(locale, "notifications.title")}</h1>
        {unread > 0 && (
          <form action={markAllNotificationsReadAction} className="ml-auto">
            <button
              type="submit"
              className="rounded-full border border-line px-3.5 py-1.5 font-label text-xs text-muted transition-transform duration-150 ease-out active:scale-95 hover:text-text"
            >
              {t(locale, "notifications.markAllRead")}
            </button>
          </form>
        )}
      </div>

      {notifications === null ? (
        <UnavailableNotice feature={t(locale, "notifications.title")} />
      ) : notifications.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted">
          {t(locale, "notifications.empty")}
        </p>
      ) : (
        notifications.map((n) => {
          const href = n.subject_case?.case_number
            ? `/case/${n.subject_case.case_number}`
            : "/notifications";

          return (
            // A form, not a link: opening a notification marks it read, and
            // that write belongs in a Server Action rather than in the render
            // of whatever page the reader lands on.
            <form
              key={n.id}
              action={openNotificationAction.bind(null, n.id, href)}
              className="border-t border-line first:border-t-0"
            >
              <button
                type="submit"
                className={clsx(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150",
                  n.read_at ? "hover:bg-surface" : "bg-accent/5",
                )}
              >
                <Avatar
                  avatarUrl={n.actor?.avatar_url}
                  name={n.actor?.full_name}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text">{n.body}</p>
                  {n.subject_case && (
                    <p className="mt-0.5 truncate font-label text-xs text-muted">
                      {n.subject_case.title}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className="font-label text-xs text-muted">
                    {new Date(n.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  {!n.read_at && (
                    <span
                      className="size-2 rounded-full bg-accent"
                      aria-label="Unread"
                    />
                  )}
                </div>
              </button>
            </form>
          );
        })
      )}
    </div>
  );
}
