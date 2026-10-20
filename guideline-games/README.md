# Guideline Games

A mobile-first study app that turns clinical treatment algorithms into
drag-and-drop puzzles. Each level is a flowchart with empty boxes; drag the
answer cards into place and press **Check**. Correct boxes turn green and
explain *why*; wrong ones shake and go back to the tray. Some cards are traps
that belong nowhere.

It's a PWA (React + TypeScript + Vite): it installs on a phone from the
browser and works offline. Progress is saved on the device.

## Run it

```bash
npm install
npm run dev          # prints a Network URL; open it on your phone (same Wi-Fi)
npm test             # game-rule tests
npm run validate     # checks every lesson file
npm run build        # validate + type-check + production build in dist/
```

To install on a phone, deploy `dist/` to any static host (Netlify, Vercel,
GitHub Pages), open it, and choose **Add to Home Screen**.

## How to play

- **Drag** a card onto a box (touch or mouse), or **tap a card, then tap a
  box**. Tap a filled box to send its card back.
- **Keyboard**: Tab to a card, press Enter to pick it up, Tab to a box, press
  Enter to drop it. Esc cancels.
- **Check** locks correct boxes. **Hint** fills the next box for you.
  **Reset** clears the boxes that aren't locked yet.
- Stars: 3 for a perfect first check with no hints, 2 for at most 2 checks
  and 1 hint, otherwise 1. A lesson can change these limits.
- **Sheet** (on the home screen) shows the finished algorithm with every
  explanation, as a study sheet you can print.

## Adding a lesson

Lessons are plain JSON files. You don't need to touch any code.

```
content/
  gerd-pud/
    topic.json          the topic: title, colour, lesson order
    gerd-dx-tx.json     one file per level
    pud-workup.json
```

### 1. The topic file

`content/<topic-id>/topic.json`:

```json
{
  "id": "gerd-pud",
  "title": "GERD & PUD",
  "accent": "#0e9f8e",
  "source": "GIT disorders – Lecture 3",
  "order": 1,
  "lessons": ["gerd-dx-tx", "pud-workup"]
}
```

- `id` must match the folder name.
- `accent` is the topic colour (`#rrggbb`).
- `lessons` lists the lesson files (without `.json`) in play order. A file not
  listed here is hidden.
- `order` (optional) sorts topics on the home screen, lowest first.

### 2. The lesson file

`content/<topic-id>/<lesson-id>.json`. The file name must match `id`. Here's a
small complete example:

```json
{
  "schemaVersion": 1,
  "id": "example",
  "title": "Example level",
  "mnemonic": { "cue": "ABC", "expansion": ["Airway", "Breathing", "Circulation"] },
  "root": {
    "type": "start", "id": "start", "content": "Patient presents",
    "next": {
      "type": "question", "id": "q1", "content": "Alarm signs?",
      "branches": [
        { "label": "YES", "node": { "type": "danger", "id": "refer", "content": { "slot": "s-refer" } } },
        { "label": "NO", "node": {
            "type": "action", "id": "treat", "drug": true,
            "content": { "mixed": ["Give", { "slot": "s-drug-1" }, "+", { "slot": "s-drug-2" }] },
            "next": { "type": "done", "id": "end", "content": "Follow up" } } }
      ]
    }
  },
  "cards": [
    { "id": "refer", "text": "Refer urgently" },
    { "id": "drug-a", "text": "Drug A" },
    { "id": "drug-b", "text": "Drug B" },
    { "id": "decoy", "text": "Drug C", "trap": true, "trapReason": "Not in this regimen." }
  ],
  "slots": {
    "s-refer": { "kind": "single", "answer": "refer", "explanation": "Why this step is right.", "placeholder": "Action" },
    "s-drug-1": { "kind": "group", "group": "combo", "explanation": "Why these drugs." },
    "s-drug-2": { "kind": "group", "group": "combo", "explanation": "Why these drugs." }
  },
  "groups": { "combo": { "cards": ["drug-a", "drug-b"] } }
}
```

**Nodes** (each box in the flowchart):

| `type`     | Looks like               | Has                                          |
| ---------- | ------------------------ | -------------------------------------------- |
| `start`    | rounded pill             | `next`                                       |
| `question` | pointed decision box     | `branches`: `[{ "label": "YES", "node": … }]` |
| `action`   | box (`"drug": true` adds an Rx tag) | `next`                            |
| `danger`   | red box (refer / stop)   | `next`                                       |
| `done`     | filled pill              | nothing after it                             |

Every node needs a unique `id`. Branches can hold any node, including
another question, so you can nest as deep as the algorithm goes.

**`content`** is what a box shows:

- `"Plain text"`: fixed text.
- `{ "slot": "s-id" }`: the whole box is a blank to fill.
- `{ "mixed": ["Text", { "slot": "s-id" }, "more text"] }`: text with blanks inside.

**Slots** (the blanks):

- `"kind": "single"` with `"answer": "<card id>"`: exactly one card fits.
- `"kind": "group"` with `"group": "<group id>"`: any card from that group
  fits, in any order. Use one group slot per drug, e.g. 4 slots for a
  quadruple regimen, all pointing to the same group.
- `explanation` is shown after a correct check, on the result screen and on
  the study sheet.
- `placeholder` (optional) is the faint text in the empty box.

**Cards**: every card must be either an answer (a slot's `answer` or in a
group) or marked `"trap": true`. Add a `trapReason` to explain on the result
screen why it's wrong.

**Optional**: `summary` (a line under the title) and
`"stars": { "three": { "checks": 1, "hints": 0 }, "two": { "checks": 2, "hints": 1 } }`.

The full type is in [`src/schema.ts`](src/schema.ts).

### 3. Check it

```bash
npm run validate
```

This catches typos such as a slot pointing at a card that doesn't exist, a card
that fits nowhere, a duplicate id, or a lesson missing from `topic.json`. The
app shows the same problems on the home screen in red, so a broken file never
crashes it.

## Project layout

```
content/              lesson JSON (the only place you edit to add content)
src/schema.ts         lesson types + validation rules
src/library.ts        loads and validates all topics
src/game/engine.ts    game rules (place, check, hint, stars), unit-tested
src/components/       flowchart, mnemonic banner, stars
src/screens/          Home, Play (level), Result, Review (study sheet)
scripts/validate.ts   npm run validate
```
