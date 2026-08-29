"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { SparkleIcon } from "@/components/icons";

/**
 * A button wired into Asyashare's AI visual language: a slow, fully-contained
 * shifting-hue rim (.ai-glow, globals.css) idles as a standing
 * "AI-powered" cue, speeds up while `pending` is true, and — on the
 * pending→false transition — holds a brief checkmark before settling back.
 * Currently used for the compose form's "Check spelling & clarity"; written
 * generically so any future AI-touched action reuses the same chrome and
 * state cues rather than reinventing them.
 */
export function AIButton({
  pending,
  onClick,
  idleLabel,
  pendingLabel,
}: {
  pending: boolean;
  onClick: () => void;
  idleLabel: string;
  pendingLabel: string;
}) {
  const [justDone, setJustDone] = useState(false);
  const wasPending = useRef(pending);

  useEffect(() => {
    if (wasPending.current && !pending) {
      setJustDone(true);
      const id = setTimeout(() => setJustDone(false), 1400);
      wasPending.current = pending;
      return () => clearTimeout(id);
    }
    wasPending.current = pending;
  }, [pending]);

  return (
    <span
      className={clsx(
        "ai-glow inline-flex rounded-lg transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-[0.98]",
        pending && "ai-glow-active",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg bg-accent-soft px-3.5 py-2 text-sm font-medium text-accent transition-opacity disabled:opacity-60"
      >
        {justDone ? (
          <span aria-hidden className="text-positive">
            ✓
          </span>
        ) : (
          <SparkleIcon width={15} height={15} strokeWidth={2} />
        )}
        {pending ? pendingLabel : justDone ? "Done" : idleLabel}
      </button>
    </span>
  );
}
