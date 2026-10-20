import { useEffect, useRef, type CSSProperties } from "react";
import type { Lesson, Topic } from "../schema.ts";
import { slotOrder } from "../schema.ts";
import { solution } from "../game/engine.ts";
import { Stars } from "../components/Stars.tsx";
import { TopBar } from "../components/TopBar.tsx";
import { href } from "../router.ts";

export interface Outcome {
  stars: number;
  score: number;
  checks: number;
  hints: number;
  prevBest: number;
}

const HEADLINE = ["", "Completed", "Well done", "Perfect!"];

export function Result({
  topic,
  lesson,
  outcome,
  next,
  onReplay,
}: {
  topic: Topic;
  lesson: Lesson;
  outcome: Outcome;
  next?: Lesson;
  onReplay: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    heading.current?.focus();
  }, []);

  const cards = new Map(lesson.cards.map((c) => [c.id, c]));
  const answers = solution(lesson);
  const traps = lesson.cards.filter((c) => c.trap);

  return (
    <div className="screen result" style={{ "--accent": topic.accent } as CSSProperties}>
      <TopBar title={lesson.title} sub={topic.title} />
      <main className="result-body">
        <section className="result-hero">
          <Stars value={outcome.stars} size="lg" />
          <h2 ref={heading} tabIndex={-1}>
            {HEADLINE[outcome.stars]}
          </h2>
          <p className="muted">
            Score {outcome.score} · {outcome.checks} {outcome.checks === 1 ? "check" : "checks"} · {outcome.hints}{" "}
            {outcome.hints === 1 ? "hint" : "hints"}
            {outcome.stars > outcome.prevBest && outcome.prevBest > 0 && " · New best!"}
          </p>
          <div className="result-actions">
            {next ? (
              <a className="btn btn-primary" href={href.play(topic.id, next.id)}>
                Next level
              </a>
            ) : (
              <a className="btn btn-primary" href={href.home()}>
                Back to topics
              </a>
            )}
            <a className="btn" href={href.review(topic.id, lesson.id)}>
              Study sheet
            </a>
            <button type="button" className="btn" onClick={onReplay}>
              Play again
            </button>
          </div>
        </section>

        <section>
          <h3>Why each answer is right</h3>
          <ol className="explain-list">
            {slotOrder(lesson).map((s) => (
              <li key={s}>
                <strong>{cards.get(answers[s])!.text}</strong>
                <span>{lesson.slots[s].explanation}</span>
              </li>
            ))}
          </ol>
        </section>

        {traps.length > 0 && (
          <section>
            <h3>Traps</h3>
            <ul className="explain-list traps">
              {traps.map((t) => (
                <li key={t.id}>
                  <strong>{t.text}</strong>
                  <span>{t.trapReason ?? "Doesn't belong anywhere in this algorithm."}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
