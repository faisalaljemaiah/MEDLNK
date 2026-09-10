import type { CaseCardData } from "@/lib/case-card-data";

/** Standard Open Graph size — same as the profile card. */
export const CASE_CARD_SIZE = { width: 1200, height: 630 };

/**
 * The shareable case teaser — one design, two uses: the rich link preview
 * (opengraph-image.tsx / twitter-image.tsx, shown when the case URL is
 * pasted anywhere, LinkedIn's own share dialog included) and, later, any
 * downloadable use the same way ProfileCardImage serves both
 * (src/lib/profile-card-image.tsx). Plain function, not a component with
 * its own file boundary, so a route.ts with no JSX of its own could call it
 * directly if one is ever added.
 */
export function CaseCardImage({ data }: { data: CaseCardData }) {
  const { title, short_caption, typeBadge, author } = data;
  const authorName = author?.full_name || (author?.handle ? `@${author.handle}` : null);
  const initial = (author?.full_name ?? author?.handle ?? "A").charAt(0).toUpperCase();

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: 6, color: "#2b2420" }}>
          ASYASHARE
        </span>
        {typeBadge && (
          <span
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 600,
              color: "#0f766e",
              backgroundColor: "#e4f3f1",
              borderRadius: 9999,
              padding: "8px 22px",
            }}
          >
            {typeBadge}
          </span>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
        <span
          style={{
            display: "flex",
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.15,
            color: "#10203a",
            // Satori has no line-clamp, so the height itself does the
            // clamping: three lines at this size and font, nothing more.
            maxHeight: 3 * 52 * 1.15,
            overflow: "hidden",
          }}
        >
          {title}
        </span>
        <span
          style={{
            display: "flex",
            fontSize: 30,
            lineHeight: 1.4,
            color: "#56657f",
            maxHeight: 3 * 30 * 1.4,
            overflow: "hidden",
          }}
        >
          {short_caption}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {author?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- rendered by Satori (next/og), not the browser.
          <img
            src={author.avatar_url}
            alt=""
            width={64}
            height={64}
            style={{
              borderRadius: "50%",
              objectFit: "cover",
              border: "3px solid #ffffff",
              boxShadow: "0 6px 16px rgba(16,32,58,0.16)",
            }}
          />
        ) : (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#eaf0fa",
              color: "#56657f",
              fontSize: 28,
              fontWeight: 700,
              border: "3px solid #ffffff",
            }}
          >
            {initial}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {authorName && (
            <span style={{ fontSize: 26, fontWeight: 600, color: "#10203a", display: "flex" }}>
              {authorName}
            </span>
          )}
          <span style={{ fontSize: 22, color: "#56657f", display: "flex" }}>
            Read the full case on Asyashare
          </span>
        </div>
      </div>
    </div>
  );
}
