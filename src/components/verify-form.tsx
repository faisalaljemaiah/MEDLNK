"use client";

import { useEffect, useState, useTransition } from "react";
import { submitVerificationAction, type ProfileFormState } from "@/app/actions/profile";
import { toUploadableImage } from "@/lib/heic";
import { shrinkImageForUpload } from "@/lib/shrink-image";
import { LogoMark } from "@/components/brand";
import { t, type TranslationKey } from "@/lib/i18n";
import type { Locale } from "@/lib/database.types";
import {
  CapsuleSubmit,
  FormError,
  GroupFooter,
  GroupHeader,
  GroupedList,
} from "@/components/ui/ios";

function CameraGlyph() {
  return (
    <svg width="22" height="18" viewBox="0 0 22 18" aria-hidden>
      <path d="M2 5.5A2.5 2.5 0 0 1 4.5 3h2.2l1.5-2h5.6l1.5 2h2.2A2.5 2.5 0 0 1 20 5.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 2 14.5Z" fill="currentColor" />
      <circle cx="11" cy="9.6" r="3.6" fill="none" stroke="var(--accent)" strokeWidth="1.8" />
    </svg>
  );
}

// Fixed Settings-style icon colors (not theme tokens) — same in light and
// dark, like iOS's own colored icon tiles.
const ACCEPTED: { key: TranslationKey; color: string; glyph: string }[] = [
  { key: "verify.acceptLicense", color: "#2f7d5b", glyph: "🪪" },
  { key: "verify.acceptStudent", color: "#c8862d", glyph: "🎓" },
  { key: "verify.acceptFormat", color: "#3b6fb6", glyph: "🖼️" },
];

/**
 * Corner brackets + the sample card, or the picked document's preview. A
 * camera scene, so its colors are fixed rather than theme tokens — it reads
 * the same in light and dark mode.
 */
function Viewfinder({
  previewUrl,
  fileName,
  locale,
}: {
  previewUrl: string | null;
  fileName: string | null;
  locale: Locale;
}) {
  return (
    <div className="relative flex h-[214px] items-center justify-center overflow-hidden rounded-[26px] bg-[radial-gradient(circle_at_50%_40%,#4a3f39,#231d1a_75%)]">
      {(["top-[18px] left-[22px] border-t-4 border-l-4 rounded-tl-[14px]", "top-[18px] right-[22px] border-t-4 border-r-4 rounded-tr-[14px]", "bottom-[18px] left-[22px] border-b-4 border-l-4 rounded-bl-[14px]", "bottom-[18px] right-[22px] border-b-4 border-r-4 rounded-br-[14px]"] as const).map((c) => (
        <span key={c} aria-hidden className={`absolute size-[34px] border-white ${c}`} />
      ))}

      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- a local blob: preview, not a remote image
        <img src={previewUrl} alt={t(locale, "verify.yourDocument")} className="max-h-[150px] max-w-[240px] rounded-xl object-contain shadow-[0_18px_30px_-10px_rgba(0,0,0,0.6)]" />
      ) : fileName ? (
        <div className="flex max-w-[240px] flex-col items-center gap-2 rounded-xl bg-[#fbf8f4] px-6 py-5 text-center text-[#2b2420] shadow-[0_18px_30px_-10px_rgba(0,0,0,0.6)]">
          <span aria-hidden className="text-3xl">📄</span>
          <span className="max-w-full truncate text-[13px] font-semibold">{fileName}</span>
        </div>
      ) : (
        <div aria-hidden className="relative h-[140px] w-[226px] -translate-y-1.5 -rotate-[4deg] overflow-hidden rounded-[14px] bg-[#fbf8f4] shadow-[0_18px_30px_-10px_rgba(0,0,0,0.6)]">
          <div className="flex h-7 items-center bg-[#2b2420] px-3 text-[9px] font-bold tracking-[0.16em] text-[#f0ebe6]">
            {t(locale, "verify.sampleCard")}
          </div>
          <div className="absolute left-[13px] top-10 flex h-[74px] w-[58px] items-end justify-center overflow-hidden rounded-[9px] bg-[#e8e1da] text-[42px] leading-none">
            🧑‍⚕️
          </div>
          {[104, 76, 92, 56].map((w, i) => (
            <span key={i} className="absolute left-[84px] h-[7px] rounded bg-[#e4ddd6]" style={{ top: 46 + i * 15, width: w }} />
          ))}
          <span className="absolute bottom-2.5 right-3 flex size-11 rotate-12 items-center justify-center rounded-full border-2 border-dashed border-[#2b2420]/45 text-[#2b2420]">
            <LogoMark size={22} className="text-[#2b2420]" />
          </span>
        </div>
      )}

      <span className="absolute bottom-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/18 px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.3)] backdrop-blur-md">
        {t(locale, previewUrl || fileName ? "verify.looksGood" : "verify.fitCard")}
      </span>
    </div>
  );
}

