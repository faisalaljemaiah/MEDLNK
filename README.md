# Asyashare

A mobile-first clinical knowledge network for verified medical professionals
(pharmacists first). Verified clinicians post short cases, near-misses, and
lessons; others react, save, and dive into the author's full write-up. An AI
layer summarizes cases, screens drafts for patient identifiers before they
post, and surfaces similar cases.

This is a real MVP, not a mockup — every screen reads and writes through
Supabase with Row Level Security. There is no mock data layer.

## Stack

| Layer       | Technology                                              |
| ----------- | -------------------------------------------------------- |
| Frontend    | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4    |
| Data / Auth | Supabase (Postgres, Auth, Row Level Security, Storage)    |
| AI          | Anthropic Claude, called only from Supabase Edge Functions |
| Deployment  | Vercel (frontend) + Supabase (backend), both free-tier    |

> **Note on Next.js 16**: Middleware was renamed **Proxy** — the session
> refresh logic that used to live in `middleware.ts` lives in `src/proxy.ts`
> here. If you're used to older Next.js docs, keep that in mind.

## What's built (v1 scope)

- **Auth**: sign up / sign in (Supabase Auth, email+password) and profile
  setup (name, handle, role, city, specialty, license number)
- **Reading mode**: a calm, vertically-scrolling feed of real cases
- **Reel mode**: full-screen swipe-up cases with double-tap-to-like; swipe
  left/right (or the Reel/Read pill) toggles between the two modes
- **Dive deep**: a bottom sheet with the author's full structured case
  (Presentation / What was tricky / What we did / The lesson), a cached AI
  recap, and a tag/specialty-based "similar cases" list
- **Compose**: verified-only case creation with an optional image upload to
  Supabase Storage, gated by an AI identifier-privacy check
- **Reactions & follow**: like / repost / save / follow, live counts, backed
  by RLS-protected tables
- **Profile tabs**: a clinician's own profile shows Posts / Liked / Saved,
  reusing their existing reactions rather than a separate table
- **Direct messages**: `/messages` — verified clinicians can message each
  other 1:1 from a profile's Message button; RLS restricts every
  conversation/message row to its two participants
- **Admin verification queue**: `/admin` (admin-only) lists pending sign-ups
  with Approve/Reject buttons — no automated license checking, you review
  manually
- **AI Edge Functions**: `generate-recap` (auto-summary + cache),
  `scan-identifiers` (patient-privacy nudge before posting) and
  `polish-text` (spelling/grammar/clarity suggestions in the composer) —
  Claude is never called from the browser, and the app works fine if AI is
  down

**Deliberately not built yet** (data model leaves room, per the brief):
video/live cases, a native app, payments.

## Project structure

```
src/
  app/
    (auth)/            sign up, sign in, profile setup — no nav chrome
    (app)/              everything behind the main nav: feed, compose, admin
    actions/            Server Actions (auth, profile, cases, reactions, admin, AI)
    theme.css           ALL color/font tokens — the one file to edit to re-skin
  components/           small, reused across reel + reading mode
  lib/
    supabase/           browser client, server client, proxy session-refresh helper
    database.types.ts   hand-written types mirroring the schema (see note below)
    cases.ts            feed/case data-fetching helpers
supabase/
  migrations/           schema + RLS, run in order
  functions/            Edge Functions (generate-recap, scan-identifiers, polish-text)
scripts/
  seed.ts               seeds ~6 realistic sample cases + verified authors
```

### A TypeScript gotcha worth knowing

`src/lib/database.types.ts` types must be `type` aliases, not `interface`s.
Only object-literal `type` aliases get TypeScript's implicit string index
signature, which `@supabase/supabase-js`'s generic table types
(`Record<string, unknown>`) require — an `interface` here silently breaks
`.insert()`/`.update()` typing (arguments resolve to `never`). If you ever
run `supabase gen types typescript` to regenerate this file, its output
already uses `type`, so this is only a trap for hand-edits.

## Design system (re-skin in one place)

