import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Card, Id, Lesson, Topic } from "../schema.ts";
import {
  check,
  clearWrong,
  hint,
  initState,
  isComplete,
  place,
  scoreFor,
  shuffle,
  slotOf,
  starsFor,
  trayCards,
  unplace,
  type GameState,
} from "../game/engine.ts";
import { Flowchart } from "../components/Flowchart.tsx";
import { Mnemonic } from "../components/Mnemonic.tsx";
import { TopBar } from "../components/TopBar.tsx";
import { recordResult } from "../progress.ts";
import { Result, type Outcome } from "./Result.tsx";

interface Props {
  topic: Topic;
  lesson: Lesson;
  index: number;
  total: number;
  next?: Lesson;
}

export function Play(props: Props) {
  const [round, setRound] = useState(0);
  // Keyed so a replay or the next level starts from a clean board.
  return <Game key={`${props.lesson.id}:${round}`} {...props} onReplay={() => setRound((r) => r + 1)} />;
}

interface Feedback {
  correct: Id[];
  wrong: number;
  hinted?: boolean;
}

function Game({ topic, lesson, index, total, next, onReplay }: Props & { onReplay: () => void }) {
  const cards = useMemo(() => new Map(lesson.cards.map((c) => [c.id, c])), [lesson]);
  const [order] = useState(() => shuffle(lesson.cards.map((c) => c.id)));
  const [state, setState] = useState<GameState>(() => initState(lesson));
  const [selected, setSelected] = useState<Id | null>(null);
  const [dragging, setDragging] = useState<Id | null>(null);
  const [why, setWhy] = useState<Id | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [announce, setAnnounce] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const finished = useRef(false);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // A short press starts a drag; a quick swipe still scrolls the page.
    useSensor(TouchSensor, { activationConstraint: { delay: 140, tolerance: 8 } }),
  );

  // Wrong cards shake for a moment, then go back to the tray.
  useEffect(() => {
    if (!state.wrong.length) return;
    const t = setTimeout(() => setState(clearWrong), 900);
    return () => clearTimeout(t);
  }, [state.wrong]);

  const complete = isComplete(state);
  const latest = useRef(state);
  latest.current = state;

  useEffect(() => {
    if (!complete || finished.current) return;
    finished.current = true;
    const s = latest.current;
    const stars = starsFor(lesson, s);
    const score = scoreFor(s);
    const prev = recordResult(topic.id, lesson.id, stars, score);
    // Short pause so the last green boxes are visible before the result screen.
    setTimeout(() => setOutcome({ stars, score, checks: s.checks, hints: s.hints, prevBest: prev?.stars ?? 0 }), 900);
  }, [complete, lesson, topic.id]);

  // Keep focused or scrolled-to boxes above the sticky tray.
  const trayRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = trayRef.current;
    if (!el) return;
    const root = document.documentElement;
    const ro = new ResizeObserver(() => (root.style.scrollPaddingBottom = `${el.offsetHeight + 16}px`));
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.scrollPaddingBottom = "";
    };
  }, [outcome]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (outcome)
    return <Result topic={topic} lesson={lesson} outcome={outcome} next={next} onReplay={onReplay} />;

  const text = (id: Id) => cards.get(id)?.text ?? id;

  const putCard = (cardId: Id, slotId: Id) => {
    setState((s) => place(s, cardId, slotId));
    setSelected(null);
    setAnnounce(`${text(cardId)} placed.`);
  };

  const returnCard = (slotId: Id) => {
    const c = state.placed[slotId];
    setState((s) => unplace(s, slotId));
    if (c) setAnnounce(`${text(c)} returned to the tray.`);
  };

  const onCheck = () => {
    const r = check(lesson, state);
    setState(r.state);
    setSelected(null);
    setFeedback({ correct: r.correct, wrong: r.wrong.length });
    setAnnounce(
      `${r.correct.length} correct, ${r.wrong.length} wrong.` + (isComplete(r.state) ? " Level complete!" : ""),
    );
  };

  const onHint = () => {
    const r = hint(lesson, state);
    if (!r) return;
    setState(r.state);
    setSelected(null);
    setFeedback({ correct: [r.slot], wrong: 0, hinted: true });
    setAnnounce(`Hint: ${text(r.state.placed[r.slot]!)} placed.`);
  };

  const onReset = () => {
    setState((s) => {
      let out = clearWrong(s);
      for (const sl of Object.keys(out.placed)) out = unplace(out, sl);
      return out;
    });
    setSelected(null);
    setFeedback(null);
    setAnnounce("Open boxes cleared.");
  };

  const onDragStart = (e: DragStartEvent) => {
    setDragging(cardIdOf(e.active.id));
    setSelected(null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const cardId = cardIdOf(e.active.id);
    const target = e.over?.id;
    if (typeof target !== "string") return;
    if (target.startsWith("slot:")) putCard(cardId, target.slice(5));
    else if (target === "tray") {
      const from = slotOf(state, cardId);
      if (from) returnCard(from);
    }
  };

  const tray = trayCards(order, state);
  const filledOpen = Object.entries(state.placed).some(([s, c]) => c && !state.locked[s]);

  const renderSlot = (sid: Id) => (
    <SlotView
      slotId={sid}
      lesson={lesson}
      state={state}
      cards={cards}
      selected={selected}
      whyOpen={why === sid}
      onToggleWhy={() => setWhy((w) => (w === sid ? null : sid))}
      onPlaceSelected={() => selected && putCard(selected, sid)}
      onReturn={() => returnCard(sid)}
    />
  );

  return (
    <div className="screen play" style={{ "--accent": topic.accent } as CSSProperties}>
      <TopBar
        title={lesson.title}
        sub={`${topic.title} · Level ${index + 1} of ${total}`}
        right={
          <div className="counters" aria-label={`${state.checks} checks, ${state.hints} hints used`}>
            <span>✓ {state.checks}</span>
            <span>? {state.hints}</span>
          </div>
        }
      />
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        <main className="board">
          <Mnemonic mnemonic={lesson.mnemonic} />
          {lesson.summary && <p className="lesson-summary">{lesson.summary}</p>}
          <Flowchart node={lesson.root} renderSlot={renderSlot} />
        </main>

        <section ref={trayRef} className={selected ? "tray has-selection" : "tray"} aria-label="Answer cards">
          {feedback && <FeedbackStrip feedback={feedback} lesson={lesson} state={state} text={text} onClose={() => setFeedback(null)} />}
          <TrayDrop>
            {tray.length === 0 ? (
              <p className="tray-empty">{complete ? "All done!" : "All cards are on the board. Press Check."}</p>
            ) : (
              tray.map((id) => (
                <CardChip
                  key={id}
                  card={cards.get(id)!}
                  selected={selected === id}
                  onClick={() => setSelected((s) => (s === id ? null : id))}
                  label={selected === id ? `${text(id)}, selected. Now choose a box.` : `${text(id)}. Select to place.`}
                />
              ))
            )}
          </TrayDrop>
          <p className="tray-tip" aria-hidden="true">
            {selected ? `Now tap a box for “${text(selected)}”. Esc to cancel.` : "Drag a card onto a box, or tap a card then tap a box."}
          </p>
          <div className="actions">
            <button type="button" className="btn" onClick={onHint} disabled={complete}>
              Hint
            </button>
            <button type="button" className="btn" onClick={onReset} disabled={complete || !filledOpen}>
              Reset
            </button>
            <button type="button" className="btn btn-primary" onClick={onCheck} disabled={complete || !filledOpen}>
              Check
            </button>
          </div>
        </section>

        <DragOverlay dropAnimation={null}>
          {dragging ? <div className="card dragging-overlay">{text(dragging)}</div> : null}
        </DragOverlay>
      </DndContext>
      <div className="sr-only" aria-live="polite">
        {announce}
      </div>
    </div>
  );
}

