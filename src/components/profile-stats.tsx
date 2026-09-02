import { CLINICAL_REACTIONS } from "@/lib/reaction-types";
import type { ContributionStats } from "@/lib/profile";

/**
 * A clinician's contribution record (spec §12).
 *
 * Two halves, and the split is the point. The top row is what they put in —
 * things they chose to do. The bottom row is what other clinicians said it was
 * worth, which is the part that can't be gamed by posting more.
 *
 * Rendered only when there is something to show: a brand-new profile with five
 * zeroes reads as a scorecard you are losing, which is a poor welcome to a
 * network that wants you posting your first near miss.
 */
export function ProfileStats({ stats }: { stats: ContributionStats }) {
  const signalTotal =
    stats.signal.interesting +
    stats.signal.changed_thinking +
    stats.signal.patient_safety;

  if (stats.casesShared === 0 && stats.repliesWritten === 0) return null;

  const tiles = [
    { value: stats.casesShared, label: "cases" },
    ...(stats.safetyPosts > 0
      ? [{ value: stats.safetyPosts, label: "patient safety" }]
      : []),
    ...(stats.teachingCases > 0
      ? [{ value: stats.teachingCases, label: "cases to answer" }]
      : []),
    { value: stats.repliesWritten, label: "replies" },
  ];

  return (
    <section className="mx-4 mt-4 rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgb(var(--shadow-tint)/0.05)]">
      <p className="font-label text-xs uppercase tracking-wide text-muted">
        Contribution
      </p>

      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl bg-surface-2 p-3">
            <p className="text-lg font-semibold tabular-nums text-text">
              {tile.value}
            </p>
            <p className="font-label text-xs text-muted">{tile.label}</p>
          </div>
        ))}
      </div>

      {signalTotal > 0 && (
        <div className="mt-3.5 border-t border-line pt-3.5">
          <p className="font-label text-xs uppercase tracking-wide text-muted">
            What others said
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {CLINICAL_REACTIONS.map((r) => (
              <span
                key={r.value}
                title={`${r.label} — from other clinicians`}
                className="flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1 font-label text-xs text-muted"
              >
                <span aria-hidden>{r.emoji}</span>
                <span className="tabular-nums text-text">
                  {stats.signal[r.value]}
                </span>
                <span>{r.shortLabel}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
