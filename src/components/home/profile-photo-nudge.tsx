import Link from "next/link";
import { ImageIcon } from "@/components/icons";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/database.types";

/**
 * A profile with no photo is the one piece of onboarding Asyashare never
 * requires (name, handle, role and specialty all are) — this is the nudge
 * to close that gap. No dismiss control: unlike SafetyAlertBanner, there's
 * nothing here to acknowledge and move past, so it simply stops rendering
 * once the caller's own check (`!profile.avatar_url`, in the page render)
 * is no longer true, the same way the verification banners disappear on
 * their own once a member is approved.
 */
export function ProfilePhotoNudge({ locale }: { locale: Locale }) {
  return (
    <div className="mx-4 mt-3 flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 p-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
        <ImageIcon width={16} height={16} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text">
          {t(locale, "nudge.addPhotoTitle")}
        </p>
        <p className="text-xs text-muted">{t(locale, "nudge.addPhotoBody")}</p>
      </div>
      <Link
        href="/onboarding"
        className="shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-xs font-medium text-accent-foreground transition-transform duration-150 ease-out active:scale-95"
      >
        {t(locale, "nudge.addPhotoCta")}
      </Link>
    </div>
  );
}
