"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { FileIcon, ReelIcon, PlusSquareIcon } from "@/components/icons";
import { trackEventAction } from "@/app/actions/analytics";

// Two branches, not five: every written format (case, question, near miss,
// quick update, ...) lives behind the full post-type picker on /compose
// itself, one tap away from "Post". Spool is the one format shaped
// differently enough (pick a clip, not a form) to deserve its own entry
// point — see the minimal video composer in compose-form.tsx.
const CREATE_OPTIONS = [
  {
    type: "clinical_case",
    label: "Post",
    hint: "A case, a question, a near miss — pick the format next.",
    icon: FileIcon,
  },
  {
    // video_post is the same short-form, video-required format Spool's feed
    // filters for (src/app/(app)/spool/page.tsx) — this is just a themed
    // entry point into it, not a separate post type.
    type: "video_post",
    label: "Spool",
    hint: "A short video clip.",
    icon: ReelIcon,
  },
] as const;

/**
 * The bottom nav's center slot — was a plain Link straight to /compose,
 * now opens a sheet asking the one real fork in the road: a written post
 * or a Spool video. Every written format still lives one tap further in,
 * behind the post-type picker /compose itself already has.
 *
 * The trigger mirrors bottom-nav.tsx's NavLink classes by hand (matte,
 * active-state ring) since NavLink itself renders a Link, not a button,
 * and this needs to open a sheet instead of navigating.
 */
export function CreateMenu({
  active,
  label,
}: {
  active: boolean;
  /** Desktop sidebar row (icon + "Create") instead of the bottom nav's
   *  small round icon button — same sheet, different trigger chrome. */
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          trackEventAction("create_menu_opened");
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Create"
        className={clsx(
          label
            ? "flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-out"
            : "relative flex items-center justify-center rounded-full p-2.5 transition-[color,transform] duration-150 ease-out active:scale-90",
          // Opaque backing so the wrapping .ai-glow's rim doesn't bleed
          // through the center — kept even when active, otherwise the
          // active state removes the backing and the glow fills the whole
          // button instead of staying a thin rim around it.
          label ? "bg-surface-2" : "bg-surface",
          active ? "text-accent" : "text-muted hover:text-text",
        )}
      >
        <span
          className={clsx(
            !label && "relative z-[1] transition-transform duration-150 ease-out",
            !label && active && "-translate-y-0.5",
          )}
        >
          <PlusSquareIcon />
        </span>
        {label && <span>{label}</span>}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Create"
          className="fixed inset-0 z-30 flex items-end justify-center"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="animate-enter absolute inset-0 bg-[rgb(var(--shadow-tint)/0.4)] backdrop-blur-sm"
          />
          <div className="animate-enter relative w-full max-w-md rounded-t-2xl border-t border-line bg-surface p-4 pb-8 shadow-[0_-4px_32px_rgb(var(--shadow-tint)/0.2)]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
            <p className="mb-2 px-1 font-label text-xs uppercase tracking-wide text-muted">
              Create
            </p>
            <div className="grid grid-cols-2 gap-3">
              {CREATE_OPTIONS.map((option) => (
                <Link
                  key={option.type}
                  href={`/compose?type=${option.type}`}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-line px-4 py-6 text-center transition-colors duration-150 ease-out hover:border-accent hover:bg-surface-2 active:scale-[0.98]"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <option.icon width={22} height={22} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <span className="text-sm font-medium text-text">
                    {option.label}
                  </span>
                  <span className="text-xs text-muted">{option.hint}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
