// Pure game rules: placing cards, checking, hints and stars. No React here.
import { slotOrder, type Id, type Lesson, type Limits } from "../schema.ts";

export interface GameState {
  /** slot id -> card id currently in it */
  placed: Record<Id, Id | null>;
  locked: Record<Id, boolean>;
  /** slots marked wrong by the last check, cleared after the shake */
  wrong: Id[];
  checks: number;
  hints: number;
}

export const DEFAULT_STARS: { three: Limits; two: Limits } = {
  three: { checks: 1, hints: 0 },
  two: { checks: 2, hints: 1 },
};

export function initState(lesson: Lesson): GameState {
  const placed: Record<Id, Id | null> = {};
  for (const s of slotOrder(lesson)) placed[s] = null;
  return { placed, locked: {}, wrong: [], checks: 0, hints: 0 };
}

export function slotOf(state: GameState, cardId: Id): Id | undefined {
  return Object.keys(state.placed).find((s) => state.placed[s] === cardId);
}

/** Cards still in the tray, in the given display order. */
export function trayCards(order: Id[], state: GameState): Id[] {
  const used = new Set(Object.values(state.placed));
  return order.filter((c) => !used.has(c));
}

/** Puts a card in a slot. Whatever was there goes back to the tray. */
export function place(state: GameState, cardId: Id, slotId: Id): GameState {
  if (state.locked[slotId]) return state;
  const from = slotOf(state, cardId);
  if (from && state.locked[from]) return state;
  const placed = { ...state.placed };
  if (from) placed[from] = null;
  placed[slotId] = cardId;
  return { ...state, placed, wrong: state.wrong.filter((s) => s !== slotId && s !== from) };
}

export function unplace(state: GameState, slotId: Id): GameState {
  if (state.locked[slotId] || !state.placed[slotId]) return state;
  return {
    ...state,
    placed: { ...state.placed, [slotId]: null },
    wrong: state.wrong.filter((s) => s !== slotId),
  };
}

export function fits(lesson: Lesson, slotId: Id, cardId: Id): boolean {
  const slot = lesson.slots[slotId];
  if (slot.kind === "single") return slot.answer === cardId;
  return lesson.groups?.[slot.group]?.cards.includes(cardId) ?? false;
}

export interface CheckResult {
  state: GameState;
  correct: Id[];
  wrong: Id[];
}

/** Locks every correctly filled slot and marks the wrong ones. */
export function check(lesson: Lesson, state: GameState): CheckResult {
  const correct: Id[] = [];
  const wrong: Id[] = [];
  for (const [s, c] of Object.entries(state.placed)) {
    if (!c || state.locked[s]) continue;
    (fits(lesson, s, c) ? correct : wrong).push(s);
  }
  const locked = { ...state.locked };
  for (const s of correct) locked[s] = true;
  return { state: { ...state, locked, wrong, checks: state.checks + 1 }, correct, wrong };
}

/** Sends the cards from wrong slots back to the tray. */
export function clearWrong(state: GameState): GameState {
  if (!state.wrong.length) return state;
  const placed = { ...state.placed };
  for (const s of state.wrong) placed[s] = null;
  return { ...state, placed, wrong: [] };
}

/** Fills and locks the first open slot with a correct card, or null if none is left. */
export function hint(lesson: Lesson, state: GameState): { state: GameState; slot: Id } | null {
  const base = clearWrong(state);
  const slotId = slotOrder(lesson).find((s) => !base.locked[s]);
  if (!slotId) return null;
  const slot = lesson.slots[slotId];
  const current = base.placed[slotId];
  // Keep a correct card the player already put here; otherwise take one that
  // isn't sitting correctly in another slot, so a hint never undoes their work.
  const cardId =
    current && fits(lesson, slotId, current)
      ? current
      : slot.kind === "single"
        ? slot.answer
        : lesson.groups![slot.group].cards.find((c) => {
            const at = slotOf(base, c);
            return !at || !fits(lesson, at, c);
          });
  if (!cardId) return null;
  const next = place(base, cardId, slotId);
  return { state: { ...next, locked: { ...next.locked, [slotId]: true }, hints: base.hints + 1 }, slot: slotId };
}

export function isComplete(state: GameState): boolean {
  return Object.keys(state.placed).every((s) => state.locked[s]);
}

export function starsFor(lesson: Lesson, state: GameState): 1 | 2 | 3 {
  const { three, two } = lesson.stars ?? DEFAULT_STARS;
  const within = (l: Limits) => state.checks <= l.checks && state.hints <= l.hints;
  return within(three) ? 3 : within(two) ? 2 : 1;
}

/** 0-100. Each extra check costs 15, each hint 20. */
export function scoreFor(state: GameState): number {
  return Math.max(0, 100 - 15 * Math.max(0, state.checks - 1) - 20 * state.hints);
}

export function shuffle<T>(items: T[], seed = Math.random()): T[] {
  const out = [...items];
  let x = Math.floor(seed * 2 ** 31) || 1;
  for (let i = out.length - 1; i > 0; i--) {
    x = (x * 48271) % 2147483647;
    const j = x % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The finished board: each slot with a correct card (group cards dealt in order). */
export function solution(lesson: Lesson): Record<Id, Id> {
  const out: Record<Id, Id> = {};
  const next: Record<Id, number> = {};
  for (const s of slotOrder(lesson)) {
    const slot = lesson.slots[s];
    if (slot.kind === "single") out[s] = slot.answer;
    else {
      const i = next[slot.group] ?? 0;
      out[s] = lesson.groups![slot.group].cards[i];
      next[slot.group] = i + 1;
    }
  }
  return out;
}
