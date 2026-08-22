# MEDLNK — handoff

State of the project as of the last session. Read this plus `PLAN.md` before
picking work up.

## 🔴 URGENT — apply supabase/URGENT_SECURITY_FIX.sql before anything else

A security review this session found a real, live privilege-escalation hole
on the hosted project: `profiles_update_own` (0004) grants UPDATE on the
*row*, with no column restriction, so any signed-in member could PATCH their
own profile with `is_admin: true`, `verified: true`, or `suspended_at: null`
and grant themselves admin / self-approve verification / clear their own
suspension — via a plain authenticated REST call, no special access needed.
This is fixed in code (migrations 0018-0020, all covered by
`supabase/tests/`) but **the hosted project needs the SQL run** —
`supabase/URGENT_SECURITY_FIX.sql` is the fast path (seconds, standalone);
`supabase/APPLY_TO_HOSTED.sql` has the same fix bundled in with everything
else if you're running that anyway. Full writeup: "Security review" section
below.

Separately, **not urgent but blocking a feature**: `supabase/APPLY_TO_HOSTED.sql`
now also has migration 0022 (Photo/Quote/Video post formats) bundled in.
Until it's run, picking "Photo", "Quote" or "Video" in the composer and
posting fails with a normal, non-crashing form error (confirmed — see
"Photo / Quote / Video post formats" below) rather than doing anything
silently wrong, but the three new formats won't actually work until this is
applied.

Same story for migration 0023 (the "Other" reply label): picking it in the
"What kind of reply is this?" picker and submitting fails with a clear
"needs a database update" error (confirmed) until `APPLY_TO_HOSTED.sql` is
run — the other five labels are unaffected.

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

### Localization: a real language preference, Arabic as the first one

Owner's ask: remove the header notification bell, add a Settings page, and
"put Arabic for now for testing." What landed (0021):

- `profiles.locale` (`en` | `ar`), same footing as `student_mode` — a
  preference, not privileged, no guard needed (unlike the five columns 0018
  guards). `/settings` has a language switcher
  (`src/components/language-switcher.tsx`) that writes it via
  `setLocaleAction`.
- Root layout (`src/app/layout.tsx`) sets `<html lang dir>` from the
  viewer's locale, so `ar` gets real RTL layout, not just translated text.
  This makes the root layout do a per-request profile read, which costs
  `/login`, `/signup` and `/_not-found` their static prerendering (everything
  else in the app was already dynamic) — a real, small tradeoff for
  app-wide RTL, judged worth it.
- **Bounded translation, not full app coverage**: `src/lib/i18n.ts` has a
  flat `t(locale, key)` dictionary covering Home's chrome (greeting, stat
  cards, quick-create, tabs, weekly activity, trending communities, active
  discussions, recommended people) and the Settings page itself. Case
  write-ups, comments, admin tooling, and most other pages stay English
  regardless of locale — translating user-generated clinical content is a
  different, much larger project than proving the mechanism works, which is
  what this was scoped to do. Extend the dictionary and add `locale` props
  to translate more surface as it's asked for; the plumbing (RLS-safe
  preference, RTL layout, fallback-to-English-on-missing-key) is all there.
- Numbers/counts with real plural forms (follower counts, reply counts,
  member counts) were deliberately left in English — Arabic plurals have
  dual/few/many forms a naive singular/plural swap gets wrong in a way that
  reads as more broken than just not translating the number.
- One real bug the RTL pass caught: untranslated English chip labels
  (`FeedFilterBar`) picked up the Unicode bidi algorithm's reordering inside
  an RTL page — "What would you do?" rendered as "؟What would you do".
  Fixed with `dir="ltr"` on each chip link, which fixes the text without
  touching the row's own (correct, wanted) RTL ordering.
- Bell removal: `TopHeader` dropped the bell/unread-dot entirely (no
  replacement badge anywhere yet) and gained a settings gear in its place;
  `(app)/layout.tsx` no longer fetches an unread count. Notifications is
  still a fully working route, reachable from `/settings` and from the
  profile page's quick-links row — just not surfaced with a badge. If that's
  wanted back, the natural place is probably a dot on the gear or on the
  profile avatar, not reintroducing the bell.
- Verified the same way as the Home redesign: a temporary
  `MEDLNK_LOCAL_LOCALE_OVERRIDE` env var (alongside `MEDLNK_LOCAL_VIEWER`) in
  `layout.tsx`/`page.tsx`/`settings/page.tsx`, screenshotted in Arabic
  against real hosted-project data, then fully reverted — same
  `git diff`-is-empty discipline as always. The hosted project doesn't have
  `profiles.locale` yet at the time of writing, so this was the only way to
  see the real RTL render before the SQL is applied.

### Welcome screen + auth pages redesign

