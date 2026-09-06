"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { clsx } from "clsx";
import { animate, type AnimationPlaybackControlsWithThen } from "motion";
import { MoreIcon } from "@/components/icons";
import { blockUserAction, unblockUserAction } from "@/app/actions/blocks";
import { reportProfileAction } from "@/app/actions/reports";
import { REPORT_REASONS } from "@/lib/report-reasons";

type View = "menu" | "report" | "reported";

/** A handful of recent {time, y} samples, enough to estimate release velocity
 *  without old, stale movement skewing it. */
type DragSample = { t: number; y: number };
type DragState = {
  startY: number;
  lastY: number;
  /** The exact px offset last written to the sheet's transform — animating
   *  off of this (rather than letting Motion guess a "current" value it
   *  never saw, since the drag wrote to style.transform directly) is what
   *  keeps the post-release spring starting from where the sheet actually
   *  is on screen instead of snapping or freezing mid-drag. */
  lastAppliedPx: number;
  samples: DragSample[];
} | null;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Real objects resist progressively past a boundary instead of stopping
 * dead — Apple's rubber-band formula (WWDC18 "Designing Fluid Interfaces"),
 * applied when the sheet is dragged up past its resting position.
 */
function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** Velocity (px/s) from the drag's last couple of samples — recent movement
 *  only, so a pause-then-flick reads as the flick, not the whole gesture's
 *  average speed. */
function releaseVelocity(samples: DragSample[]): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  const first = samples[0];
  const dt = (last.t - first.t) / 1000;
  return dt > 0 ? (last.y - first.y) / dt : 0;
}

/**
 * Replaces the profile page's old loose "Block" text link with a single
 * overflow trigger at the far right of the action row — Report and Block
 * live behind one "..." the way most social apps keep account-level
 * moderation out of the primary action buttons.
 */