Every color is a CSS variable in `src/app/theme.css`: `--bg`, `--surface`,
`--surface-2`, `--line`, `--text`, `--muted`, `--accent`, `--accent-2`,
`--positive`, `--warning`, `--danger`. Fonts are also variables there —
`--font-headline` (serif, headlines), `--font-body` (sans, everything else),
`--font-label` (mono, metadata/case numbers/tags) — wired up via
`next/font` in `src/app/layout.tsx`. Change the values in `theme.css` (and
swap the font imports in `layout.tsx` if needed) to re-skin the whole app;
components only ever reference the Tailwind utilities generated from these
tokens (`bg-surface`, `text-muted`, `font-headline`, etc.), never raw colors.

The logo (`src/components/logo.tsx`) is a placeholder ECG/pulse-line glyph in
a rounded square — swap the SVG there when you have a final mark.

## Setup

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com/dashboard). In the
SQL Editor, run every file in `supabase/migrations/` **in order** (0001 →
0007). If you use the [Supabase CLI](https://supabase.com/docs/guides/cli)
instead:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

This creates all six tables (`profiles`, `cases`, `reactions`, `comments`,
`follows`, `ai_recaps`), the `case-images` Storage bucket, every RLS policy,
and the triggers that auto-create a pending profile on sign-up, assign
`CASE-####` numbers, and stop users from self-approving their own
verification.

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
your project's Settings → API page. Also fill in
`SUPABASE_SERVICE_ROLE_KEY` (same page) — it's only used server-side by the
seed script, never bundled into the app.

### 3. Install & run

```bash
npm install
npm run dev
```

### 4. Seed sample data (optional but recommended)

```bash
npm run seed
```

Creates 6 verified pharmacist accounts and 6 realistic near-miss/lesson
cases so the feed isn't empty. Safe to re-run — it skips seeding if the
`cases` table already has rows.

### 5. Make yourself an admin

Sign up through the app (`/signup` → `/onboarding`), then in the Supabase
SQL editor:

```sql
update public.profiles set is_admin = true, verified = true, verification_status = 'approved'
where id = (select id from auth.users where email = 'you@example.com');
```

You can now approve/reject other sign-ups at `/admin`, and post cases
yourself.

### 6. Deploy the Edge Functions (for AI features)

```bash
supabase functions deploy generate-recap
supabase functions deploy scan-identifiers
supabase functions deploy polish-text
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

Both functions fail gracefully (the app keeps working, just without an AI
recap / privacy nudge) if this step is skipped or the key runs out — Claude
is only ever called from these functions, never from the browser.

## Deploying

1. This repo is already on GitHub — import it directly in Vercel as a
   Next.js project (repo root, no subdirectory).
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as
   Vercel environment variables (do **not** set the service role key or
   Anthropic key on Vercel — they belong only in Supabase).
3. In Supabase → Authentication → URL Configuration, add your Vercel domain
   as a Site URL / Redirect URL.

## Cost & scale notes (flagged as called out in the brief)

- **AI model choice**: both Edge Functions use `claude-haiku-4-5` — cheap
  and fast, appropriate for a short per-case summary/scan. Revisit if recap
  quality needs improving.
- **AI call frequency**: one `generate-recap` call per case posted (cached
  in `ai_recaps` permanently — never re-called for the same case) and one
  `scan-identifiers` call per compose submission attempt, and one
  `polish-text` call each time an author asks the composer to check their
  writing (user-initiated, so it scales with intent rather than traffic).
- **Reaction/comment counts**: computed by fetching all reaction/comment
  rows for the visible cases and aggregating in JS (`src/lib/cases.ts`).
  Fine at MVP scale; once reaction volume grows, replace with a Postgres
  view or RPC that returns pre-aggregated counts instead.
- **Similar cases**: naive tag/specialty overlap scoring computed live on
  every dive-deep open (`src/app/actions/recap.ts`), capped to the 50 most
  recent cases as candidates. The seam to swap in an embeddings similarity
  search later is isolated to that one function.
- **Images**: uploaded as-is to Storage with no resizing/compression yet —
  fine for a handful of images, worth adding a resize step before this
  becomes a real cost/bandwidth line item.
