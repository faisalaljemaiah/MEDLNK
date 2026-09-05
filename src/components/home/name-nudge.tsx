import Link from "next/link";
import { UserIcon } from "@/components/icons";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/database.types";

/**
 * Signup only ever asked for email and password (fixed going forward, but
 * every account created before that fix has a null full_name and nothing
 * ever forced them to onboarding to set one) — this is the nudge to close
 * that gap for existing accounts. Same self-clearing, no-dismiss pattern as
 * ProfilePhotoNudge: it just stops rendering once the caller's own check
 * (`!profile.full_name`) is no longer true. Takes priority over the photo
 * nudge when both are missing — a name is the more fundamental gap.
 */
export function NameNudge({ locale }: { locale: Locale }) {
  return (
    <div className="mx-4 mt-3 flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 p-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
        <UserIcon width={16} height={16} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text">
          {t(locale, "nudge.addNameTitle")}
        </p>
        <p className="text-xs text-muted">{t(locale, "nudge.addNameBody")}</p>
      </div>
      <Link
        href="/onboarding"
        className="shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-xs font-medium text-accent-foreground transition-transform duration-150 ease-out active:scale-95"
      >
        {t(locale, "nudge.addNameCta")}
      </Link>
    </div>
  );
}
