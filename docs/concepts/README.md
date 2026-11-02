# Design concepts (not built yet)

Mockups agreed in principle, waiting to be discussed one by one before
building. Each has a rendered `.png` and the `.html` it was rendered from.
Nothing here is wired into the app.

Images are emoji on colored tiles, not stock photos (licensing). Custom
illustrations could replace them later in the same slots.

**Theme correction:** concepts 0, 1, 2 and 4 use teal (#0f766e), which is the
app's old accent. The real theme (src/app/theme.css) is the "stamped document"
look: ink #2b2420 and cream #f0ebe6. Build with the real tokens, as in
`1b-interests-stamped.png`.

**Stamped headlines:** Gloock Regular (OFL, free for commercial use; chosen
over EricaOne) with a sparse ink-fleck mask matching the logo mark.
Big headlines only (about 30px and up). Everything else stays on the system font.

## 0. Header and nav (`0-header-nav.png`)
- Transparent header, no bar background.
- `+` compose circle on the left, `ASYASHARE` wordmark centered (real
  `Wordmark` style: bold, uppercase, 0.2em tracking), notification dash icon
  in a circle on the right with the unread dot.
- Bottom nav kept as the floating glass pill, made more transparent.

## 1. Personalized home feed (`1-personalized-feed.png`)
- **Signup step: pick interests.** Specialty prefilled from role. Topics and
  case types as picture tiles, minimum 3.
- **Home:** greeting, "Your cases for today", Continue reading card, filter
  chips (For you / Following / topics), and a reason line on each post
  ("Because you follow Patient safety", "Dana R., who you follow, posted").
- **Further down the feed:** Clinicians you might know (specialty, mutual
  follows, same university) and Add to your interests (topics they read a lot
  but haven't picked).
- Ranking idea: followed people, then their topics, then specialty, then
  trending. Reading history drives topic suggestions.
- Build first: the signup interest step, since the feed depends on it.
- Latest version of the signup step: `1b-interests-stamped.png` (real ink
  theme, stamped headline, logo, warm paper-toned tiles, plus a "You're in."
  confirmation screen that previews the first personalized case).
- Sign-up flow that goes with it: `1a-signup-stamped.png`, same stamped
  style. Create account (name, email, password, terms; same fields as
  today) → Step 1 "Who are you?" (photo, name, handle, role as picture
  tiles with sub-role chips, specialty, where you practice) → Step 2 pick
  interests → Step 3 "Get verified." (camera viewfinder for the license or
  student ID, Take a photo / Upload file) → "You're in." Today the
  document upload sits inside the profile form; this splits it into its
  own last step.
- Tile pictures are swappable: one image per tile. Use one consistent set
  (same illustrator or icon pack), square, transparent background, about
  512px.

## 2. Explore and discover (`2-discover.png`)
- **Discover home:** search, Browse by specialty (Clinical Pharmacy, Internal
  Medicine, Psychiatry, Surgery, Research, Pharmacology) as colored picture
  cards with case counts, Trending this week carousel with rank and case type.
- **Specialty page:** banner with case count, follower count and Follow
  specialty button; tabs Top / Latest / Near misses / Q&A; case list with
  picture thumbnails (case photo when there is one).

## 4. Meaningful notifications (`4-notifications.png`)
- **Inbox:** tabs All / Replies / Mentions / Follows / Topics, grouped by
  Today and This week, unread highlighted, type badge on each avatar.
- Reply shows the comment, the case, and Reply / View case buttons. Mention
  shows the comment with the @name highlighted. Follow has Follow back. New
  case in a followed topic shows a topic thumbnail and title.
- Reactions grouped into one notification with totals per reaction.
- **Settings:** per-type toggles, reactions Off / Daily / All, topic alerts
  for top cases only with editable topics, quiet hours.
- Already exists: notifications page, follow and reply alerts, push, weekly
  follower email digest. New: mentions, topic alerts, grouped reactions,
  inline actions, settings screen.

(Idea 3 not discussed yet.)
