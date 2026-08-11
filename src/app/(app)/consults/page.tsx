import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getViewer, getViewerProfile } from "@/lib/auth";
import { getOpenConsults } from "@/lib/specialists";
import { Avatar } from "@/components/avatar";
import { SpecialistAnswerForm } from "@/components/specialist-answer-form";
import { UnavailableNotice } from "@/components/unavailable-notice";

/**
 * The queue of cases waiting on the viewer's specialty (spec §10).
 *
 * Deliberately not a general "all open consults" list: a request routed to
 * Cardiology is a request for a cardiologist, and a browsable queue of every
 * specialty's questions would fill up with answers from people who happen to
 * have an opinion. The insert policy would reject those anyway — this just
 * stops the app inviting them.
 */
export default async function ConsultsPage() {
  const supabase = await createClient();
  const user = await getViewer();

  if (!user) redirect("/login");

  const profile = await getViewerProfile();
  const specialty = profile?.specialty?.trim() ?? "";

  const consults = specialty ? await getOpenConsults(supabase, specialty) : [];
  const path = "/consults";

  return (
    <div>
      <div className="px-4 py-4">
        <h1 className="font-headline text-xl text-text">Specialist requests</h1>
        <p className="mt-0.5 text-sm text-muted">
          {specialty
            ? `Cases waiting on ${specialty}.`
            : "Cases waiting on your specialty."}
        </p>
      </div>

      {!specialty ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm text-muted">
            Add your specialty to your profile and requests for it will appear
            here.
          </p>
          <Link
            href="/onboarding"
            className="mt-3 inline-block rounded-full border border-line px-4 py-1.5 text-sm font-medium text-text"
          >
            Edit profile
          </Link>
        </div>
      ) : consults === null ? (
        <UnavailableNotice feature="Ask a Specialist" />
      ) : consults.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted">
          Nothing waiting on {specialty} right now.
        </p>
      ) : (
        <ul className="flex flex-col">
          {consults.map((c) => {
            const alreadyAnswered = c.answers.some(
              (a) => a.responder_id === user.id,
            );

            return (
              <li key={c.id} className="border-t border-line px-4 py-4">
                <Link
                  href={
                    c.subject_case?.case_number
                      ? `/case/${c.subject_case.case_number}`
                      : "#"
                  }
                  className="font-headline text-base text-text hover:underline"
                >
                  {c.subject_case?.title ?? "A case"}
                </Link>

                <div className="mt-1.5 flex items-center gap-2">
                  <Avatar
                    avatarUrl={c.requester?.avatar_url}
                    name={c.requester?.full_name}
                    size="sm"
                  />
                  <p className="font-label text-xs text-muted">
                    {c.requester?.full_name ?? "A member"} asked ·{" "}
                    {new Date(c.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text">
                  {c.question}
                </p>

                {c.answers.length > 0 && (
                  <p className="mt-2 font-label text-xs text-muted">
                    {c.answers.length}{" "}
                    {c.answers.length === 1 ? "answer" : "answers"} already —
                    add yours if you see it differently.
                  </p>
                )}

                {alreadyAnswered ? (
                  <p className="mt-2 font-label text-xs text-positive">
                    You&apos;ve answered this one.
                  </p>
                ) : (
                  <SpecialistAnswerForm
                    requestId={c.id}
                    specialty={c.specialty}
                    path={path}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
