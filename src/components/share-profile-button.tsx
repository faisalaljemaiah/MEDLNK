"use client";

import { useState } from "react";
import { ShareIcon } from "@/components/icons";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/database.types";

type Feedback = "copied" | "downloaded" | null;

/**
 * Shares the actual designed profile card (/api/profile-card/[handle]) when
 * the browser can — a picture posts to a Story or previews inline in a chat
 * the way a bare link never does, which is the point of this over the
 * plain-link share this replaced. Layered fallbacks, each only reached if
 * the one above isn't available:
 *
 * 1. Native share sheet with the card image attached (every mobile browser
 *    and the Capacitor WebView that supports file sharing).
 * 2. Native share sheet with just the link (a share sheet that doesn't
 *    support file attachments, but still has one).
 * 3. Download the card image directly (desktop browsers with no share
 *    sheet at all) — still "an image", not a text fallback.
 * 4. Copy the invite text + link to the clipboard (the card image itself
 *    failed to generate/fetch — the one path with no image involved).
 */
export function ShareProfileButton({
  handle,
  locale,
}: {
  handle: string;
  locale: Locale;
}) {
  const [feedback, setFeedback] = useState<Feedback>(null);

  function flash(kind: Feedback) {
    setFeedback(kind);
    setTimeout(() => setFeedback(null), 2000);
  }

  async function getCardFile(): Promise<File | null> {
    try {
      const res = await fetch(`${window.location.origin}/api/profile-card/${handle}`);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new File([blob], `${handle}-asyashare.png`, { type: "image/png" });
    } catch {
      return null;
    }
  }

  async function share() {
    const url = `${window.location.origin}/u/${handle}`;
    const text = t(locale, "profile.shareText");
    const file = await getCardFile();

    if (file && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: "Asyashare", text, files: [file] });
        return;
      } catch {
        // User cancelled the native share sheet — nothing to fall back to.
        return;
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: "Asyashare", text, url });
        return;
      } catch {
        return;
      }
    }

    if (file) {
      const objectUrl = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      flash("downloaded");
      return;
    }

    await navigator.clipboard.writeText(`${text} ${url}`);
    flash("copied");
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
      {feedback && (
        <span
          role="status"
          className="animate-enter absolute right-0 top-full mt-1.5 whitespace-nowrap rounded-full bg-text px-2.5 py-1 font-label text-xs text-bg"
        >
          {t(locale, feedback === "downloaded" ? "profile.shareDownloaded" : "profile.shareCopied")}
        </span>
      )}
    </div>
  );
}
