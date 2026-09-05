import type { ProfileCardData } from "@/lib/profile";

/** Standard Open Graph size — also what the downloadable share card uses. */
export const PROFILE_CARD_SIZE = { width: 1200, height: 630 };

// Literal hex, not the theme.css custom properties: Satori (next/og's
// renderer) parses a static CSS subset and doesn't resolve var(--x). Kept in
// sync by hand with theme.css's --badge-gold/--badge-platinum/--positive and
// VerifiedBadge's default blue.
const TIER_COLOR: Record<string, string> = {
  gold: "#ca8a04",
  platinum: "#64748b",
  green: "#0b7c44",
};
const DEFAULT_VERIFIED_COLOR = "#2563eb";

// Same stops as .diamond-badge-spin in globals.css, as a static diagonal
// gradient — Satori (next/og's renderer) doesn't support conic-gradient or
// CSS mask/animation, so the spin and the checkmark-as-a-cutout-hole aren't
// reproducible here, but the actual iridescent colors are: a flat cyan
// stand-in would have thrown away the one thing that makes Diamond read as
// Diamond rather than "some other blue tier."
const DIAMOND_GRADIENT =
  "linear-gradient(135deg, #7dd3fc, #ffffff, #f0abfc, #a78bfa, #67e8f9, #fca5a5)";

/**
 * The shareable profile card — one design, two uses: the rich link preview
 * (opengraph-image.tsx / twitter-image.tsx, shown when the profile URL is
 * pasted anywhere) and the downloadable/postable PNG the Share button offers
 * (/api/profile-card/[handle]). Plain function, not JSX at the call site, so
 * it can be invoked directly from a route.ts that has no JSX of its own.
 */
export function ProfileCardImage({ data }: { data: ProfileCardData }) {
  const { full_name, handle, avatar_url, role, specialty, verified, badge_tier, followerCount } =
    data;
  const initial = (full_name ?? handle).charAt(0).toUpperCase();
  const isDiamond = badge_tier === "diamond";
  const tierColor = badge_tier ? (TIER_COLOR[badge_tier] ?? DEFAULT_VERIFIED_COLOR) : DEFAULT_VERIFIED_COLOR;
  const subtitle = [role, specialty].filter(Boolean).join(" · ");

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f6f8fc",
        padding: "56px 64px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: 6, color: "#2b2420" }}>
          ASYASHARE
        </span>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 48 }}>
        {avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- rendered by Satori (next/og), not the browser; next/image doesn't apply here.
          <img
            src={avatar_url}
            alt={full_name || handle}
            width={220}
            height={220}
            style={{
              borderRadius: "50%",
              objectFit: "cover",
              border: "6px solid #ffffff",
              boxShadow: "0 12px 32px rgba(16,32,58,0.18)",
            }}
          />
        ) : (
          <div
            style={{
              width: 220,
              height: 220,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#eaf0fa",
              color: "#56657f",
              fontSize: 96,
              fontWeight: 700,
              border: "6px solid #ffffff",
            }}
          >
            {initial}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 58, fontWeight: 700, color: "#10203a" }}>
              {full_name || `@${handle}`}
            </span>
            {verified && isDiamond && (
              // The real Diamond badge (globals.css's .diamond-badge) cuts the
              // checkmark as a literal transparent hole via a CSS mask, so
              // whatever sits behind it shows through — Satori can't run that
              // mask, but since the card's own background here is a flat
              // #f6f8fc, painting the check in that exact color reproduces the
              // same result: it reads as a hole because, pixel for pixel, it is
              // the same color as what a real hole would reveal.
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: DIAMOND_GRADIENT,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <path
                    d="M6 10.3l2.4 2.4L14 7"
                    stroke="#f6f8fc"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </div>
            )}
            {verified && !isDiamond && (
              // Same badge shape as VerifiedBadge (src/components/verified-badge.tsx),
              // drawn as an actual SVG path rather than a "✓" text glyph — Satori's
              // fallback font has no glyph for U+2713, which renders as a tofu box.
              <svg width="34" height="34" viewBox="0 0 20 20" fill={tierColor}>
                <circle cx="10" cy="10" r="10" />
                <path
                  d="M6 10.3l2.4 2.4L14 7"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            )}
          </div>
          <span style={{ fontSize: 32, color: "#56657f", display: "flex" }}>@{handle}</span>
          {subtitle && (
            <span style={{ fontSize: 28, color: "#56657f", display: "flex" }}>{subtitle}</span>
          )}
          {followerCount > 0 && (
            <span style={{ fontSize: 26, color: "#56657f", display: "flex" }}>
              {followerCount} {followerCount === 1 ? "follower" : "followers"}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#2b2420",
          borderRadius: 9999,
          padding: "26px 0",
        }}
      >
        <span style={{ fontSize: 36, fontWeight: 700, color: "#ffffff", letterSpacing: 1 }}>
          Follow me on Asyashare
        </span>
      </div>
    </div>
  );
}

/** Rendered when a handle doesn't resolve to a shareable profile (deleted, admin, never existed). */
export function FallbackCardImage() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f6f8fc",
      }}
    >
      <span style={{ fontSize: 56, fontWeight: 700, color: "#2b2420", letterSpacing: 6 }}>
        ASYASHARE
      </span>
    </div>
  );
}