Owner's ask: a welcome animation, "before" the sign-up/login pages. No
schema, no new tables — purely `(auth)` route group and two new CSS
keyframes (`animate-welcome-logo`, `animate-welcome-rise` — deliberately
longer/more of a flourish than the existing `animate-enter`, since that one
is on the routine-navigation path and this isn't; both respect the app's
existing global `prefers-reduced-motion` override).

- New `/welcome` (`src/app/(auth)/welcome/page.tsx`): logo scale-in, then
  tagline and the two CTAs ("Create account", "Sign in") rise in staggered.
  Deliberately not a gate: a "Browse without an account →" link keeps the
  existing signed-out feed-browsing (RLS already lets `anon` read cases)
  exactly as reachable as either form — the point was to add a nicer front
  door, not to require an account to see anything.
- New `src/app/(auth)/layout.tsx`: a shared soft green gradient wash behind
  welcome/login/signup/onboarding, same treatment as the Home hero.
- `/login` and `/signup` got the same entrance animation and a logo that
  links back to `/welcome`, otherwise unchanged — same Server Actions, same
  fields, same validation.
- The two *primary* signed-out entry points — `TopHeader`'s settings/
  messages icons and `BottomNav`'s profile avatar — now go to `/welcome`
  instead of straight to `/login`. Left everything else (the dozen or so
  page-level `if (!user) redirect("/login")` guards, and the contextual
  "Sign in to join the discussion" prompt on a case) pointed straight at
  `/login` — those are already intent-clear moments, and routing every one
  of them through `/welcome` would be a much bigger sweep for no real
  benefit.

### Bug fix: HEIC photos rejected on upload

Reported as "I tried to post something and it couldn't." Root-caused by
reproducing it end-to-end with Playwright (real login, real compose form,
a real HEIC file attached) before touching any code: the 0020 upload
hardening earlier this session added `validateImageUpload()`
(`src/lib/uploads.ts`), which allowlists JPEG/PNG/WebP/GIF only. HEIC —
the default photo format on iPhone since iOS 11 — isn't in that list, so
any photo picked straight from an iPhone's library was silently rejected
with "Images only — JPEG, PNG, WebP or GIF." The allowlist itself is
correct (HEIC isn't broadly displayable in non-Safari browsers, so
accepting it as-is would trade a clear rejection for a broken image most
readers would see); the fix converts it before it ever reaches that check.

- New `src/lib/heic.ts`: `toUploadableImage(file)` — detects HEIC/HEIF by
  sniffing the file's actual container bytes (via `heic-to`'s `isHeic`,
  not the browser-reported MIME type, which iOS gets right but shouldn't
  be trusted for anything since it's just client-supplied metadata) and,
  if so, decodes and re-encodes it to JPEG client-side (wasm decode, canvas
  re-encode — no server-side dependency, so no serverless/build-size cost).
  Non-HEIC files pass through untouched.
- Wired into both file inputs that exist in the app —
  `compose-form.tsx` (case photo) and `onboarding-form.tsx` (avatar) — via
  an `onChange` handler that replaces the `<input>`'s `FileList` with the
  converted file through `DataTransfer`, so the existing native-form-action
  submit path picks it up with no other change. A "Converting photo…" note
  shows during the (sub-second to a few seconds, depending on photo size)
  conversion, and `SubmitButton` gained a `disabled` prop so submit can't
  fire on the original un-converted file mid-conversion.
- If conversion throws (corrupt file, unsupported HEIC variant), it falls
  back to the original file untouched — same clear rejection message as
  before, never a silent failure.
- Verified against the real hosted DB, not just locally: logged in as a
  throwaway test account, attached a real HEIC fixture (a known-good
  `ftyp mif1` file, not just a mislabeled JPEG) through the actual compose
  form, confirmed the post succeeded, then downloaded the stored file
  straight from Supabase Storage and confirmed with `file`/`identify` that
  it's a genuine, valid 1440×960 JPEG — not just an accepted-but-broken
  upload. All diagnostic artifacts (the test post, its storage object, the
  throwaway auth user and profile row) were deleted from the hosted
  project afterward.

### Chrome pass: real icons instead of emoji, feed glide transitions

Prompted by direct feedback that the app read as generically AI-generated
rather than something a product team designed. The clearest tell was
decorative emoji standing in for icons — a 👋 next to "People You May
Know", 📈 on the activity card, 🎯 on the personalized note, colorful emoji
on every quick-create tile — plus a leftover teal-to-purple gradient on
the Reel loading skeleton (the same generic-gradient look already fixed
on the real Reel card earlier this session, just missed on its loading
state). Fixed both, and added the transitions that make tab-switching feel
like one continuous view instead of a hard cut.

