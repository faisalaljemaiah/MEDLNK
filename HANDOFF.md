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

## ⚠️ Blocking manual steps

Nothing below has been applied to the hosted Supabase project. Most recent
features are inert until it is. The app degrades gracefully rather than
erroring, but the features simply won't appear.

**1. Run in the Supabase SQL Editor, in order:**

- `supabase/migrations/0005_storage.sql` — creates the missing `case-images`
  bucket. Image upload currently fails with "Bucket not found".
- `supabase/migrations/0007_messaging.sql` — DM tables. `/messages` shows an
  empty inbox until this runs.
- `supabase/migrations/0008_interactive_cases.sql` — everything interactive.

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

## Testing

`./supabase/tests/run.sh` spins up a throwaway local Postgres, applies every
migration and asserts the RLS/privilege behaviour (14 checks). Needs
`postgresql-16` locally. It does not touch the hosted project. Run it after any
schema change.

Two real bugs came out of local end-to-end testing last session, so it is worth
the effort: the notification fan-out was missing its case filter (would have
notified every follower on the platform), and the interactive question embed
arrives as an object rather than an array because of its unique constraint.

To exercise DB-dependent features locally, the previous session ran the app
against local Postgres via PostgREST with a small proxy standing in for the
Supabase edge. Worth rebuilding if you're doing more schema work.

## What needs doing

### Close out Priority 1
Small, and they're what make the shipped work visible:
- **Near Miss feed/filter** — the type exists and is badged, but there's no way
  to browse only near misses.
- **Following area** — `case_followers` is populated but nothing lists what you
  follow.
- **Notifications UI** — table and `fan_out_case_update()` exist; nothing
  surfaces them. Needs a bell/inbox and a read state.

### Priority 2 (from PLAN.md)
Ask a Specialist · clinical-value reactions (💡 Interesting, 🧠 Changed My
Thinking, ⚠️ Patient Safety) replacing bare likes · Student Mode + a `Learn`
nav tab · advanced search filters · profile contribution stats · structured
comment labels.

### Priority 3
Case → Quiz and My Learning · AI "Explain This Case" · clinical reasoning trees
· Case vs Case · Global Case Exchange · Safety Alerts · reputation ·
Things I Wish I Knew · analytics · expanded admin/moderation (reports, audit
logs, moderation states).

### Known gaps worth flagging
- `media_url` is only rendered in the reel. Feed cards and the case page ignore
  uploaded images entirely.
- No reporting/moderation infrastructure yet (spec §23/§29) — this matters for
  a clinical platform and is currently unbuilt.
- The composer's identifier scan is a nudge, not a gate, by design.

## Non-negotiables

- Patient privacy: no names, MRNs, exact DOBs, addresses, identifying photos.
  Every new post format must route its text through the identifier scan.
- Educational discussion, never patient-specific advice — label it in the UI.
- Don't ship an answer to the browser before the user commits. `is_correct` is
  hidden by **column privileges**, and anything passed from a Server Component
  to a Client Component is in view-source, so the reveal is fetched only
  against a recorded attempt.
- Additive schema changes only; existing rows and UI must keep working.
