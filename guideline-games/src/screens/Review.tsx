import type { CSSProperties } from "react";
import type { Lesson, Topic } from "../schema.ts";
import { solution } from "../game/engine.ts";
import { Flowchart } from "../components/Flowchart.tsx";
import { Mnemonic } from "../components/Mnemonic.tsx";
import { TopBar } from "../components/TopBar.tsx";
import { href } from "../router.ts";

/** The finished algorithm as a study sheet, with every reason inline. */
export function Review({ topic, lesson }: { topic: Topic; lesson: Lesson }) {
  const cards = new Map(lesson.cards.map((c) => [c.id, c]));
  const answers = solution(lesson);
  const traps = lesson.cards.filter((c) => c.trap);

  return (
    <div className="screen review" style={{ "--accent": topic.accent } as CSSProperties}>
      <TopBar
        title={lesson.title}
        sub={`${topic.title} · Study sheet`}
        right={
          // Printing is blocked when the app is shared as a single-page link.
          import.meta.env.MODE !== "artifact" && (
            <button type="button" className="icon-btn" onClick={() => window.print()} aria-label="Print">
              ⎙
            </button>
          )
        }
      />
      <main className="board">
        <Mnemonic mnemonic={lesson.mnemonic} />
        <Flowchart
          node={lesson.root}
          renderSlot={(s) => (
            <span className="slot ok review-slot">
              <span className="slot-locked static">{cards.get(answers[s])!.text}</span>
              <span className="why">{lesson.slots[s].explanation}</span>
            </span>
          )}
        />
        {traps.length > 0 && (
          <section className="review-traps">
            <h3>Traps: these belong nowhere</h3>
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
        <div className="review-actions">
          <a className="btn btn-primary" href={href.play(topic.id, lesson.id)}>
            Play this level
          </a>
        </div>
      </main>
    </div>
  );
}
