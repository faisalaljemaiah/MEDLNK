import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { AskSpecialist } from "@/components/ask-specialist";
import { SpecialistAnswerForm } from "@/components/specialist-answer-form";
import { UnavailableNotice } from "@/components/unavailable-notice";
import { closeSpecialistRequestAction } from "@/app/actions/specialists";
import type { SpecialistThread } from "@/lib/specialists";

/**
 * Specialist asks and answers on a case (spec §10).
 *
 * Answers are badged with the specialty they were given under, and that badge
 * is only trustworthy because 0012 enforces the match at write time — the UI
 * never decides who is a cardiologist.
 */
export function SpecialistThreads({
  caseId,
  caseSpecialty,
  path,
  threads,
  viewerId,
  viewerSpecialty,
  canAsk,
}: {
  caseId: string;
  caseSpecialty: string | null;
  path: string;
  /** Null means the read failed — 0012 isn't applied yet. */
  threads: SpecialistThread[] | null;
  viewerId: string | null;
  viewerSpecialty: string | null;
  canAsk: boolean;
}) {
  if (threads === null) {
    return (
      <section className="mt-6 border-t border-line pt-4">
        <p className="font-label text-xs uppercase tracking-wide text-muted">
          Specialist input
        </p>
        <UnavailableNotice feature="Ask a Specialist" />
      </section>
    );
  }

  const viewerSpec = viewerSpecialty?.trim().toLowerCase() ?? "";

  return (
    <section className="mt-6 border-t border-line pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-label text-xs uppercase tracking-wide text-muted">
          Specialist input
        </p>
        {canAsk && (
          <AskSpecialist
            caseId={caseId}
            path={path}
            defaultSpecialty={caseSpecialty}
          />
        )}
      </div>

      {threads.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          No specialist has been asked about this case yet.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-5">
          {threads.map((t) => {
            const isRequester = viewerId === t.requester_id;
            const matchesViewer = t.specialty.trim().toLowerCase() === viewerSpec;
            const alreadyAnswered = t.answers.some(
              (a) => a.responder_id === viewerId,
            );

            return (
              <li
                key={t.id}
                className="rounded-xl border border-line bg-surface p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-accent-2/40 bg-accent-2/10 px-2.5 py-0.5 font-label text-xs text-accent-2">
                    {t.specialty}
                  </span>
                  {t.status === "closed" && (
                    <span className="rounded-full border border-line px-2.5 py-0.5 font-label text-xs text-muted">
                      Closed
                    </span>
                  )}
                  <span className="font-label text-xs text-muted">
                    asked by{" "}
                    <Link
                      href={
                        t.requester?.handle ? `/u/${t.requester.handle}` : "#"
                      }
                      className="hover:underline"
                    >
                      {t.requester?.full_name ?? "a member"}
                    </Link>
                  </span>
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text">
                  {t.question}
                </p>

                {t.answers.length === 0 ? (
                  <p className="mt-3 text-xs text-muted">
                    Waiting on {t.specialty}.
                  </p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
                    {t.answers.map((a) => (
                      <li key={a.id} className="flex gap-3">
                        <Link
                          href={
                            a.responder?.handle
                              ? `/u/${a.responder.handle}`
                              : "#"
                          }
                          className="shrink-0"
                        >
                          <Avatar
                            avatarUrl={a.responder?.avatar_url}
                            name={a.responder?.full_name}
                            size="sm"
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2">
                            <Link
                              href={
                                a.responder?.handle
                                  ? `/u/${a.responder.handle}`
                                  : "#"
                              }
                              className="text-sm font-medium text-text hover:underline"
                            >
                              {a.responder?.full_name ?? "Unknown clinician"}
                              {a.responder?.verified && (
                                <span className="ml-1 text-positive">✓</span>
                              )}
                            </Link>
                            <span className="rounded-full border border-positive/40 bg-positive/10 px-2 py-0.5 font-label text-xs text-positive">
                              {t.specialty}
                            </span>
                          </div>
                          {a.moderation_status === "removed" && (
                            <p className="mt-1 rounded-lg border border-danger/40 bg-danger/5 px-2.5 py-1.5 text-xs text-danger">
                              Removed by a moderator. Only you and the
                              moderation team can see this.
                            </p>
                          )}
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text">
                            {a.body}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {viewerId &&
                  t.status !== "closed" &&
                  matchesViewer &&
                  !alreadyAnswered && (
                    <SpecialistAnswerForm
                      requestId={t.id}
                      specialty={t.specialty}
                      path={path}
                    />
                  )}

                {isRequester && t.status !== "closed" && (
                  <form
                    action={closeSpecialistRequestAction.bind(null, t.id, path)}
                    className="mt-3"
                  >
                    <button
                      type="submit"
                      className="text-xs text-muted underline-offset-2 hover:text-text hover:underline"
                    >
                      Close this request
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
