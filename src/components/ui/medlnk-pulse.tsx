import { clsx } from "clsx";

/**
 * A hairline sweeping gradient line in MEDLNK's AI hues — the "this
 * interface is alive" ambient cue from the motion spec, deliberately not
 * used everywhere it's permitted to appear: one clear placement (behind the
 * dashboard greeting) beats scattering it thin across the app.
 */
export function MedLnkPulse({ className }: { className?: string }) {
  return (
    <span aria-hidden className={clsx("medlnk-pulse-line block", className)} />
  );
}