- `src/components/icons.tsx` gained matching outline icons — `StarIcon`,
  `UsersIcon`, `ClipboardIcon`, `GlobeIcon`, `TrendingUpIcon`,
  `UserPlusIcon`, `SparkleIcon`, `AlertTriangleIcon`, `TargetIcon`,
  `CompassIcon`, `FilePlusIcon`, `QuestionIcon`, `BoltIcon`, `FileIcon` —
  same 24×24, 2px-stroke, round-cap style as the existing set, so nothing
  new stands out as a different icon language.
- Every decorative emoji chip is now one of those icons: stat cards,
  quick-create tiles, trending communities, weekly activity, active
  discussions, recommended people, the "Personalized for X" note, the
  Global Case Exchange link, the safety alert banner, and the AI
  spelling-check button. The greeting's wave emoji was dropped rather than
  replaced — "Good afternoon, Diag" reads cleaner without it. Left alone
  on purpose: the ✓ verified checkmark (a plain, near-universal glyph, not
  decorative chrome) and the 💡/🧠/⚠️ clinical-value reactions — those are
  the app's actual, designed reaction system, not placeholder icons, and
  documented as such earlier in this file.
- `src/app/(app)/reel/loading.tsx`: the loading skeleton's
  `from-accent to-accent-2` gradient (teal-to-purple) is now a flat
  `border-line`/`bg-surface` card, matching what the real Reel card
  (`reel-slide.tsx`) already looks like since the earlier "remove the
  colour in the background" fix — the skeleton had just never been
  updated to match.
