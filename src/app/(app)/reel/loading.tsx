// Reel slides are full-bleed, so a card skeleton would flash the wrong shape.
export default function Loading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="h-[calc(100dvh-145px)] w-full shrink-0 animate-pulse bg-gradient-to-br from-accent to-accent-2"
    />
  );
}
