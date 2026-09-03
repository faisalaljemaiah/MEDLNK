"use client";

import { useState, useTransition } from "react";
import { clsx } from "clsx";
import {
  submitAnswerAction,
  type QuestionReveal,
} from "@/app/actions/interactive";
import type { CaseQuestionView } from "@/lib/cases";
import type { AnswerDistribution, ViewerAttempt } from "@/lib/interactive";

/**
 * The core Asyashare loop: commit to an answer, see what everyone else thought,
 * then get the author's reasoning.
 *
 * Nothing here decides what is correct. The component is only ever told the
 * result for an attempt that has already been recorded — `is_correct` is not
 * readable by the app's database role at all, so there is no answer key in the
 * page for a curious reader to find.
 */
export function CaseQuestion({
  question,
  initialAttempt,
  initialDistribution,
  initialReveal,
  path,
  signedIn,
  onAnswered,
}: {
  question: CaseQuestionView;
  initialAttempt: ViewerAttempt | null;
  initialDistribution: AnswerDistribution;
  /** Null until this reader has answered — see submitAnswerAction. */
  initialReveal: QuestionReveal | null;
  path: string;
  signedIn: boolean;
  /**
   * Fires once an answer has been recorded. Used by the quiz runner to keep a
   * running score; the case page doesn't pass it.
   */
  onAnswered?: (isCorrect: boolean) => void;
}) {
  const [attempt, setAttempt] = useState<ViewerAttempt | null>(initialAttempt);
  const [reveal, setReveal] = useState<QuestionReveal | null>(initialReveal);
  const [distribution, setDistribution] = useState(initialDistribution);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const answered = attempt !== null;
  const canRevise = answered && question.allow_change;

  function submit(optionId: string) {
    setError(null);
    startTransition(async () => {
      const result = await submitAnswerAction(question.id, optionId, path);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setAttempt({ optionId, isCorrect: result.isCorrect });
      setReveal(result.reveal);
      // Only on a first answer: a revision shouldn't score twice.
      if (!attempt) onAnswered?.(result.isCorrect);
      // Reflect this answer locally so the bars move immediately; the
      // revalidate behind the action reconciles the real counts.
      setDistribution((prev) => {
        const votes = { ...prev.votes };
        if (attempt) votes[attempt.optionId] = Math.max(0, (votes[attempt.optionId] ?? 1) - 1);
        votes[optionId] = (votes[optionId] ?? 0) + 1;
        const total = attempt ? prev.total : prev.total + 1;
        return { votes, total };
      });
      setSelected(null);
    });
  }

  return (
    <section className="mt-5 rounded-xl border border-accent/30 bg-accent/5 p-4">
      <p className="font-label text-xs uppercase tracking-wide text-accent">
        What would you do?
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text">
        {question.prompt}
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {question.options.map((option, index) => {
          const letter = String.fromCharCode(65 + index);
          const isMine = attempt?.optionId === option.id;
          const votes = distribution.votes[option.id] ?? 0;
          const pct =
            distribution.total > 0
              ? Math.round((votes / distribution.total) * 100)
              : 0;

          return (
            <li key={option.id}>
              <button
                type="button"
                disabled={isPending || (answered && !canRevise) || !signedIn}
                onClick={() => (answered ? submit(option.id) : setSelected(option.id))}
                aria-pressed={answered ? isMine : selected === option.id}
                className={clsx(
                  "relative w-full overflow-hidden rounded-lg border px-3 py-2.5 text-left text-sm transition-colors duration-150",
                  "disabled:cursor-default",
                  isMine
                    ? "border-accent bg-accent/10 text-text"
                    : selected === option.id
                      ? "border-accent bg-surface text-text"
                      : "border-line bg-surface text-text",
                )}
              >
                {/* Distribution bar, only after the reader has committed. */}
                {answered && (
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 bg-accent/10 transition-[width] duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <span className="font-label w-4 shrink-0 text-xs text-muted">
                    {letter}
                  </span>
                  <span className="flex-1">{option.body}</span>
                  {answered && (
                    <span className="shrink-0 font-label text-xs text-muted">
                      {pct}%
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {!signedIn && (
        <p className="mt-3 text-xs text-muted">Sign in to answer this case.</p>
      )}

      {signedIn && !answered && (
        <button
          type="button"
          disabled={!selected || isPending}
          onClick={() => selected && submit(selected)}
          className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity disabled:opacity-50"
        >
          {isPending ? "Submitting…" : "Submit answer"}
        </button>
      )}

      {answered && (
        <div className="animate-enter mt-4 border-t border-accent/20 pt-4">
          <p className="text-sm font-medium text-text">
            {attempt.isCorrect
              ? "✓ That matches the author's answer."
              : "The author chose differently."}
            <span className="ml-2 font-normal text-muted">
              {distribution.total}{" "}
              {distribution.total === 1 ? "clinician has" : "clinicians have"}{" "}
              answered
            </span>
          </p>

          {reveal?.explanation && (
            <Block label="Explanation" text={reveal.explanation} />
          )}
          {reveal?.reasoning && (
            <Block label="Clinical reasoning" text={reveal.reasoning} />
          )}
          {reveal?.evidence && (
            <Block label="References" text={reveal.evidence} />
          )}

          <p className="mt-3 text-xs text-muted">
            Educational discussion between clinicians — not advice for a specific
            patient.
          </p>

          {canRevise && (
            <p className="mt-1 text-xs text-muted">
              The author allows changing your answer — pick another option above.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function Block({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-3">
      <p className="font-label text-xs uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text">
        {text}
      </p>
    </div>
  );
}
