"use client";

import { useState } from "react";
import Link from "next/link";
import { CaseQuestion } from "@/components/case-question";
import type { QuizItem } from "@/lib/learn";

/**
 * A short run of unanswered cases (spec §14).
 *
 * The question itself is the same component the case page uses, not a copy of
 * it — a quiz answer and a feed answer are the same act, recorded the same way,
 * and forking the component would eventually mean two versions of the rule that
 * the answer never reaches the browser before the reader commits.
 *
 * The score is local and not stored: every answer is already a row in
 * case_attempts, which is what My Learning reads. A separate quiz score would
 * be a second, drifting record of the same fact.
 */
export function QuizRunner({ items, path }: { items: QuizItem[]; path: string }) {
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [matched, setMatched] = useState(0);

  const item = items[index];
  const done = index >= items.length;
  const isLast = index === items.length - 1;

  if (done) {
    return (
      <div className="rounded-xl border border-line bg-surface p-5 text-center">
        <p className="font-headline text-lg text-text">
          {items.length} {items.length === 1 ? "case" : "cases"} done
        </p>
        <p className="mt-1 text-sm text-muted">
          You matched the author on{" "}
          <span className="font-medium tabular-nums text-text">{matched}</span>{" "}
          of {items.length}.
        </p>
        <p className="mt-2 text-xs text-muted">
          Where you differed is the interesting part — the reasoning is on each
          case.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Link
            href="/learn/quiz"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Another five
          </Link>
          <Link
            href="/learn"
            className="rounded-full border border-line px-4 py-2 text-sm text-muted"
          >
            Back to Learn
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-label text-xs uppercase tracking-wide text-muted">
          {index + 1} of {items.length}
          {item.specialty ? ` · ${item.specialty}` : ""}
        </p>
        <Link
          href={item.caseNumber ? `/case/${item.caseNumber}` : "#"}
          className="font-label text-xs text-accent hover:underline"
        >
          Open the full case
        </Link>
      </div>

      <h2 className="mt-1 font-headline text-lg text-text">{item.caseTitle}</h2>

      <CaseQuestion
        // Keyed so moving to the next question resets the component's own
        // answered/reveal state rather than carrying the last one's over.
        key={item.question.id}
        question={item.question}
        initialAttempt={null}
        initialDistribution={item.distribution}
        initialReveal={null}
        path={path}
        signedIn
        onAnswered={(isCorrect) => {
          setAnswered(true);
          if (isCorrect) setMatched((m) => m + 1);
        }}
      />

      {answered && (
        <button
          type="button"
          onClick={() => {
            setAnswered(false);
            setIndex((i) => i + 1);
          }}
          className="mt-4 w-full rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 ease-out active:scale-[0.99]"
        >
          {isLast ? "See how you did" : "Next case"}
        </button>
      )}
    </div>
  );
}
