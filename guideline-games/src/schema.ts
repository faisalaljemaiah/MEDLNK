// Lesson file format. Every JSON file under content/ is checked against this,
// both at build time (npm run validate) and when the app loads it.
import { z } from "zod";

export type Id = string;

/** What a box shows: plain text, one slot to fill, or text with slots inside. */
export type Content =
  | string
  | { text: string }
  | { slot: Id }
  | { mixed: (string | { slot: Id })[] };

export type FlowNode =
  | { type: "start"; id: Id; content: Content; next?: FlowNode }
  | { type: "action"; id: Id; content: Content; next?: FlowNode; drug?: boolean }
  | { type: "danger"; id: Id; content: Content; next?: FlowNode }
  | { type: "done"; id: Id; content: Content }
  | { type: "question"; id: Id; content: Content; branches: Branch[] };

export interface Branch {
  label: string;
  node: FlowNode;
}

export interface Card {
  id: Id;
  text: string;
  trap?: boolean;
  trapReason?: string;
}

export type Slot =
  | { kind: "single"; answer: Id; explanation: string; placeholder?: string }
  | { kind: "group"; group: Id; explanation: string; placeholder?: string };

export interface Limits {
  checks: number;
  hints: number;
}

export interface Lesson {
  schemaVersion: 1;
  id: Id;
  title: string;
  summary?: string;
  mnemonic?: { cue: string; expansion: string[] };
  root: FlowNode;
  cards: Card[];
  slots: Record<Id, Slot>;
  groups?: Record<Id, { cards: Id[] }>;
  stars?: { three: Limits; two: Limits };
}

export interface Topic {
  id: Id;
  title: string;
  accent: string;
  source?: string;
  order?: number;
  lessons: Id[];
}

const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "use lowercase-kebab-case ids");
const slotRef = z.strictObject({ slot: id });

const content: z.ZodType<Content> = z.union([
  z.string().min(1),
  z.strictObject({ text: z.string().min(1) }),
  slotRef,
  z.strictObject({ mixed: z.array(z.union([z.string(), slotRef])).min(1) }),
]);

const flowNode: z.ZodType<FlowNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.strictObject({ type: z.literal("start"), id, content, next: flowNode.optional() }),
    z.strictObject({
      type: z.literal("action"),
      id,
      content,
      next: flowNode.optional(),
      drug: z.boolean().optional(),
    }),
    z.strictObject({ type: z.literal("danger"), id, content, next: flowNode.optional() }),
    z.strictObject({ type: z.literal("done"), id, content }),
    z.strictObject({
      type: z.literal("question"),
      id,
      content,
      branches: z.array(z.strictObject({ label: z.string().min(1), node: flowNode })).min(1),
    }),
  ]),
);

const limits = z.strictObject({ checks: z.int().min(0), hints: z.int().min(0) });

const slot = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("single"),
    answer: id,
    explanation: z.string().min(1),
    placeholder: z.string().optional(),
  }),
  z.strictObject({
    kind: z.literal("group"),
    group: id,
    explanation: z.string().min(1),
    placeholder: z.string().optional(),
  }),
]);

const lessonShape: z.ZodType<Lesson> = z.strictObject({
  schemaVersion: z.literal(1),
  id,
  title: z.string().min(1),
  summary: z.string().optional(),
  mnemonic: z
    .strictObject({ cue: z.string().min(1), expansion: z.array(z.string().min(1)) })
    .optional(),
  root: flowNode,
  cards: z
    .array(
      z.strictObject({
        id,
        text: z.string().min(1),
        trap: z.boolean().optional(),
        trapReason: z.string().optional(),
      }),
    )
    .min(1),
  slots: z.record(id, slot),
  groups: z.record(id, z.strictObject({ cards: z.array(id).min(1) })).optional(),
  stars: z.strictObject({ three: limits, two: limits }).optional(),
});

export const topicSchema: z.ZodType<Topic> = z.strictObject({
  id,
  title: z.string().min(1),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, "accent must be a #rrggbb color"),
  source: z.string().optional(),
  order: z.number().optional(),
  lessons: z.array(id).min(1),
});

