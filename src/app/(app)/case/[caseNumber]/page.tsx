import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCaseByCaseNumber } from "@/lib/cases";
import { getDiveDeepDataAction } from "@/app/actions/recap";
import { Avatar } from "@/components/avatar";
import { ReactionBar } from "@/components/reaction-bar";

export default async function CasePage({
  params,
}: {
  params: Promise<{ caseNumber: string }>;
}) {
  const { caseNumber } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const feedCase = await getCaseByCaseNumber(supabase, caseNumber, user?.id ?? null);
  if (!feedCase) notFound();

  const path = `/case/${caseNumber}`;
  const { recapSummary, similar } = await getDiveDeepDataAction(feedCase.id);

  return (
    <div className="px-4 py-6">
      <p className="font-label text-xs uppercase tracking-wide text-muted">
        {feedCase.case_number ?? "CASE"}
        {feedCase.specialty ? ` · ${feedCase.specialty}` : ""}
      </p>
      <h1 className="mt-1 font-headline text-2xl text-text">{feedCase.title}</h1>

      <Link
        href={feedCase.author?.handle ? `/u/${feedCase.author.handle}` : "#"}
        className="mt-3 flex items-center gap-2 hover:opacity-80"
      >
        <Avatar
          avatarUrl={feedCase.author?.avatar_url}
          name={feedCase.author?.full_name}
        />
        <span className="text-sm text-text">
          {feedCase.author?.full_name ?? "Unknown clinician"}
          {feedCase.author?.verified && (
            <span className="ml-1 text-positive">✓ verified</span>
          )}
        </span>
      </Link>

      <section className="mt-5 rounded-xl border border-accent-2/30 bg-accent-2/10 p-4">
        <p className="font-label text-xs uppercase tracking-wide text-accent-2">
          AI recap
        </p>
        <p className="mt-1 text-sm text-text">
          {recapSummary ?? "No AI recap yet for this case."}
        </p>
      </section>

      <div className="mt-5 flex flex-col gap-5">
        <CaseBlock label="Presentation" text={feedCase.full_body.presentation} />
        <CaseBlock label="What was tricky" text={feedCase.full_body.tricky} />
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-muted">
            What we did
          </p>
          <ul className="mt-1.5 flex list-disc flex-col gap-1.5 pl-5 text-sm text-text">
            {feedCase.full_body.actions.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ul>
        </div>
        <CaseBlock label="The lesson" text={feedCase.full_body.lesson} />
      </div>

      {feedCase.tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {feedCase.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-line px-2.5 py-1 font-label text-xs text-muted"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6">
        <ReactionBar
          caseId={feedCase.id}
          counts={feedCase.counts}
          viewerReactions={feedCase.viewerReactions}
          path={path}
        />
      </div>

      <section className="mt-6 border-t border-line pt-4">
        <p className="font-label text-xs uppercase tracking-wide text-muted">
          Similar cases
        </p>
        {similar.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Nothing similar yet — check back as more cases are posted.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {similar.map((s) => (
              <li key={s.id}>
                <Link
                  href={s.case_number ? `/case/${s.case_number}` : "#"}
                  className="text-sm text-accent hover:underline"
                >
                  {s.case_number ? `${s.case_number} · ` : ""}
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CaseBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="font-label text-xs uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-text">{text}</p>
    </div>
  );
}