export function VerifyForm({ setup, locked, locale }: { setup: boolean; locked: boolean; locale: Locale }) {
  const [state, setState] = useState<ProfileFormState>(undefined);
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handlePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    setState(undefined);
    if (picked.type === "application/pdf") {
      // A PDF can't be shrunk client-side, and Vercel rejects request
      // bodies over ~4.5MB before the action ever runs.
      if (picked.size > 4_000_000) {
        setFile(null);
        setPreviewUrl(null);
        setState({ error: t(locale, "verify.errorPdfSize") });
        return;
      }
      setFile(picked);
      setPreviewUrl(null);
      return;
    }
    // iPhone photos can arrive as HEIC, which the bucket doesn't accept —
    // same conversion the profile photo picker already uses.
    setConverting(true);
    try {
      const uploadable = await shrinkImageForUpload(await toUploadableImage(picked));
      setFile(uploadable);
      setPreviewUrl(URL.createObjectURL(uploadable));
    } catch {
      setFile(picked);
      setPreviewUrl(URL.createObjectURL(picked));
    } finally {
      setConverting(false);
    }
  }

  function handleSubmit(formData: FormData) {
    if (file) formData.set("license_document", file, file.name);
    startTransition(async () => {
      const result = await submitVerificationAction(state, formData);
      setState(result);
    });
  }

  const PICK =
    "flex h-[50px] cursor-pointer items-center justify-center gap-2 rounded-full text-[16px] font-semibold tracking-[-0.02em] transition-transform duration-150 ease-out active:scale-[0.97]";

  return (
    <form action={handleSubmit} className="flex flex-1 flex-col">
      {setup && <input type="hidden" name="setup" value="1" />}

      <Viewfinder previewUrl={previewUrl} fileName={file && !previewUrl ? file.name : null} locale={locale} />

      <div className="mt-3 grid grid-cols-2 gap-2.5" aria-disabled={locked}>
        <label className={`${PICK} bg-accent text-accent-foreground ${locked ? "pointer-events-none opacity-50" : ""}`}>
          <CameraGlyph />
          {converting
            ? t(locale, "onboarding.converting")
            : t(locale, file ? "verify.retake" : "verify.takePhoto")}
          {/* capture opens the rear camera directly on phones; desktop
              browsers ignore it and show a file picker. */}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={handlePicked} disabled={locked} />
        </label>
        <label className={`${PICK} bg-muted/15 text-accent ${locked ? "pointer-events-none opacity-50" : ""}`}>
          {t(locale, "verify.chooseFile")}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,application/pdf"
            className="sr-only"
            onChange={handlePicked}
            disabled={locked}
          />
        </label>
      </div>

      <GroupHeader>{t(locale, "verify.weAccept")}</GroupHeader>
      <GroupedList>
        {ACCEPTED.map((a) => (
          <div key={a.key} className="ios-row-icon flex min-h-[50px] items-center gap-3 px-4 text-[17px] text-text">
            <span aria-hidden className="flex size-[30px] items-center justify-center rounded-lg text-[15px]" style={{ background: a.color }}>
              {a.glyph}
            </span>
            {t(locale, a.key)}
          </div>
        ))}
      </GroupedList>
      <GroupFooter>{t(locale, "verify.privacy")}</GroupFooter>

      {state?.error && <FormError>{state.error}</FormError>}

      <div className="mt-auto pt-8">
        <CapsuleSubmit
          pending={isPending}
          disabled={!file || converting || locked}
          pendingLabel={t(locale, "flow.pleaseWait")}
        >
          {t(locale, "verify.submit")}
        </CapsuleSubmit>
      </div>
    </form>
  );
}
