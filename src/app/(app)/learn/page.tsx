import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getViewer, getViewerProfile } from "@/lib/auth";
import { getLearnData, type PractiseCase } from "@/lib/learn";
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
          {data.practise.length > 0 && (
            <section className="border-t border-line px-4 py-4">
              <Link
                href="/learn/quiz"
                className="flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4 transition-transform duration-150 ease-out active:scale-[0.99]"
              >
                <span className="min-w-0">
                  <span className="block font-headline text-base text-text">
                    Take five
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">
                    {data.practise.length}{" "}
                    {data.practise.length === 1 ? "case" : "cases"} you
                    haven&apos;t reasoned through yet.
                  </span>
                </span>
                <span className="shrink-0 text-accent">→</span>
              </Link>
            </section>
          )}

          {data.attempted > 0 && (
            <section className="border-t border-line px-4 py-4">
              <p className="font-label text-xs uppercase tracking-wide text-muted">
                My learning
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

              {data.bySpecialty.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {data.bySpecialty.map((s) => (
                    <li
                      key={s.specialty}
                      className="flex items-baseline justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 truncate text-text">
                        {s.specialty}
                      </span>
                      <span className="shrink-0 font-label text-xs text-muted">
                        <span className="tabular-nums">{s.matched}</span>/
                        <span className="tabular-nums">{s.attempted}</span>{" "}
                        matched
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {data.missed.length > 0 && (
            <section className="border-t border-line px-4 py-4">
              <p className="font-label text-xs uppercase tracking-wide text-muted">
                Worth a second look
              </p>
              <p className="mt-1 text-xs text-muted">
                Cases where you and the author differed.
              </p>
              <ul className="mt-2 flex flex-col gap-3">
                {data.missed.map((p) => (
                  <PractiseLink key={p.questionId} item={p} />
                ))}
              </ul>
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
                  <PractiseLink key={p.questionId} item={p} />
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

function PractiseLink({ item }: { item: PractiseCase }) {
  return (
    <li>
      <Link
        href={item.caseNumber ? `/case/${item.caseNumber}` : "#"}
        className="block rounded-xl border border-line bg-surface p-3.5 transition-transform duration-150 ease-out active:scale-[0.99]"
      >
        <p className="font-label text-xs text-muted">
          {item.caseNumber}
          {item.specialty ? ` · ${item.specialty}` : ""}
        </p>
        <p className="mt-1 font-headline text-base text-text">
          {item.caseTitle}
        </p>
        <p className="mt-1 text-sm text-muted">{item.prompt}</p>
      </Link>
    </li>
  );
}
