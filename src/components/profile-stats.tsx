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

  return (
    <section className="border-t border-line px-4 py-4">
      <p className="font-label text-xs uppercase tracking-wide text-muted">
        Contribution
      </p>

      <div className="mt-2.5 flex flex-wrap gap-x-6 gap-y-2">
        <Stat value={stats.casesShared} label="cases" />
        {stats.safetyPosts > 0 && (
          <Stat value={stats.safetyPosts} label="patient safety" />
        )}
        {stats.teachingCases > 0 && (
          <Stat value={stats.teachingCases} label="cases to answer" />
        )}
        <Stat value={stats.repliesWritten} label="replies" />
      </div>

      {signalTotal > 0 && (
        <div className="mt-3">
          <p className="font-label text-xs uppercase tracking-wide text-muted">
            What others said
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {CLINICAL_REACTIONS.map((r) => (
              <span
                key={r.value}
                title={`${r.label} — from other clinicians`}
                className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 font-label text-xs text-muted"
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

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="text-sm text-muted">
      <span className="font-medium tabular-nums text-text">{value}</span>{" "}
      {label}
    </span>
  );
}