const cardIdOf = (id: string | number) => String(id).replace(/^card:/, "");

function TrayDrop({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "tray" });
  return (
    <div ref={setNodeRef} className={isOver ? "tray-cards over" : "tray-cards"}>
      {children}
    </div>
  );
}

function CardChip({
  card,
  selected,
  onClick,
  label,
  status,
}: {
  card: Card;
  selected?: boolean;
  onClick: () => void;
  label: string;
  status?: "wrong";
}) {
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: `card:${card.id}` });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      className={["card", selected && "selected", isDragging && "ghost", status].filter(Boolean).join(" ")}
      aria-pressed={selected}
      aria-label={label}
      onClick={onClick}
    >
      {card.text}
    </button>
  );
}

function SlotView({
  slotId,
  lesson,
  state,
  cards,
  selected,
  whyOpen,
  onToggleWhy,
  onPlaceSelected,
  onReturn,
}: {
  slotId: Id;
  lesson: Lesson;
  state: GameState;
  cards: Map<Id, Card>;
  selected: Id | null;
  whyOpen: boolean;
  onToggleWhy: () => void;
  onPlaceSelected: () => void;
  onReturn: () => void;
}) {
  const slot = lesson.slots[slotId];
  const locked = !!state.locked[slotId];
  const cardId = state.placed[slotId];
  const wrong = state.wrong.includes(slotId);
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${slotId}`, disabled: locked });
  const placeholder = slot.placeholder ?? "Drop here";

  let inner;
  if (locked && cardId)
    inner = (
      <>
        <button type="button" className="slot-locked" aria-expanded={whyOpen} onClick={onToggleWhy}>
          <span aria-hidden="true">✓</span> {cards.get(cardId)!.text}
          <span className="why-tag">Why?</span>
        </button>
        {whyOpen && <span className="why">{slot.explanation}</span>}
      </>
    );
  else if (cardId)
    inner = (
      <CardChip
        card={cards.get(cardId)!}
        status={wrong ? "wrong" : undefined}
        onClick={selected ? onPlaceSelected : onReturn}
        label={
          selected
            ? `Box with ${cards.get(cardId)!.text}. Swap in ${cards.get(selected)!.text}.`
            : `${cards.get(cardId)!.text} in box. Select to send back to the tray.`
        }
      />
    );
  else
    inner = (
      <button
        type="button"
        className="slot-empty"
        onClick={onPlaceSelected}
        aria-label={selected ? `Place ${cards.get(selected)!.text} in box: ${placeholder}` : `Empty box: ${placeholder}`}
      >
        {placeholder}
      </button>
    );

  return (
    <span
      ref={setNodeRef}
      className={["slot", locked && "ok", wrong && "bad", isOver && "over", selected && !locked && "target"]
        .filter(Boolean)
        .join(" ")}
    >
      {inner}
    </span>
  );
}

function FeedbackStrip({
  feedback,
  lesson,
  state,
  text,
  onClose,
}: {
  feedback: Feedback;
  lesson: Lesson;
  state: GameState;
  text: (id: Id) => string;
  onClose: () => void;
}) {
  const { correct, wrong, hinted } = feedback;
  return (
    <div className={wrong ? "feedback has-wrong" : "feedback"}>
      <div className="feedback-head">
        <strong>
          {hinted
            ? "Hint used"
            : wrong
              ? `${correct.length} correct · ${wrong} wrong, sent back to the tray`
              : correct.length
                ? `${correct.length} correct`
                : "Nothing new to check"}
        </strong>
        <button type="button" className="icon-btn small" aria-label="Close feedback" onClick={onClose}>
          ×
        </button>
      </div>
      {correct.length > 0 && (
        <ul>
          {correct.map((s) => (
            <li key={s}>
              <b>{text(state.placed[s]!)}</b>: {lesson.slots[s].explanation}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
