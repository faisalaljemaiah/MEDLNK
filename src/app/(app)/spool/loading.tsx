// Mirrors ReelSlide's circle (and ReelView's dark, full-viewport backdrop)
// so the placeholder doesn't jump on swap.
export default function Loading() {
  return (
    <>
      <div aria-hidden className="spool-backdrop fixed inset-0 -z-10" />
      <div
        aria-busy="true"
        aria-label="Loading"
        className="flex h-[calc(100dvh-145px)] w-full shrink-0 items-center justify-center"
      >
        <div className="aspect-square h-[min(72dvh,90vw,520px)] animate-pulse rounded-full bg-white/[0.07] ring-1 ring-white/10" />
      </div>
    </>
  );
}