/** Walks the flowchart in reading order (top to bottom, branches left to right). */
export function walk(node: FlowNode, visit: (n: FlowNode) => void) {
  visit(node);
  if (node.type === "question") node.branches.forEach((b) => walk(b.node, visit));
  else if (node.type !== "done" && node.next) walk(node.next, visit);
}

export function slotsIn(c: Content): Id[] {
  if (typeof c === "string" || "text" in c) return [];
  if ("slot" in c) return [c.slot];
  return c.mixed.flatMap((p) => (typeof p === "string" ? [] : [p.slot]));
}

/** Slot ids in the order the player sees them. */
export function slotOrder(lesson: Lesson): Id[] {
  const out: Id[] = [];
  walk(lesson.root, (n) => out.push(...slotsIn(n.content)));
  return out;
}

/** Checks the rules a type can't express: references, uniqueness, traps. */
function crossCheck(lesson: Lesson): string[] {
  const errors: string[] = [];
  const cards = new Map(lesson.cards.map((c) => [c.id, c]));
  const groups = lesson.groups ?? {};

  if (cards.size !== lesson.cards.length) errors.push("card ids must be unique");

  const nodeIds = new Set<Id>();
  walk(lesson.root, (n) => {
    if (nodeIds.has(n.id)) errors.push(`node id "${n.id}" is used twice`);
    nodeIds.add(n.id);
  });

  const used = slotOrder(lesson);
  const seen = new Set<Id>();
  for (const s of used) {
    if (seen.has(s)) errors.push(`slot "${s}" appears in more than one place`);
    seen.add(s);
    if (!lesson.slots[s]) errors.push(`slot "${s}" is used in the flowchart but not defined in "slots"`);
  }
  if (used.length === 0) errors.push("the flowchart has no slots to fill");

  const answerCards = new Set<Id>();
  const groupUse = new Map<Id, number>();
  for (const [sid, s] of Object.entries(lesson.slots)) {
    if (!seen.has(sid)) errors.push(`slot "${sid}" is defined but never placed in the flowchart`);
    if (s.kind === "single") {
      const c = cards.get(s.answer);
      if (!c) errors.push(`slot "${sid}" answer "${s.answer}" is not a card`);
      else if (c.trap) errors.push(`slot "${sid}" answer "${s.answer}" is marked as a trap`);
      if (answerCards.has(s.answer)) errors.push(`card "${s.answer}" is the answer to two slots; use a group`);
      answerCards.add(s.answer);
    } else {
      if (!groups[s.group]) errors.push(`slot "${sid}" uses group "${s.group}", which is not defined`);
      groupUse.set(s.group, (groupUse.get(s.group) ?? 0) + 1);
    }
  }

  for (const [gid, g] of Object.entries(groups)) {
    const n = groupUse.get(gid) ?? 0;
    if (n === 0) errors.push(`group "${gid}" is not used by any slot`);
    if (g.cards.length < n) errors.push(`group "${gid}" has ${g.cards.length} cards but ${n} slots`);
    for (const cid of g.cards) {
      const c = cards.get(cid);
      if (!c) errors.push(`group "${gid}" lists "${cid}", which is not a card`);
      else if (c.trap) errors.push(`group "${gid}" lists trap card "${cid}"`);
      if (answerCards.has(cid)) errors.push(`card "${cid}" belongs to two slots or groups`);
      answerCards.add(cid);
    }
  }

  for (const c of lesson.cards) {
    if (!c.trap && !answerCards.has(c.id))
      errors.push(`card "${c.id}" fits no slot; mark it "trap": true or use it`);
  }
  return errors;
}

export type Result<T> = { ok: true; value: T } | { ok: false; errors: string[] };

function zodErrors(e: z.ZodError): string[] {
  return e.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
}

export function parseLesson(data: unknown): Result<Lesson> {
  const r = lessonShape.safeParse(data);
  if (!r.success) return { ok: false, errors: zodErrors(r.error) };
  const errors = crossCheck(r.data);
  return errors.length ? { ok: false, errors } : { ok: true, value: r.data };
}

export function parseTopic(data: unknown): Result<Topic> {
  const r = topicSchema.safeParse(data);
  return r.success ? { ok: true, value: r.data } : { ok: false, errors: zodErrors(r.error) };
}
