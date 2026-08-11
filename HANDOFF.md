# MEDLNK — handoff

State of the project as of the last session. Read this plus `PLAN.md` before
picking work up.

## What MEDLNK is

A clinical knowledge network for verified healthcare professionals and
students. Verified clinicians post cases, near misses and lessons; others
reason through them, answer, discuss and learn.

The product identity is the loop, not the feed:

> Here's the case → What would *you* do? → Here's what everyone else thought →
> Here's what actually happened → Here's why → Now follow it.

Not "LinkedIn for doctors". Every feature should help a clinician learn, think,
teach, communicate, or improve patient safety.

## Stack and conventions

| Layer | What to know |
| --- | --- |
| Framework | Next.js 16 App Router. Server Components fetch, Server Actions mutate. **No client-side data fetching anywhere** — keep it that way. Middleware is renamed Proxy and lives in `src/proxy.ts`. |
| Data | Supabase Postgres, RLS on every table. Writes gated on `public.is_verified()`. |
| Auth | `getViewer()` (`src/lib/auth.ts`) verifies the JWT locally via `getClaims()` — ES256, ~1-2ms. Server Actions use `getUser()` so writes are checked against the Auth server. Don't "simplify" reads back to `getUser()`: it costs ~250ms per call. |
| Types | `src/lib/database.types.ts` is hand-written — update it with every migration. Must be `type` aliases, never `interface`. |
| Performance | Supabase is ~260ms away. Latency is set by **sequential round trips**, not payload. Feed and case reads are single queries using PostgREST embeds. Parallelise with `Promise.all`. |
| Styling | Every colour is a token in `src/app/theme.css`. Use the generated utilities (`bg-surface`, `text-muted`), never raw hex. Light theme; contrast is WCAG-AA checked. |
| Layout | Top header (wordmark + messages). Floating translucent bottom nav: Home, Reel, Create, Search, Profile. Mobile-first. |
| AI | Edge Functions only — the Anthropic key never reaches the browser. All AI is best-effort and must never block a user action. |

## Built and pushed

All on branch `claude/medlnk-e2e-testing-i0vawy`, PR #4.

- Bottom nav redesign, top header, light theme, reel cards (glass over case photo)
- Perf: page latency ~560ms → ~25ms (the win was local JWT verification)
- Loading skeletons, tap responsiveness, reduced-motion support
- Liked/Saved profile tabs
- Direct messages (`/messages`)
- Search over title/tag/specialty
- AI writing check in the composer (spelling/grammar/clarity, human-approved, numeric guard)
- **Interactive cases (Priority 1)**: post types, Near Miss prompts, What Would
  You Do? with answer-before-reveal, Case Evolution timeline, Follow Case,
  Blind Case staged reveal
- **Priority 1 close-out**: home feed chip row (All / Near miss / What would you
  do? / Following), the Following area, and the notifications inbox — bell in
  the header with an unread dot, `/notifications`, per-item and mark-all read
- **Reporting and moderation** (§23/§29): reports, content removal, suspension
  routed through `is_verified()`, admin queue and audit log
- **Priority 2, complete**:
  - Clinical-value reactions (§9) — 💡 / 🧠 / ⚠️ replacing the bare like
  - The case discussion thread, with structured reply labels (§25). There was
    no comment UI at all before this; the table existed and was counted, but
    nothing could read or write one.
  - Profile contribution stats (§12) and advanced search filters (§20)
  - Ask a Specialist (§10), with `/consults` as the specialty queue
  - Student Mode + Learn (§11, §26)
- **Priority 3, in progress**:
  - Safety Alerts (§17) — platform-wide broadcast, banner, acknowledgement
  - Things I Wish I Knew (§16) — feed chip
  - Case → Quiz and My Learning (§14) — `/learn/quiz`, per-specialty record
  - Uploaded images now render on feed cards and the case page, not only in
    the reel

## ⚠️ Blocking manual steps

Nothing below has been applied to the hosted Supabase project. Most recent
features are inert until it is — and since 0010, two of them **fail outright**
rather than degrading: the app writes clinical reaction values and a reply
label that the live schema still rejects. See "Telling inert from empty".

**1. Run `supabase/APPLY_TO_HOSTED.sql` in the Supabase SQL Editor.**

One paste, one Run. It is a re-runnable union of every migration the hosted
project is missing — 0005 (the `case-images` bucket; without it image upload
fails with "Bucket not found"), 0007 (DM tables), 0008 (everything
interactive), 0009 (reports/moderation), 0010 (clinical reactions), 0011
(comment labels), 0012 (Ask a Specialist), 0013 (moderation guard), 0014
(student mode) and 0015 (safety alerts) — and it ends by printing a 33-row
checklist that should read `ok` throughout.

`supabase/migrations/` stays the canonical ordered history; that file exists
only because the hosted project is applied by hand. Every statement in it is
guarded, so running it twice is a no-op rather than an error.

**2. Deploy the Edge Functions** (none are deployed; all return 404, which is
why case pages show "No AI recap yet"):

```bash
supabase secrets set ANTHROPIC_API_KEY=...
supabase functions deploy generate-recap
supabase functions deploy scan-identifiers
supabase functions deploy polish-text
```

After step 1, remove the pre-migration fallbacks — they exist only to survive
this window:
- `getCaseDetailByCaseNumber` in `src/lib/cases.ts` (falls back when the
  `case_questions` embed 400s)
