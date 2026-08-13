import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { getPersonalAnalytics } from "@/lib/analytics";
import { CLINICAL_REACTIONS } from "@/lib/reaction-types";

const MONTH_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: "short",
  year: "2-digit",
});

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return MONTH_FORMAT.format(new Date(year, month - 1, 1));
}

/**
 * A clinician's own contribution trend over time (spec §30). Personal, not
 * comparative — no ranking against other clinicians, in keeping with the same
 * non-competitive stance ProfileStats and reputation take.
 */
export default async function AnalyticsPage() {
  const supabase = await createClient();
  const user = await getViewer();
  if (!user) redirect("/login");

  const data = await getPersonalAnalytics(supabase, user.id);
  const maxMonthCount = Math.max(1, ...data.casesByMonth.map((m) => m.count));

  return (
    <div className="px-4 py-6">
      <h1 className="font-headline text-xl text-text">Your impact</h1>
      <p className="mt-1 text-sm text-muted">
        What you&apos;ve shared, and what other clinicians said it was worth.
      </p>

      {data.casesByMonth.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted">
          Nothing to show yet — share your first case to start this trend.
        </p>
      ) : (
        <>
          <section className="mt-6">
            <p className="font-label text-xs uppercase tracking-wide text-muted">
              Cases shared, by month
            </p>
            <div className="mt-3 flex items-end gap-2">
              {data.casesByMonth.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className="w-full rounded-t bg-accent/70"
                    style={{
                      height: `${Math.max(6, (m.count / maxMonthCount) * 96)}px`,
                    }}
                    title={`${m.count} case${m.count === 1 ? "" : "s"}`}
                  />
                  <span className="font-label text-[10px] text-muted">
                    {monthLabel(m.month)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <p className="font-label text-xs uppercase tracking-wide text-muted">
              What others said
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CLINICAL_REACTIONS.map((r) => (
                <span
                  key={r.value}
                  className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 font-label text-xs text-muted"
                >
                  <span aria-hidden>{r.emoji}</span>
                  <span className="tabular-nums text-text">
                    {data.signal[r.value]}
                  </span>
                  <span>{r.shortLabel}</span>
                </span>
              ))}
            </div>
          </section>

          {data.topCase && (
            <section className="mt-8">
              <p className="font-label text-xs uppercase tracking-wide text-muted">
                Your most engaged case
              </p>
              <Link
                href={
                  data.topCase.case_number
                    ? `/case/${data.topCase.case_number}`
                    : "#"
                }
                className="mt-2 block rounded-xl border border-line bg-surface p-4 hover:border-accent"
              >
                <p className="text-sm font-medium text-text">
                  {data.topCase.title}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {data.topCase.counts.interesting +
                    data.topCase.counts.changed_thinking +
                    data.topCase.counts.patient_safety}{" "}
                  clinical-value reactions
                </p>
              </Link>
            </section>
          )}
        </>
      )}
    </div>
  );
}
