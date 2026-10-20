import type { CSSProperties } from "react";
import { library } from "../content.ts";
import { progressKey, useProgress } from "../progress.ts";
import { href } from "../router.ts";
import type { ThemeChoice } from "../theme.ts";
import { Stars } from "../components/Stars.tsx";

const THEME_ICON: Record<ThemeChoice, string> = { system: "◐", light: "☀", dark: "☾" };

export function Home({ theme, onTheme }: { theme: ThemeChoice; onTheme: () => void }) {
  const progress = useProgress();

  return (
    <div className="screen home">
      <header className="home-head">
        <div>
          <h1>Guideline Games</h1>
          <p className="muted">Fill in the treatment algorithm. Learn why each step is there.</p>
        </div>
        <button type="button" className="icon-btn" onClick={onTheme} aria-label={`Theme: ${theme}. Change theme`}>
          {THEME_ICON[theme]}
        </button>
      </header>

      <main className="topics">
        {library.topics.map(({ topic, lessons }) => {
          const earned = lessons.reduce((n, l) => n + (progress[progressKey(topic.id, l.id)]?.stars ?? 0), 0);
          const max = lessons.length * 3;
          return (
            <section key={topic.id} className="topic" style={{ "--accent": topic.accent } as CSSProperties}>
              <header className="topic-head">
                <div>
                  <h2>{topic.title}</h2>
                  {topic.source && <p className="muted small">{topic.source}</p>}
                </div>
                <span className="topic-score" aria-label={`${earned} of ${max} stars`}>
                  ★ {earned}/{max}
                </span>
              </header>
              <div className="meter" aria-hidden="true">
                <span style={{ width: `${(earned / max) * 100}%` }} />
              </div>
              <ol className="levels">
                {lessons.map((l, i) => {
                  const p = progress[progressKey(topic.id, l.id)];
                  return (
                    <li key={l.id} className="level-row">
                      <a className="level-link" href={href.play(topic.id, l.id)}>
                        <span className="level-num">{i + 1}</span>
                        <span className="level-title">
                          {l.title}
                          {p && <span className="muted small"> · best {p.score}</span>}
                        </span>
                        <Stars value={p?.stars ?? 0} />
                      </a>
                      <a className="level-review" href={href.review(topic.id, l.id)} aria-label={`Study sheet: ${l.title}`}>
                        Sheet
                      </a>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}

        {library.problems.length > 0 && (
          <section className="problems" role="alert">
            <h2>Some lesson files have problems</h2>
            <p className="muted small">Fix these, or run <code>npm run validate</code> for the same list.</p>
            {library.problems.map((p) => (
              <div key={p.file}>
                <code>{p.file}</code>
                <ul>
                  {p.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}
      </main>
      <footer className="home-foot muted small">Progress is saved on this device. Works offline once installed.</footer>
    </div>
  );
}
