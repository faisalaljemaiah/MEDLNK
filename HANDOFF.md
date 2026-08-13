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
- **Priority 3, complete**:
  - Safety Alerts (§17) — platform-wide broadcast, banner, acknowledgement
  - Things I Wish I Knew (§16) — feed chip
  - Case → Quiz and My Learning (§14) — `/learn/quiz`, per-specialty record
  - Case vs Case (§15) — two real cases side by side, plus what separates them
  - Uploaded images now render on feed cards and the case page, not only in
    the reel
  - Clinical Reasoning Trees (§8) — author-only branching findings /
    differentials / actions / conclusion, added post-publish on the case page
    (`case_reasoning_nodes`, 0017)
  - Global Case Exchange (§19) — optional country on a case (two-letter code,
    never a hospital or unit), `/exchange` to browse by country
  - Reputation (§18) — `computeReputationTier()` derives a tier label from the
    same `ContributionStats` ProfileStats already shows; no new schema,
    follower count is not an input. The raw `computeReputationScore()` number
    is shown in exactly one place (the Home dashboard, to the viewer about
    themselves) — every other view of a person's standing stays tier-only.
    See `src/lib/reputation.ts` for why the split.
  - Analytics (§30) — `/analytics` (personal contribution trend, own reaction
    breakdown, top case) and an Analytics tab on `/admin` (platform totals,
    cases by format)
- **Home page redesign** — visual/UX pass on `/` only, no schema change, no
  new routes besides what quick-create already needed. See below.

Explicitly descoped by the owner: AI "Explain This Case" (§13) — the owner
chose not to deploy the Anthropic-backed Edge Functions at all (see below), so
this was never built rather than built-and-inert.

### Home page redesign

Scope was explicit: redesign `/` only, keep every other route/nav/table
untouched, real data only. What that produced:

- **Color**: `--accent` in `theme.css` moved from LinkedIn-ish blue (`#2563eb`)
  to a Caribbean-green/turquoise (`#0f766e`) — the one global change, since
  that file is the app's single re-skin point and "no LinkedIn blue" was
  explicit. Chosen specifically because the lighter, more "turquoise" end of
  that hue (e.g. `#0d9488`) fails 4.5:1 with white button text; `#0f766e`
  passes in both directions and stays visually distinct from `--positive`'s
  greener green. Recheck both if this gets tuned again.
- **New, real widgets on `/`**: greeting, four stat cards (reputation score,
  connections, cases shared, communities), a quick-create panel wired to
  existing `/compose?type=…` and `/consults` (compose now reads `?type=` to
  preselect — the only change outside the Home page itself), a For You /
  Following(people) / Trending tab row above the existing chip row, weekly
  activity ring, trending communities (specialty activity, not a fabricated
  communities table), active discussions, and a recommended-people row.
  All of it is real: `src/lib/home.ts` and the new functions in
  `src/lib/cases.ts` (`getCasesByFollowedPeople`, `getTrendingCases`,
  `getActiveDiscussions`) compute everything from existing tables. Nothing new
  in the database.
- **Deliberately not built**, because building them would have meant either
  fabricating data or a fake destination: a "MEDLNK Pro" upsell (no paid tier
  exists — this would have been a card promoting a product that isn't real),
  fake "Shortcuts" (Job Board, Research Hub, etc. — none exist; the composer's
  quick-create panel is the honest version of this idea), and an "Upcoming
  Events" widget (no events feature/table — Active Discussions fills the same
  "what's happening now" slot with real data instead).
  A persistent desktop left-sidebar/right-rail app shell was also skipped:
  that structurally belongs in `(app)/layout.tsx`, which wraps every route,
  and the brief was explicit about not touching shared navigation. Everything
  landed inside `/` itself instead — the page is wider and richer on desktop,
  but doesn't introduce a second app shell.
- **Naming collision fixed in passing**: the new people-based "Following" tab
  and the pre-existing case-follow "Following" chip meant the same word for
  two different things right next to each other. The chip is now labelled
  "Cases I follow" (`src/lib/feed-filters.ts`) — text-only, no behavior
  change.
- **Bug found and fixed from earlier this session**: the profile page's
  Messages/Consults/Analytics/Learn/Sign out row (the Analytics link was
  added earlier this session) overflowed horizontally on a 390px viewport —
  confirmed via `document.documentElement.scrollWidth` in a real headless
  browser, not just eyeballed. Fixed by letting that row wrap
  (`src/app/(app)/u/[handle]/page.tsx`).
- Verified against the real hosted project, signed in as a seeded user, via
  a temporary `MEDLNK_LOCAL_VIEWER` env-var stub in `getViewer()` — added,
  used to screenshot every new section with real data, then fully reverted
  before committing (`git diff src/lib/auth.ts` is empty). Same pattern a
  prior session used and documented; do the same if you need to visually
  verify a signed-in view without real login credentials.