- Feed "glide": the Home feed content (case list under the For You /
  Following / Trending tabs, and under each filter chip) is now wrapped in
  React's `<ViewTransition>` (`src/app/(app)/page.tsx`), keyed on
  `${view}-${filter.key}` — switching tabs or chips crossfades the list
  instead of popping between renders, following the "same-route crossfade"
  pattern from Next.js 16's view-transitions guide
  (`node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`,
  read before writing any of this per this repo's AGENTS.md). The active
  tab's underline (`src/components/home/feed-tabs.tsx`) is named
  `tab-underline` so the browser morphs it from the old tab to the new one
  instead of re-painting it in place. Both are React's native browser
  View Transitions integration — no animation library added, and where a
  browser doesn't support the View Transitions API, both degrade to the
  same instant swap that existed before, so nothing regresses there.
  Deliberately did not touch the underlying navigation architecture
  (`HomeFeedTabs`/`FeedFilterBar` stay real `<Link>`s to real URLs, per
  their existing documented reasoning) — the transition layers on top of
  that, it doesn't replace it.
- Verified visually against the real hosted DB (throwaway verified test
  account, cleaned up after): Home top/mid, the Trending tab, the compose
  form's spelling-check button, the search page's Exchange link, and the
  Reel page all screenshotted and checked icon-by-icon; `tsc`/lint/build
  all clean.

### Photo / Quote / Video post formats

Three lightweight formats alongside the structured clinical case — requested
directly: keep the case format, add a plain photo post, a quote/saying, and
a short video. All three are `cases` rows with a new `case_type`, same as
every other format (What Would You Do?, Near Miss, etc.) — no new table.

- `supabase/migrations/0022_photo_quote_video_posts.sql`: widens the
  `cases_case_type_check` constraint (drop + recreate, same pattern as every
  other constraint change this session) to add `photo_post`, `quote_post`,
  `video_post`; adds a **new** `case-videos` storage bucket (50 MiB,
  `video/mp4`/`webm`/`quicktime` only) with the same read-all /
  insert-verified-own-folder / delete-own-folder RLS shape as `case-images`
  (0005). `case-images` itself is untouched — photo and quote posts reuse it
  and the existing `media_url` column exactly as clinical-case photos
  already did; video is the only format that needed new storage
  infrastructure, since it's the first non-image media type. Bundled into
  `supabase/APPLY_TO_HOSTED.sql` (checklist now 41 rows,
  `supabase/tests/apply-file.sh` confirms it applies cleanly twice from the
  hosted project's actual current state and leaves the same schema the
  migration would); **not yet applied to the hosted project** — see the
  banner at the top of this file.
- `src/lib/case-types.ts`: three new `CASE_TYPES` entries — `photo_post`
  (`requiresImage: true`), `quote_post` (`isQuote: true`, renders
  `short_caption` as a pulled quote instead of a plain caption), `video_post`
  (`requiresVideo: true`). All three `shortForm: true`, same as `saw_this_today`
  — no full clinical write-up demanded. Nothing else needed to make them
  show up in the composer's post-type picker or the feed's badges/filters:
  both are already data-driven off `CASE_TYPES`, the one-line comment on
  that file said as much before this session touched it.
- `src/lib/uploads.ts`: `validateVideoUpload` — same shape as
  `validateImageUpload` (0020), checked-MIME-type allowlist, 50MB cap. Same
  "app check is the friendly half, the bucket config is what actually holds"
  split.
- `src/lib/media.ts` (new): `isVideoUrl(url)` — sniffs the extension (`.mp4`/
  `.webm`/`.mov`), which is safe to trust here specifically because it's
  always assigned server-side from the checked MIME type
  (`validateVideoUpload`/`validateImageUpload`'s `ext`), never from anything
  client-supplied. Used at all three places `media_url` renders
  (`case-card.tsx`, the case detail page, `reel-slide.tsx`) to pick
  `<video>` vs `next/image`.
- `src/app/actions/case.ts`: branches the upload path on
  `typeMeta.requiresVideo` (→ `case-videos` bucket) vs the existing image
  path (→ `case-images`), and returns a plain `{ error }` — not a crash —
  if a format that requires media doesn't have it, or if the upload itself
  fails (e.g. the bucket not existing yet on a hosted project that hasn't
  had 0022 applied — confirmed this produces "Video upload failed: Bucket
  not found" on the compose form, not a server error).
- `src/components/compose-form.tsx`: the media field swaps between the
  image input and a video input based on `typeMeta.requiresVideo`
  (mutually exclusive — a post is never both), gets `required` when its
  format demands it, and the title/caption placeholders and labels adapt
  for quote posts ("The quote", with a real placeholder quote rather than
  generic caption copy).
- Render sites (`case-card.tsx`, the case detail page): a video renders as
  a plain `<video controls>` rather than being wrapped in the same `<Link>`
  an image is — a Link around a video would fight its own controls for
  every tap. A quote post's `short_caption` renders as a pulled quote
  (larger, italic, left border) instead of the plain muted caption text
  everywhere else uses. `reel-slide.tsx`'s video plays `autoPlay muted loop`
  with no controls, matching how a photo already behaves there (ambient
  background media under the reaction UI, not something with its own
  transport controls) — the tap-catcher overlay that handles double-tap
  reactions stays exactly as it was.
- **Found and fixed a real, pre-existing latent bug while building this**:
  Next.js Server Actions cap the request body at 1MB by default
  (`experimental.serverActions.bodySizeLimit`, undocumented default, never
  configured in this project). That silently broke every image upload over
  ~1MB — well within `validateImageUpload`'s advertised 8MB — with a raw
  "Body exceeded 1 MB limit" crash screen instead of a form error, and would
  have made the 50MB video cap essentially fictional. Caught by testing the
  video upload with a real ~1.1MB sample clip and watching it crash instead
  of hit `validateVideoUpload`. Fixed in `next.config.ts`
  (`bodySizeLimit: "52mb"`, sized to clear the video cap with multipart
  overhead room). This was already broken for ordinary case/avatar photo
  uploads before this session touched anything — worth mentioning to
  whoever posted a photo that silently failed in the past and assumed it
  was something else.
- Verified against the real hosted DB (throwaway verified test account,
  cleaned up after): all three post-type pills render with the right
  field changes (Photo requires an image and blocks client-side without
  one — confirmed via the browser's native validation message, not just
  visually; Quote shows the quote-styled caption field; Video shows the
  file input and 50MB hint); a real ~1.1MB MP4 was attached and submitted
  end-to-end through the actual compose form, past the body-size fix,
  through `validateVideoUpload`, and cleanly rejected with the expected
  "Bucket not found" message (proving both the fix and the pre-migration
  failure mode are exactly what's described above, not a guess); the home
  feed was reloaded afterward to confirm the `case-card.tsx` changes don't
  regress rendering existing image posts. Local Postgres suite
  (`supabase/tests/0022_photo_quote_video_posts.test.sql`, 6 assertions)
  and `apply-file.sh` both pass; `tsc`/lint/build clean.

### AI "thinking" glow

Requested by name ("like the one on Gemini") — a rotating, blurred
multi-hue halo behind an AI-touched control, scoped to the one AI feature
in the app (the compose form's "Check spelling & clarity" button) rather
than as general chrome, and built from MEDLNK's own colors rather than
Gemini's actual blue/red/yellow/green: Caribbean green (`--accent`), a
clean blue, and orange — three new `--ai-hue-*` tokens in `theme.css`,
explicitly called out as decorative-only and exempt from the 4.5:1
contrast rule the rest of the palette is held to, since nothing renders
text or a background in them.

- `globals.css`: `.ai-glow` wraps a control in a `position: relative`
  span; its `::before` is a `conic-gradient` through the three hues,
  blurred and rotated via a `medlnk-ai-spin` keyframe. Idle state cycles
  slowly (6s) at low opacity as a standing "this is AI-powered" cue;
  `.ai-glow-active` (applied while `isPolishing` is true — the same
  `useTransition` pending state that already disables the button and
  swaps its label to "Checking…") speeds the rotation to 1.6s and turns
  the opacity up, mirroring how Gemini's own glow intensifies while it's
  actually working rather than being a static decoration.
  `prefers-reduced-motion: reduce` already freezes all animation
  durations app-wide (existing rule, untouched), so this respects it for
  free.
- Verified visually (throwaway test account): the idle glow renders
  correctly as a soft green/blue/orange halo around the button. Confirming
  the intensified `.ai-glow-active` state on camera turned out to need the
  "polish-text" edge function to actually be slow — in this environment it
  fails near-instantly ("Couldn't reach the writing assistant"), so the
  transition completes faster than a screenshot could catch it; the code
  path itself is a plain `clsx` conditional on the exact same `isPolishing`
  boolean already proven to work for the button's disabled/label state, so
  this is a low-risk, mechanically-verified gap rather than an untested one.

### Motion design system

Requested as a full "premium motion & visual design upgrade" spec (16
numbered sections — AI gradient language, an ambient "pulse," staggered
dashboard entrance, per-surface hover choreography, a sliding nav pill, a
restructured compose page, a network motif, a formal motion-timing system,
reduced-motion coverage). Implemented the foundation and every surface with
real, verified user-visible impact; deliberately scoped down a few
lower-value asks rather than spreading thin across all sixteen — see "Not
done" below.

**Motion tokens** (`theme.css`): `--motion-micro/normal/page/ambient` and
`--motion-ease` — durations everything new here draws from rather than
one-off numbers, plus a five-stop `--ai-hue-1..5` sweep (teal → cyan → soft
blue → violet → soft pink) replacing the three-stop one from the previous
AI-glow session. `--ai-hue-4` reuses `--accent-2` (`#7c3aed`), which was
already reserved in a comment for exactly this and had never actually been
used anywhere.

**Reusable components** (`src/components/ui/`), matching the spec's naming
list where a real one was warranted:
- `AIButton` — replaces the inline `.ai-glow` markup from the previous
  session's spelling-check button with a proper component: idle rim, faster
  rim while `pending`, and a brief checkmark held on the pending→false
  transition before settling back (a real completed-state cue, not just a
  color change). Currently used once (spelling & clarity) but written
  generically for the next AI-touched action.
- `MedLnkPulse` — the ambient "this is alive" cue. Originally a single thin
  sweeping gradient line; redone from a reference mockup into three
  overlapping wavy SVG paths (period-matched translateX loops, so each
  drifts seamlessly at its own speed) in the AI hues, sitting behind the
  greeting text as a soft flowing backdrop rather than a line beneath it —
  `absolute -z-10` inside a `relative isolate` wrapper so it never sits
  above the (readable, opaque) greeting text or the stat cards below it.
  Used once, deliberately: directly behind the dashboard greeting. The spec
  permits it in half a dozen places ("loading states," "empty states,"
  "community sections"...); scattering a decorative element across every
  permitted surface reads as busier, not more premium, so this stayed to
  the one placement that's actually load-bearing for "the interface feels
  alive." Verified with two screenshots ~2.5s apart confirming the waves
  visibly moved, not just that the markup renders.
- `AnimatedNumber` — a real requestAnimationFrame count-up (cubic ease-out,
  500ms), wired into all four Home stat cards. Only animates when a
  *mounted* instance's value prop actually changes (e.g. a future live
  refresh) — on first paint there's nothing to count from, so it renders
  the number directly rather than a gimmicky always-count-from-zero. Checks
  `prefers-reduced-motion` itself since it's JS-driven, not a CSS
  transition the global reduced-motion rule already covers.
- `PageTransition` — a one-line named wrapper over React 19's native
  `<ViewTransition>`, which this app already uses (Home's feed-tab
  crossfade, the tab underline) — not a second, competing transition
  system. Exists so future call sites read as "a MEDLNK page transition"
  rather than a bare, unexplained `<ViewTransition>`; not yet adopted at
  any new call site since the existing two usages already do the job.
- `AnimatedCard`/`NetworkPulse`/`AIGradient`/`AnimatedNavigation` from the
  spec's component list were **not** built as separate files — each one's
  actual behavior is a few Tailwind classes plus the shared `.ai-glow`/
  `.case-card-hover` CSS already in `globals.css`, applied directly at each
  card/nav call site (stat cards, quick-create tiles, case cards, bottom
  nav). Wrapping that in an extra component layer would be indirection
  without reuse — nothing calls it from more than one place. `.ai-glow`
  is the de facto `AIGradient` implementation; the bottom nav directly *is*
  the "animated navigation."

**`.ai-glow`** (existing, extended): five-hue gradient (was three), `:hover`
speeds the idle spin from 6s to 3s (spec: "slightly increase gradient
movement" on hover), and a new `.ai-glow-round` modifier for circular
controls — used on the bottom nav's compose button as a permanent, low-key
ring (not tied to any pending state, since there's nothing to be "pending"
there). Building the round variant surfaced a real bug: the compose
NavLink had no background of its own when inactive, so the gradient
showed through the *whole* circle instead of just the rim — the same
containment failure the glow shipped with once before, just triggered a
different way (a transparent center this time, not an unclipped blur).
Fixed with a `matte` prop on `NavLink` that gives just that one instance an
opaque backing; every other nav item stays intentionally transparent so
its pill is the only thing that shows.

**Dashboard entrance**: `.stagger-1` through `.stagger-6` (60ms apart) pair
with the existing `.animate-enter`. Applied to the greeting/stats block,
the quick-create panel, and the tabs/chip row — not to the case feed itself,
deliberately: that's wrapped in `<ViewTransition key={...}>` for the tab
crossfade, and since Next.js keeps a Server Component's non-keyed children
mounted across a searchParam-only navigation (confirmed: `.animate-enter`
only fires once per findable component here, not on every tab switch),
adding a second, unrelated entrance animation on top of an element that
*does* re-mount on every tab switch would visibly double up. Bottom nav
gets its own `.animate-enter` in `bottom-nav.tsx` (a persistent layout
component, separate from page.tsx's stagger sequence by construction).

**Hover choreography**: stat cards lift 3px with a stronger border/shadow
and a `group-hover:scale-110` icon; quick-create's five tiles each get a
*distinct* micro-motion tied to what the icon represents (document nudges
up for Share a Case/Upload a Resource, the question mark tilts, the speech
bubble scales up, the bolt does a one-shot `medlnk-bolt-pulse` keyframe);
case cards (`.case-card-hover`) lift 3px, deepen their shadow, and reveal a
thin `--ai-hue` line along the top edge — all `group`-driven off one
`<article>` so the "Let's dive deep →" arrow's `group-hover:translate-x-1`
comes along for free. This also converted the case feed from a flush,
divided list into actual spaced, rounded cards (`mx-4 my-3 rounded-2xl`,
matching every other card on Home) — the spec's hover language ("lift,"
"shadow") only makes sense on a card that isn't already flush against the
screen edge, and the feed was the one surface on Home still styled as a
flat list while everything else already used the rounded-card language.

**Bottom nav sliding pill**: the active item's `bg-accent-soft` background
is now a separate `<span>` wrapped in `<ViewTransition name="nav-pill">`
(same mechanism as the existing tab underline), rendered only on the
active item — React gives it a continuous identity across the navigation
that switching nav items triggers, so the browser glides it rather than
popping it. The active icon also lifts 2px (`-translate-y-0.5`).

**Compose page restructure**: the previously flat field list is now four
numbered groups — 01 The Case, 02 Clinical Context, 03 Global Exchange, 04
Supporting Material — sharing one continuous `--ai-hue` gradient line drawn
once behind all four circles (not four separate segments needing careful
alignment). Every existing field, conditional block (Near Miss, the
comparison picker, the interactive question), and validation rule moved
into its matching section unchanged — this is a visual regroup, not a
rewrite; still one page, no wizard/step-gating. `FormSection`, the small
local component doing this, lives in `compose-form.tsx` itself since
nothing else uses it yet.

**Not done / deliberately scoped down** (spec sections 12–13 mostly): a
page-level ambient background beyond the existing Home greeting gradient
wash, and the "network/connection motif" (thin lines + dots + traveling
light) beyond the case-card top-edge line — both are explicitly "occasional,
extremely subtle" in the spec itself, and given everything above already
adds real motion to every major surface, spending further time chasing two
more decorative-only asks read as diminishing returns against the spec's
own "not flashy" instruction. A distinct one-shot "click pulse" on the AI
button (spec: "brief soft pulse, then return to idle") was also not built
separately — clicking already flips `pending` true almost immediately,
and `.ai-glow-active`'s faster spin **is** the pulse response in practice;
a second, purpose-built flash animation stacked on top would be motion for
its own sake.

**Verified against the real hosted DB** (throwaway verified test account,
cleaned up after): dashboard entrance, stat-card/quick-create/case-card
hover states, the bottom nav's sliding pill (screenshotted on `/` then
after navigating to `/search` to confirm it actually moved, not just that
both states render), the compose page's four numbered sections with their
connecting line, and `prefers-reduced-motion` (`page.emulateMedia`)
confirmed zeroing every new animation's computed duration, not just the
pre-existing ones. Caught and fixed the bottom-nav glow containment bug
described above via screenshot before shipping it. `tsc`/lint/build clean;
local Postgres suite unaffected (no schema changes this pass).

### Feed card: right-side photo thumbnail

Requested directly: a post's photo moved from a full-width block below the
caption to a small square thumbnail (`aspect-square w-20 sm:w-24`) beside
the title/caption, `case-card.tsx`. Considered and rejected real
multi-photo support (a "+3 more" badge) in the same request — a post can
only carry one photo today (`media_url` is a single column), and the user
confirmed they just wanted the existing single photo repositioned, not a
new upload capability. Video posts are untouched: still full-width with
native `<video controls>`, since a small non-interactive thumbnail can't
offer those. Verified by posting a real case with a photo through the
actual compose form and screenshotting the resulting feed card.

### Required specialty/tags for full write-up formats; "Add an update" on cards

Two requested together:

- Specialty and at least one tag are now required (client `required`
  attribute + server-side check in `createCaseAction`) for every format
  where `!typeMeta.shortForm` — Clinical case, Near Miss, Safety Alert,
  Case vs Case, Case Evolution, What Would You Do?, Research Finding. The
  quick formats (Photo, Quote, "I saw this today", Clinical Pearl, Things I
  Wish I Knew, Video) stay optional, matching their already-optional body.
  Rationale: specialty/tags are exactly what search and Global Case
  Exchange filter on, so an untagged full case was effectively unfindable.
- Case Evolution already let an author add to their own case without a new
  post — `CaseTimeline`'s "+ Add an update" (0008/interactive-cases era) —
  but it only appeared after opening the case page and scrolling past the
  full body, which reads as "no way to do this but repost" if you don't
  know it's there. Added a matching "+ Add an update" link next to "Let's
  dive deep" on the author's own feed cards (`case-card.tsx` gained an
  optional `viewerId` prop, now threaded through from all four call sites:
  Home, search, exchange, profile), deep-linking to a new `#case-timeline`
  anchor on the case page so it lands right on the existing composer
  instead of just the top of the page.
- Verified against the real hosted DB: confirmed native validation blocks
  submitting a Clinical Case without specialty/tags ("Please fill out this
  field"), confirmed it posts once filled, confirmed the feed-card link
  shows only for the author, and confirmed clicking it lands exactly on the
  "+ Add an update" button on the case page (screenshotted, not just
  asserted). `tsc`/lint/build clean; no schema change.

### "Other" reply label (0023)

0011 was deliberately five reply labels ("a picker long enough to need
thought stops being used"); requested directly anyway, so widened the
`comments_label_check` constraint (drop + recreate, same pattern as every
other constraint widening this session) to add `other`. Everything else —
the composer's picker, the thread's badges, server-side validation — is
already data-driven off `COMMENT_LABELS` (`src/lib/comment-labels.ts`), so
adding the one entry there was the only app-level change needed.

Also fixed a rough edge found while verifying: submitting a reply with a
label the hosted project's constraint doesn't know about yet surfaced the
raw Postgres error ("new row for relation... violates check constraint
...") straight to the user. `addCommentAction` already had a friendly
42703 ("migration not applied") message for the equivalent missing-column
case (0011 itself) — added the matching one for 23514 (check_violation) on
`comments_label_check` specifically, so this and any future label addition
degrades the same clear way before its migration is applied.

Bundled into `APPLY_TO_HOSTED.sql` (checklist row: `comments.label allows
other`); **not yet applied to the hosted project** — see the banner at the
top of this file. Confirmed via `apply-file.sh` (applies cleanly twice)
and by reproducing the exact pre-migration failure mode live (real login,
real case, "Other" picked, clear error shown — not a guess) before writing
the fix for it. `supabase/tests/0023_comment_label_other.test.sql` (3
assertions) passes locally.

## Security review

Full pass over RLS policies, Server Actions, storage/upload paths, and
common web-app vectors (XSS, SQL injection, open redirect, secrets exposure,
CSRF, dependency vulnerabilities). `npm audit`: 0 vulnerabilities. No
`dangerouslySetInnerHTML` anywhere. No raw SQL string interpolation — every
`.rpc()` call uses named parameters. No API route handlers (everything is
Server Actions/Server Components, a small surface). Service-role key is only
ever used in `scripts/seed.ts`, never in `src/app` or `src/components`.

**Fixed (0018-0020, all covered by `supabase/tests/`):**

1. **Critical — profiles privilege escalation.** `profiles_update_own` (0004)
   is row-level only. Any signed-in member could self-set `is_admin`,
   `verified`/`verification_status`, or clear `suspended_at` via a direct
   PostgREST PATCH — full admin access or bypassing license verification
   entirely, MEDLNK's core trust mechanism. Same bug class 0013 already fixed
   for `moderation_status`, just never applied to `profiles`. Fixed with the
   same pattern: a `before update` trigger (`guard_profile_privilege_columns`)
   that blocks a change to any of the five privileged columns unless the
   caller is an admin. 11 test assertions
   (`0018_profiles_privilege_guard.test.sql`), including that admin actions,
   ordinary self-edits, and trusted server roles all still work.
2. **Medium — specialist answer reassignment.** `specialist_answers_update_own`
   let a responder move their own existing answer onto a *different* request
   via `request_id`, without re-checking the specialty match the insert
   policy enforces — a non-cardiologist's old cardiology answer could be
   walked onto a nephrology request, misrepresenting the "Specialist Answer"
   badge. Fixed by re-running the same `is_specialist_in()` check in the
   update policy's `WITH CHECK`.
3. **Medium — unrestricted file upload.** Neither `case-images` nor `avatars`
   set `file_size_limit`/`allowed_mime_types`, and the app passed the
   client-supplied `File.type` straight through as the stored Content-Type —
   both buckets are public, so this was an open door to host arbitrary files
   (including HTML/script; SVG especially) under the project's own Supabase
   domain, plus no cap on storage abuse. Fixed at both layers: bucket-level
   limit + allowlist (8 MiB, JPEG/PNG/WebP/GIF only — SVG deliberately
   excluded) in 0020, and an application-level check
   (`src/lib/uploads.ts`) that also derives the stored extension from the
   validated MIME type instead of the client-supplied filename.

**`supabase/URGENT_SECURITY_FIX.sql`** is a standalone paste containing just
these three fixes, for landing #1 in seconds without waiting on the full
`APPLY_TO_HOSTED.sql`. Verified against a from-scratch local Postgres
reproducing the actual current hosted state (migrations 0001-0017 applied,
matching the owner's confirmed 34/36-row checklist runs) — applied twice
(idempotent), the exploit attempt confirmed blocked via raw SQL output (not
just trusting the test suite), then the full 20-file schema test suite run
against the result. `APPLY_TO_HOSTED.sql` has the identical fix folded in too
(two new `SECURITY:` checklist rows), so running that instead also covers it.

**Noted, not fixed (low severity, judgement calls rather than clear bugs):**

- `cases.case_number` is `unique` but has no update-time guard — an author
  could rename their own case's number to any other unused string via a raw
  PATCH. Self-contained (the unique constraint stops collisions with another
  case) and cosmetic at worst; not a cross-user boundary violation.
- `case_reasoning_nodes`/`case_comparisons` update policies let an author
  move a node/comparison onto a *different case they also own*, without
  re-validating the parent-in-same-case invariant reasoning trees enforce at
  insert. Contained to the author's own content either way.
- No app-level max-length validation on profile text fields (`full_name`,
  `city`, `license_number`, etc.) — a minor storage-bloat/abuse vector, not
  implemented given the size of the fix relative to severity.
- `scanForIdentifiersAction`/`polishDraftAction`/`triggerRecapAction`
  (`src/app/actions/ai.ts`) have no auth check of their own — currently moot
  since the Edge Functions they call aren't deployed (see below), but worth
  adding an auth gate before they are, so an anonymous caller can't run up
  Anthropic API cost by invoking the Server Action directly.

## ⚠️ Blocking manual steps

**Update, this session:** the owner ran `supabase/APPLY_TO_HOSTED.sql`
against the real hosted project and confirmed all 34 checklist rows read
`ok` — 0005 through 0016 are live. Since then, 0017 (Clinical Reasoning Trees
+ Global Case Exchange), 0018-0020 (**security fixes — see above, apply
these first**), and 0021 (locale/language preference) landed and add six new
checklist rows; **the file needs re-pasting once more** to pick those up, or
run `supabase/URGENT_SECURITY_FIX.sql` right now for just the security fixes
and the rest whenever convenient. Re-running either is a no-op for everything
already applied — verified twice by `apply-file.sh` before this was pushed.
Until 0021 is applied, `/settings`'s language switcher silently no-ops on
save (no `locale` column to write to, and `setLocaleAction` doesn't surface
write errors — same pattern as `setStudentModeAction`) — confusing UX but
not a crash, and it's the last thing in the paste file.

The owner also explicitly declined to deploy the Edge Functions ("I don't
want to buy it" — they require Anthropic billing). That is an accepted,
intentional gap, not a blocker: every call site treats the AI functions as
best-effort and degrades to "No AI recap yet" / no writing-check suggestions
/ no identifier-scan nudge. AI "Explain This Case" (§13) was never built for
the same reason. Don't chase this unless the owner changes their mind.

**Run `supabase/APPLY_TO_HOSTED.sql` in the Supabase SQL Editor** to pick up
0017-0021. One paste, one Run — it is a re-runnable union of every migration
the hosted project might be missing, ending in a checklist that should read
`ok` throughout (39 rows as of 0021, two of them marked `SECURITY:`).

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
