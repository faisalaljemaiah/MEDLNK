import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseLesson, type Lesson } from "../schema.ts";
import { check, clearWrong, hint, initState, isComplete, place, scoreFor, starsFor } from "./engine.ts";

const raw = JSON.parse(readFileSync(new URL("../../content/tutorial/making-tea.json", import.meta.url), "utf8"));
const parsed = parseLesson(raw);
assert.ok(parsed.ok);
const lesson: Lesson = parsed.value;

const solve = (s = initState(lesson)) =>
  [
    ["danger", "s-danger"],
    ["steep", "s-steep"],
    ["sugar", "s-extra-1"],
    ["milk", "s-extra-2"],
    ["fill", "s-fill"],
  ].reduce((st, [c, sl]) => place(st, c, sl), s);

test("perfect first check earns 3 stars", () => {
  const { state, wrong } = check(lesson, solve());
  assert.deepEqual(wrong, []);
  assert.ok(isComplete(state));
  assert.equal(starsFor(lesson, state), 3);
  assert.equal(scoreFor(state), 100);
});

test("group slots accept members in any order", () => {
  const { correct } = check(lesson, place(place(initState(lesson), "milk", "s-extra-1"), "sugar", "s-extra-2"));
  assert.deepEqual(correct.sort(), ["s-extra-1", "s-extra-2"]);
});

test("traps and wrong cards are marked wrong and returned to the tray", () => {
  let s = place(place(initState(lesson), "salt", "s-extra-1"), "fill", "s-steep");
  const r = check(lesson, s);
  assert.deepEqual(r.wrong.sort(), ["s-extra-1", "s-steep"]);
  s = clearWrong(r.state);
  assert.equal(s.placed["s-extra-1"], null);
  assert.equal(s.placed["s-steep"], null);
});

test("locked slots can't be changed", () => {
  const s = check(lesson, place(initState(lesson), "danger", "s-danger")).state;
  assert.equal(place(s, "fill", "s-danger"), s);
  assert.equal(place(s, "danger", "s-fill"), s);
});

test("placing into a filled slot sends the old card back", () => {
  const s = place(place(initState(lesson), "fill", "s-fill"), "steep", "s-fill");
  assert.equal(s.placed["s-fill"], "steep");
  assert.ok(!Object.values(s.placed).includes("fill"));
});

test("hint fills the first open slot and lowers stars", () => {
  const h = hint(lesson, initState(lesson))!;
  assert.equal(h.slot, "s-danger");
  assert.equal(h.state.placed["s-danger"], "danger");
  assert.ok(h.state.locked["s-danger"]);
  const done = check(lesson, solve(h.state)).state;
  assert.ok(isComplete(done));
  assert.equal(starsFor(lesson, done), 2);
});

test("hint on a group slot doesn't steal a correctly placed card", () => {
  let s = place(initState(lesson), "milk", "s-extra-2");
  for (let i = 0; i < 2; i++) s = hint(lesson, s)!.state;
  const h = hint(lesson, s)!;
  assert.equal(h.slot, "s-extra-1");
  assert.equal(h.state.placed["s-extra-1"], "sugar");
  assert.equal(h.state.placed["s-extra-2"], "milk");
});

test("hints can finish a level", () => {
  let s = initState(lesson);
  for (let h = hint(lesson, s); h; h = hint(lesson, s)) s = h.state;
  assert.ok(isComplete(s));
  assert.equal(starsFor(lesson, s), 1);
});

test("validator catches broken references", () => {
  const broken = structuredClone(raw);
  broken.slots["s-fill"].answer = "nope";
  broken.cards.push({ id: "orphan", text: "Orphan" });
  const r = parseLesson(broken);
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => e.includes('"nope" is not a card')));
  assert.ok(r.errors.some((e) => e.includes('"orphan" fits no slot')));
});
