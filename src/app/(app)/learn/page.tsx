import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getViewer, getViewerProfile } from "@/lib/auth";
import { getLearnData } from "@/lib/learn";
import { UnavailableNotice } from "@/components/unavailable-notice";
import { StudentModeToggle } from "@/components/student-mode-toggle";

export default async function LearnPage() {
  const supabase = await createClient();
  const user = await getViewer();

  if (!user) redirect("/login");

  const [profile, data] = await Promise.all([
    getViewerProfile(),
    getLearnData(supabase, user.id),
  ]);

  return (
    <div>
      <div className="px-4 py-4">
        <h1 className="font-headline text-xl text-text">Learn</h1>
        <p className="mt-0.5 text-sm text-muted">
          Cases to reason through, and how you&apos;ve done so far.
        </p>
      </div>

      {data === null ? (
        <UnavailableNotice feature="Learn" />
      ) : (
        <>
          {/* Deliberately not a percentage. A score out of everything you've
              ever tried invites gaming it by avoiding hard cases, which is the
              opposite of what this is for. */}
          {data.attempted > 0 && (
            <section className="border-t border-line px-4 py-4">
              <p className="font-label text-xs uppercase tracking-wide text-muted">
                Your record
              </p>
              <p className="mt-1.5 text-sm text-muted">
                <span className="font-medium tabular-nums text-text">
                  {data.attempted}
                </span>{" "}
                {data.attempted === 1 ? "case" : "cases"} reasoned through ·{" "}
                <span className="font-medium tabular-nums text-text">
                  {data.correct}
                </span>{" "}
                matched the author
              </p>
              <p className="mt-1 text-xs text-muted">
                Disagreeing with the author isn&apos;t failing — the reasoning
                is the point.
              </p>
            </section>
          )}

          <section className="border-t border-line px-4 py-4">
            <p className="font-label text-xs uppercase tracking-wide text-muted">
              To practise
            </p>

            {data.practise.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                {data.attempted > 0
                  ? "You've answered every case that has a question. More arrive as clinicians post them."
                  : "No cases with questions yet."}
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-3">
                {data.practise.map((p) => (
                  <li key={p.questionId}>
                    <Link
                      href={p.caseNumber ? `/case/${p.caseNumber}` : "#"}
                      className="block rounded-xl border border-line bg-surface p-3.5 transition-transform duration-150 ease-out active:scale-[0.99]"
                    >
                      <p className="font-label text-xs text-muted">
                        {p.caseNumber}
                        {p.specialty ? ` · ${p.specialty}` : ""}
                      </p>
                      <p className="mt-1 font-headline text-base text-text">
                        {p.caseTitle}
                      </p>
                      <p className="mt-1 text-sm text-muted">{p.prompt}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <section className="border-t border-line px-4 py-4">
        <StudentModeToggle enabled={Boolean(profile?.student_mode)} />
      </section>
    </div>
  );
}