export function ProfileOverflowMenu({
  profileId,
  initialBlocked,
  path,
}: {
  profileId: string;
  initialBlocked: boolean;
  path: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [blocked, setBlocked] = useState(initialBlocked);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const controlsRef = useRef<AnimationPlaybackControlsWithThen | null>(null);
  const dragRef = useRef<DragState>(null);

  // Rises in on open with a critically damped spring (no bounce — the sheet
  // was tapped open, not flicked, so nothing here carries momentum yet).
  useEffect(() => {
    if (!open) return;
    const sheet = sheetRef.current;
    if (!sheet) return;

    if (prefersReducedMotion()) {
      sheet.style.opacity = "1";
      if (backdropRef.current) backdropRef.current.style.opacity = "1";
      return;
    }

    controlsRef.current?.stop();
    controlsRef.current = animate(
      sheet,
      { y: ["100%", "0%"], opacity: [0, 1] },
      { type: "spring", bounce: 0, duration: 0.4 },
    );
    const backdrop = backdropRef.current;
    if (backdrop) animate(backdrop, { opacity: [0, 1] }, { duration: 0.2 });
  }, [open]);

  // Plays the sheet out before actually unmounting, instead of the instant
  // disappearance a plain `{open && ...}` unmount would give it — an exit
  // that mirrors the entrance, per the same "spatial consistency" this
  // sheet's rise already follows. `velocity` is 0 for every non-drag close
  // (buttons, backdrop tap); the drag handler passes the real release
  // velocity so a downward flick keeps moving instead of restarting slow.
  function playExit(velocity = 0, fromPx?: number) {
    const sheet = sheetRef.current;
    if (!sheet || prefersReducedMotion()) {
      setOpen(false);
      setView("menu");
      return;
    }
    controlsRef.current?.stop();
    controlsRef.current = animate(
      sheet,
      { y: fromPx !== undefined ? [`${fromPx}px`, "100%"] : "100%" },
      { type: "spring", bounce: 0, duration: 0.4, velocity },
    );
    const backdrop = backdropRef.current;
    if (backdrop) animate(backdrop, { opacity: 0 }, { duration: 0.2 });
    controlsRef.current.then(() => {
      setOpen(false);
      // Reset to the menu view after the close animation actually finished,
      // so reopening later doesn't land back on a stale report form.
      setView("menu");
    });
  }

  function close() {
    playExit(0);
  }

  // Drag-to-dismiss on the handle only (not the whole sheet) — the report
  // form below has its own radio buttons and a textarea, which would fight
  // a sheet-wide drag surface for the same pointer.
  function onHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (prefersReducedMotion()) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    // Grab from the sheet's live on-screen position, not mid-spring target —
    // the same "animate from the presentation value" rule the entrance and
    // exit springs above already follow.
    controlsRef.current?.stop();
    dragRef.current = {
      startY: e.clientY,
      lastY: e.clientY,
      lastAppliedPx: 0,
      samples: [{ t: performance.now(), y: e.clientY }],
    };
  }

  function onHandlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const sheet = sheetRef.current;
    if (!drag || !sheet) return;

    const rawDelta = e.clientY - drag.startY;
    const height = sheet.offsetHeight || 1;
    // Dragging down tracks the finger 1:1; dragging up past the resting
    // position resists progressively instead of stopping dead.
    const delta = rawDelta < 0 ? -rubberband(-rawDelta, height) : rawDelta;
    sheet.style.transform = `translateY(${delta}px)`;
    drag.lastAppliedPx = delta;

    const backdrop = backdropRef.current;
    if (backdrop) {
      const progress = Math.min(Math.max(rawDelta / height, 0), 1);
      backdrop.style.opacity = String(1 - progress * 0.85);
    }

    drag.lastY = e.clientY;
    drag.samples.push({ t: performance.now(), y: e.clientY });
    if (drag.samples.length > 6) drag.samples.shift();
  }

  function onHandlePointerUp() {
    const drag = dragRef.current;
    const sheet = sheetRef.current;
    dragRef.current = null;
    if (!drag || !sheet) return;

    const height = sheet.offsetHeight || 1;
    const rawDelta = drag.lastY - drag.startY;
    const velocity = releaseVelocity(drag.samples);

    // Either signal alone is enough to commit: dragged nearly a third of the
    // sheet's own height, or flicked fast even if it didn't travel far —
    // deciding by velocity's sign/magnitude, not position alone, is what
    // makes a quick flick dismiss without needing a full drag to the edge.
    const shouldDismiss = rawDelta > height * 0.3 || velocity > 600;

    if (shouldDismiss) {
      playExit(velocity, drag.lastAppliedPx);
      return;
    }

    controlsRef.current = animate(
      sheet,
      { y: [`${drag.lastAppliedPx}px`, "0%"] },
      { type: "spring", bounce: 0, duration: 0.35, velocity },
    );
    const backdrop = backdropRef.current;
    if (backdrop) animate(backdrop, { opacity: 1 }, { duration: 0.2 });
  }

  function toggleBlock() {
    if (
      !blocked &&
      !window.confirm(
        "Block this account? They won't be able to message or follow you, and you won't see their posts.",
      )
    ) {
      return;
    }
    setError(null);
    const next = !blocked;
    setBlocked(next);
    startTransition(async () => {
      const result = next
        ? await blockUserAction(profileId, path)
        : await unblockUserAction(profileId, path);
      if ("error" in result) {
        setBlocked(!next);
        setError(result.error);
        return;
      }
      close();
    });
  }

  function submitReport(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await reportProfileAction(profileId, formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setView("reported");
      formRef.current?.reset();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="More options"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-text transition-transform duration-150 ease-out active:scale-90"
      >
        <MoreIcon width={16} height={16} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="More options"
          className="fixed inset-0 z-30 flex items-end justify-center"
        >
          <button
            ref={backdropRef}
            type="button"
            aria-label="Close"
            onClick={close}
            style={{ opacity: 0 }}
            className="absolute inset-0 bg-[rgb(var(--shadow-tint)/0.4)] backdrop-blur-sm"
          />
          <div
            ref={sheetRef}
            style={{ opacity: 0 }}
            className="relative w-full max-w-md rounded-t-2xl border-t border-line bg-surface p-4 pb-8 shadow-[0_-4px_32px_rgb(var(--shadow-tint)/0.2)]"
          >
            <div
              onPointerDown={onHandlePointerDown}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
              onPointerCancel={onHandlePointerUp}
              style={{ touchAction: "none" }}
              className="-mx-3 -mt-1 flex cursor-grab justify-center px-3 pb-3 pt-1 active:cursor-grabbing"
            >
              <div className="h-1 w-10 rounded-full bg-line" aria-hidden="true" />
            </div>

            {view === "menu" && (
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setView("report")}
                  className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-text transition-colors duration-150 ease-out hover:bg-surface-2"
                >
                  Report this account
                </button>
                <button
                  type="button"
                  onClick={toggleBlock}
                  disabled={isPending}
                  className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-danger transition-colors duration-150 ease-out hover:bg-danger/5 disabled:opacity-60"
                >
                  {blocked ? "Unblock this account" : "Block this account"}
                </button>
                {error && <p className="px-3 text-xs text-danger">{error}</p>}
              </div>
            )}

            {view === "report" && (
              <form ref={formRef} action={submitReport} className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-medium text-text">Report this account</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Goes to Asyashare moderators. They aren&apos;t told who reported it.
                  </p>
                </div>

                <fieldset className="flex flex-col gap-1.5">
                  <legend className="sr-only">Reason</legend>
                  {REPORT_REASONS.map((reason, i) => (
                    <label
                      key={reason.value}
                      className={clsx(
                        "flex cursor-pointer gap-2.5 rounded-lg border p-2.5",
                        reason.urgent ? "border-warning/40 bg-warning/5" : "border-line",
                      )}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={reason.value}
                        defaultChecked={i === 0}
                        required
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
                      />
                      <span>
                        <span className="block text-sm text-text">{reason.label}</span>
                        <span className="block text-xs text-muted">{reason.hint}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>

                <textarea
                  name="details"
                  placeholder="Anything else the moderators should know? (optional)"
                  className="min-h-16 resize-y rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
                />

                {error && <p className="text-xs text-danger">{error}</p>}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-danger px-3.5 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {isPending ? "Sending…" : "Send report"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("menu")}
                    className="rounded-lg border border-line px-3.5 py-2 text-sm text-muted"
                  >
                    Back
                  </button>
                </div>
              </form>
            )}

            {view === "reported" && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-text">
                  Thanks — this has gone to the moderators.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="self-start rounded-lg border border-line px-3.5 py-2 text-sm text-muted"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