## ⚠️ Blocking manual steps

**Update, this session:** the owner ran `supabase/APPLY_TO_HOSTED.sql`
against the real hosted project and confirmed all 34 checklist rows read
`ok` — 0005 through 0016 are live. 0017 (Clinical Reasoning Trees + Global
Case Exchange) landed *after* that run and adds two new checklist rows
(`column: cases.country_code`, `table: case_reasoning_nodes`); **the file
needs re-pasting once more** to pick those up. Re-running it is a no-op for
everything already applied — verified twice by `apply-file.sh` before this
was pushed.

The owner also explicitly declined to deploy the Edge Functions ("I don't
want to buy it" — they require Anthropic billing). That is an accepted,
intentional gap, not a blocker: every call site treats the AI functions as
best-effort and degrades to "No AI recap yet" / no writing-check suggestions
/ no identifier-scan nudge. AI "Explain This Case" (§13) was never built for
the same reason. Don't chase this unless the owner changes their mind.

**Run `supabase/APPLY_TO_HOSTED.sql` in the Supabase SQL Editor** to pick up
0017. One paste, one Run — it is a re-runnable union of every migration the
hosted project might be missing, ending in a checklist that should read `ok`
throughout (36 rows as of 0017).

`supabase/migrations/` stays the canonical ordered history; that file exists
only because the hosted project is applied by hand. Every statement in it is
guarded, so running it twice is a no-op rather than an error.

Once 0017 is confirmed applied, the `42703` fallback tiers in
`createCaseAction` (`src/app/actions/case.ts`) can be collapsed to a single
insert — they exist only to survive a partially-migrated project.

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

Six real bugs have come out of this suite, so it earns its keep: the
notification fan-out missing its case filter (would have notified every
follower on the platform), the interactive question embed arriving as an
object rather than an array, the takedown bypass above, two in 0013's own
guard (it blocked trusted server-side writes, and `current_user` inside a
`SECURITY DEFINER` function reads as the owner, so the role check never fired
at all), and 0017's reasoning-tree insert policy: an unqualified `parent_id`/
`case_id` inside a self-join (`case_reasoning_nodes p`) resolved to `p`'s own
columns rather than the row being inserted, which silently rejected every
non-root node. Caught by `0017.4` before that migration was ever pushed.

To exercise DB-dependent features locally, the previous session ran the app
against local Postgres via PostgREST with a small proxy standing in for the
Supabase edge. Worth rebuilding if you're doing more schema work.

## What needs doing

Priorities 1, 2 and 3 are all complete, as is the reporting/moderation work.
The spec's build-order list has nothing left unbuilt except the explicitly
descoped item below. None of the 0017-and-earlier work is visible on the
hosted project until the SQL above is (re-)run.

Explicitly descoped by the owner: AI "Explain This Case" (§13) — the owner
chose not to deploy the Anthropic Edge Functions at all, so this was never
built. See "⚠️ Blocking manual steps".

Everything else from the spec's Priority 1/2/3 list is done:
- Priority 1: What Would You Do?, Blind Cases, Case Evolution, Near Miss,
  Follow Case
- Priority 2: Ask a Specialist, clinical-value reactions, Student Mode,
  Advanced Search, improved profiles
- Priority 3: Safety Alerts, Things I Wish I Knew, Case → Quiz/My Learning,
  Case vs Case, Clinical Reasoning Trees, Global Case Exchange, Reputation,
  Analytics
- Reporting/moderation (0009 + 0013)

### If there's a next thing to build
It's outside the original 33-section spec now. Worth going back to the owner
for direction rather than picking the next thing unprompted — options include
polishing what exists (search/feed still fetch-then-filter in JS, noted
below), mobile QA against the live hosted project once 0017 is applied, or a
genuinely new feature the owner hasn't asked for yet.

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
- Reasoning tree nodes have no edit/delete/reorder UI once added — only
  cascade-delete with the case. Fine for v1 (author-authored, append-only,
  same posture as Case Evolution's timeline); revisit if authors want to
  correct a branch after the fact.
- `src/lib/countries.ts` is a curated ~50-country list, not the full ISO 3166
  set. Extend the array directly; nothing else needs to change.

## Non-negotiables

- Patient privacy: no names, MRNs, exact DOBs, addresses, identifying photos.
  Every new post format must route its text through the identifier scan.
- Educational discussion, never patient-specific advice — label it in the UI.
- Don't ship an answer to the browser before the user commits. `is_correct` is
  hidden by **column privileges**, and anything passed from a Server Component
  to a Client Component is in view-source, so the reveal is fetched only
  against a recorded attempt.
- Additive schema changes only; existing rows and UI must keep working.
