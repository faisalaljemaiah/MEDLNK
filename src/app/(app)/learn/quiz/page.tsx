import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { getQuizItems } from "@/lib/learn";
import { QuizRunner } from "@/components/quiz-runner";
import { UnavailableNotice } from "@/components/unavailable-notice";

export default async function QuizPage() {
  const supabase = await createClient();
  const user = await getViewer();

  if (!user) redirect("/login");

  const items = await getQuizItems(supabase, user.id);

  return (
    <div className="px-4 py-4">
      <div className="mb-4">
        <h1 className="font-headline text-xl text-text">Quiz</h1>
        <p className="mt-0.5 text-sm text-muted">
          Real cases other clinicians posted. Educational discussion, not advice
          for a specific patient.
        </p>
      </div>

      {items === null ? (
        <UnavailableNotice feature="Quiz" />
      ) : items.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-muted">
            Nothing left to practise — you&apos;ve answered every case that has a
            question.
          </p>
          <Link
            href="/learn"
            className="mt-3 inline-block rounded-full border border-line px-4 py-1.5 text-sm font-medium text-text"
          >
            Back to Learn
          </Link>
        </div>
      ) : (
        <QuizRunner items={items} path="/learn/quiz" />
      )}
    </div>
  );
}
