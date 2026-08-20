// Mirrors ReelSlide's inset card so the placeholder doesn't jump on swap.
export default function Loading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="flex h-[calc(100dvh-145px)] w-full shrink-0 items-stretch px-3 py-2"
    >
      <div className="mx-auto h-full w-full max-w-sm animate-pulse rounded-3xl border border-line bg-surface shadow-lg shadow-slate-900/10" />
    </div>
  );
}
