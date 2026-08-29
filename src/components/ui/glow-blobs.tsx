/**
 * Soft, blurred ambient glow blobs — the auth screens' background treatment,
 * borrowed from a reference mockup (dark background, glowing corner blobs)
 * but built from Asyashare's own AI-hue palette instead of a dark theme: the
 * app stays light-mode only, this just gives the welcome/login/signup
 * screens a bit of the same premium "glow" the dashboard's AI features
 * already use, rather than the flat accent-soft wash that was there before.
 *
 * Pure CSS radial gradients, no images — cheap, and scales with the
 * viewport instead of pixelating. Static (no drift animation): the blobs
 * are large and this is a first-impression screen, not a place that should
 * ask for a second look. `medlnk-fade-in`/`.animate-welcome-*` on the
 * screen's own content already carries the motion here.
 */
export function GlowBlobs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="glow-blob glow-blob-1" />
      <div className="glow-blob glow-blob-2" />
      <div className="glow-blob glow-blob-3" />
    </div>
  );
}
