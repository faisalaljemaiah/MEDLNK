"use client";

import { useState } from "react";
import { ShareIcon } from "@/components/icons";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/database.types";

/**
 * Same share-or-copy pattern as a case's ShareIcon button (reaction-bar.tsx):
 * the Web Share API when the browser/OS has a real share sheet (every mobile
 * browser, and the Capacitor WebView), a clipboard copy otherwise. Unlike a
 * case share, there's no #anchor — a profile is the whole page.
 */
export function ShareProfileButton({
  handle,
  locale,
}: {
  handle: string;
  locale: Locale;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/u/${handle}`;
    const text = t(locale, "profile.shareText");

    if (navigator.share) {
      try {
        await navigator.share({ title: "Asyashare", text, url });
        return;
      } catch {
        // User cancelled the native share sheet — not an error, nothing to fall back to.
        return;
      }
    }

    await navigator.clipboard.writeText(`${text} ${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={share}
        aria-label={t(locale, "profile.share")}
        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-text transition-transform duration-150 ease-out active:scale-90"
      >
        <ShareIcon width={16} height={16} strokeWidth={2} />
      </button>
      {copied && (
        <span
          role="status"
          className="animate-enter absolute right-0 top-full mt-1.5 whitespace-nowrap rounded-full bg-text px-2.5 py-1 font-label text-xs text-bg"
        >
          {t(locale, "profile.shareCopied")}
        </span>
      )}
    </div>
  );
}