- the `42703` retry in `createCaseAction` (`src/app/actions/case.ts`)

### Telling inert from empty

"Degrades gracefully" used to mean features returned `[]` and rendered as empty
— indistinguishable from a genuinely empty feature, which is how a
half-deployed feature goes unnoticed. `getFollowedCases` and `getNotifications`
now return `null` on a failed read, and their pages render
`UnavailableNotice` ("isn't switched on yet") instead of an empty state. If you
see that copy anywhere, step 1 hasn't been run.

## Testing

`./supabase/tests/run.sh` spins up a throwaway local Postgres, applies every
migration and runs every `*.test.sql` against it. Needs `postgresql-16`
locally. It does not touch the hosted project. Run it after any schema change.

`./supabase/tests/apply-file.sh` is the same idea aimed at the paste-file: it
rebuilds the hosted project's actual state (0001-0004 and 0006 only), applies
`APPLY_TO_HOSTED.sql` twice, and runs the same tests against the result — so
"the paste-file is complete and re-runnable" is asserted rather than assumed.
Run it after touching either that file or a migration.

**Both scripts exit non-zero when an assertion fails.** They did not always:
until recently the suite printed results and left reading them to a human,
which is exactly how a real moderation bypass shipped — 0009's "a member
cannot un-remove their own case" printed `visible` for a whole session before
anyone noticed (fixed in 0013).

Assertions go through `test.check` and `test.expect_error`
(`supabase/tests/00_assert.sql`), which record failures into `test.failures`
rather than raising. psql's own exit code is useless here: half these
assertions are "this write MUST FAIL", so `ON_ERROR_STOP` has to be off and
errors in the transcript are expected. Use `test.expect_error` for anything
the database should refuse — a dropped policy turns such a write into a silent
`INSERT 0 1`, which is the regression that hides best.

Five real bugs have come out of this suite, so it earns its keep: the
notification fan-out missing its case filter (would have notified every
follower on the platform), the interactive question embed arriving as an
object rather than an array, the takedown bypass above, and — within minutes
of the assertions landing — two in 0013's own guard: it blocked trusted
server-side writes, and `current_user` inside a `SECURITY DEFINER` function
reads as the owner, so the role check never fired at all.

To exercise DB-dependent features locally, the previous session ran the app
against local Postgres via PostgREST with a small proxy standing in for the
Supabase edge. Worth rebuilding if you're doing more schema work.

## What needs doing

Priorities 1 and 2 are complete, as is the reporting/moderation work. None of
it is visible on the hosted project until the SQL above is run.

### Priority 3 — what's left
Still unbuilt:

- **Case vs Case (§15)** — the `case_vs_case` post type and badge exist; the
  side-by-side comparison around them doesn't.
- **Clinical reasoning trees (§8)** — the largest remaining piece, and the
  least specified. Worth designing before building.
- **Global Case Exchange (§19)**
- **Reputation (§18)** — note that profile stats (§12) deliberately avoid a
  single score, for the reasons in `ProfileStats`. Reputation should be
  designed with that in mind rather than against it.
- **Analytics (§30)**

Explicitly descoped by the owner: AI "Explain This Case" (§13).

Done: Safety Alerts (§17), Things I Wish I Knew (§16), Case → Quiz and My
Learning (§14), and the admin/moderation half (0009 + 0013).

### First thing to eyeball after running the SQL
Every PostgREST read added this session — `getCaseComments`,
`getCaseSpecialistThreads`, `getOpenConsults`, `getLearnData` — is verified by
type and review only. This session had no Supabase credentials and no network
route to install a local PostgREST, so no embed here has met a live one. They
all return `null` rather than `[]` on failure and surface `UnavailableNotice`,
so a wrong foreign-key hint announces itself instead of rendering as an empty
thread. Load a case page, `/consults` and `/learn` straight after applying the
SQL and you'll know in a minute.

An earlier note flagged `getFollowedCases` (`src/lib/cases.ts`, the only
two-level embed in the codebase) and `getNotifications`
(`src/lib/notifications.ts`, two embeds off one table) for the same reason. A
later session confirmed both against a local PostgREST instance, so those two
are known good.

### Known gaps worth flagging
- Search and the feed still fetch every case and filter in JS. Correct at MVP
  scale, and every place that does it says where the tradeoff expires, but
  they all expire at the same moment and it will need doing in one go.
- The composer's identifier scan is a nudge, not a gate, by design. It now
  covers replies, specialist questions and specialist answers as well as cases.
- `is_specialist_in()` matches on free-text `profiles.specialty`. "Cardiology"
  and "cardiology" are handled; "Cardiology (interventional)" is a different
  specialty as far as it is concerned. A controlled vocabulary is a data
  migration on one column when it matters.

## Non-negotiables

- Patient privacy: no names, MRNs, exact DOBs, addresses, identifying photos.
  Every new post format must route its text through the identifier scan.
- Educational discussion, never patient-specific advice — label it in the UI.
- Don't ship an answer to the browser before the user commits. `is_correct` is
  hidden by **column privileges**, and anything passed from a Server Component
  to a Client Component is in view-source, so the reveal is fetched only
  against a recorded attempt.
- Additive schema changes only; existing rows and UI must keep working.
