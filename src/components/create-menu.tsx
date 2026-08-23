"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import {
  FileIcon,
  QuestionIcon,
  AlertTriangleIcon,
  BoltIcon,
  PlusSquareIcon,
} from "@/components/icons";

const CREATE_OPTIONS = [
  {
    type: "clinical_case",
    label: "Share a Case",
    hint: "The standard write-up: presentation, what you did, the lesson.",
    icon: FileIcon,
  },
  {
    type: "what_would_you_do",
    label: "Ask a Question",
    hint: "Readers commit to an answer before they see yours.",
    icon: QuestionIcon,
  },
  {
    type: "near_miss",
    label: "Report a Near Miss",
    hint: "Something caught before it reached the patient.",
    icon: AlertTriangleIcon,
  },
  {
    type: "saw_this_today",
    label: "Quick Update",
    hint: "Something interesting, in a sentence or two.",
    icon: BoltIcon,
  },
] as const;

/**
 * The bottom nav's center slot — was a plain Link straight to /compose,
 * now opens a sheet of grounded entry points (each just /compose?type=X,
 * the same query param ComposeForm already reads for its initialType
 * prop) instead of always landing on the default clinical-case format.
 * Every other format is still one tap away from there via the full
 * post-type picker; this is four shortcuts into it, not a new flow.
 *
 * The trigger mirrors bottom-nav.tsx's NavLink classes by hand (matte,
 * active-state ring) since NavLink itself renders a Link, not a button,
 * and this needs to open a sheet instead of navigating.
 */
export function CreateMenu({ active }: { active: boolean }) {
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
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Create"
        className={clsx(
          "relative flex items-center justify-center rounded-full p-2.5 transition-[color,transform] duration-150 ease-out active:scale-90",
          !active && "bg-surface",
          active ? "text-accent" : "text-muted hover:text-text",
        )}
      >
        <span
          className={clsx(
            "relative z-[1] transition-transform duration-150 ease-out",
            active && "-translate-y-0.5",
          )}
        >
          <PlusSquareIcon />
        </span>
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
            className="animate-enter absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="animate-enter relative w-full max-w-md rounded-t-2xl border-t border-line bg-surface p-4 pb-8 shadow-lg shadow-slate-900/20">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
            <p className="mb-2 px-1 font-label text-xs uppercase tracking-wide text-muted">
              Create
            </p>
            <div className="flex flex-col gap-1">
              {CREATE_OPTIONS.map((option) => (
                <Link
                  key={option.type}
                  href={`/compose?type=${option.type}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 ease-out hover:bg-surface-2 active:scale-[0.99]"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <option.icon width={17} height={17} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-text">
                      {option.label}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {option.hint}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
