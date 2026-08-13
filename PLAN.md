# MEDLNK upgrade — technical implementation plan

Written after inspecting the existing codebase. Nothing here proposes a
rewrite: every feature below hangs off the current architecture, schema and
design tokens.

## 1. What exists today

| Layer | Current state |
| --- | --- |
| Framework | Next.js 16 App Router. Server Components fetch, Server Actions mutate. No client-side data fetching anywhere — keep it that way. |
| Data | Supabase Postgres. Tables: `profiles`, `cases`, `reactions`, `comments`, `follows`, `ai_recaps`, `conversations`, `messages`. |
| Auth | Supabase Auth. `getViewer()` verifies the JWT locally (ES256) and is memoised per request; Server Actions use `getUser()` so writes hit the Auth server. |
| Access control | RLS on every table. Writes are gated on `public.is_verified()` — a security-definer function reading `profiles.verified`. |
| Types | `src/lib/database.types.ts` is hand-written and must be updated in lockstep with every migration. Must stay `type` aliases, not interfaces. |
| Case reads | `getFeedCases` / `getCaseById` pull the case plus author, reactions and comments as PostgREST embeds in **one** round trip. Supabase is ~260ms away, so round-trip count is the performance budget. |
| Styling | Every colour is a token in `src/app/theme.css`. Components reference generated utilities (`bg-surface`, `text-muted`), never raw hex. |
| Navigation | Fixed bottom pill: Home, Reel, Create, Search, Profile. Top header with logo + messages. |
| AI | Edge Functions only (`generate-recap`, `scan-identifiers`, `polish-text`). The Anthropic key never reaches the browser. All calls are best-effort and must never block. |

### Blockers that gate this work

1. **Migrations `0005_storage.sql` and `0007_messaging.sql` are not applied** to
   the live project, and **no Edge Function is deployed**. Everything below that
   needs a table will stay inert until the SQL is run.
2. I cannot apply migrations from here — there is no Postgres connection string
   and no `exec_sql` RPC. Mitigation: a local Postgres 16 with stubbed
   `auth`/`storage` schemas, against which every migration is applied and
   exercised before commit. That validates SQL, RLS and functions, but the live
   project still needs the files run by hand.

## 2. Design rules carried into every feature

- **The answer never reaches the client early.** For interactive cases,
  `is_correct` must not be readable by the browser before the user submits.
  Enforced with column-level `GRANT`s plus a security-definer grading function,
  not by hiding it in the UI.
- **Educational, not advisory.** Interactive cases and AI output carry explicit
  framing that they are educational discussion, not patient-specific advice.
- **De-identification stays first-class.** The composer warning and the
  `scan-identifiers` gate apply to every new post type, not just clinical cases.
- **Round trips are the budget.** New reads join the existing embedded query
  rather than adding sequential ones.
- **Additive schema only.** New columns are nullable or defaulted so existing
  rows and the current UI keep working untouched.

## 3. Schema plan

Migration `0008_interactive_cases.sql` (Priority 1):

| Object | Purpose |
| --- | --- |
| `cases.case_type` | Enum-checked text, defaults `clinical_case` so every existing row stays valid. Drives composer fields, feed badges and filters. |
| `cases.near_miss` | `jsonb` for the five Near Miss prompts. Sparse structured data, so jsonb beats five mostly-null columns. |
| `cases.reveal_mode` | `none` / `staged` — Blind Cases. |
| `case_questions` | One question per case in v1 (`unique (case_id)`), with explanation, reasoning, references, `allow_change`. |
| `case_options` | Choices with `is_correct`. Column-level grants hide `is_correct` from clients. |
| `case_attempts` | One attempt per user per question. Powers distribution, personal history and later the quiz engine. |
| `case_updates` | Case Evolution timeline entries, ordered by `position`. |
| `case_followers` | Follow Case. |
| `notifications` | Generic, typed, indexed on `(user_id, created_at desc)`. Serves follow-case now and §24 later. |

Later migrations, deliberately deferred so P1 stays reviewable:
`case_reactions` (§9 clinical value), `specialist_answers` (§10),
`reports` + moderation states (§23/§29), `quiz_questions`/`quiz_attempts` (§14),
`reputation_events` (§18), `learning_progress` (§11/§14).

## 4. Phasing

**Priority 1 — the core loop.** This is the product identity in §33:
see case → answer → compare → reveal → follow.

1. `0008` schema + types.
2. Post types + Near Miss fields in the composer; badges and a Near Miss filter
   in the feed. (§5, §22)
3. What Would You Do? — authoring, answer gate, distribution, reveal. (§2)
4. Case Evolution timeline + Follow Case + update notifications. (§4, §7, §24 partial)
5. Blind Cases staged reveal. (§3)

**Priority 2 — community and discovery.** Ask a Specialist (§10), clinical-value
reactions (§9), Student Mode + `Learn` nav tab (§11, §26), advanced search
filters (§20), profile contribution stats (§12), structured comment labels (§25).

**Priority 3 — depth.** Case → Quiz and My Learning (§14), AI Explain This Case
(§13, extends the existing Edge Function pattern), reasoning trees (§8),
Case vs Case (§15), Global Case Exchange (§19), Safety Alerts (§17),
reputation (§18), Things I Wish I Knew (§16), analytics (§30), expanded
admin/moderation (§29).

Home feed redesign (§21) lands incrementally as the pieces it surfaces appear,
rather than as one speculative rewrite.

## 5. Verification per increment

Run the app, then check: the flow itself, mobile width, signed-out and
unverified states, RLS (a second account must not read or write what it
shouldn't), empty states, loading states, and that existing flows still pass.
