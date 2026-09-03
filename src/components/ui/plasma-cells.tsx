/**
 * The sign-in screen's animated backdrop — four blurred, slowly drifting
 * "cell" shapes over a soft accent/silver wash. Same idea as GlowBlobs
 * (this file's sibling) but with continuous motion instead of a static
 * first-impression treatment, since /login gets revisited every session
 * rather than once. Opaque background so it fully overrides the shared
 * auth layout's GlowBlobs for this one route instead of layering on it.
 * Drift keyframes live in globals.css (.plasma-cell-*) and animate
 * transform only, so this stays cheap on the Capacitor-wrapped builds.
 */
export function PlasmaCells() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-bg"
    >
      <div className="plasma-cell plasma-cell-1" />
      <div className="plasma-cell plasma-cell-2" />
      <div className="plasma-cell plasma-cell-3" />
      <div className="plasma-cell plasma-cell-4" />
    </div>
  );
}
