import { Img, staticFile } from "remotion";
import { colors } from "./tokens";
import { BookmarkIcon, CommentIcon, RepostIcon, ShareIcon, VerifiedBadge } from "./icons";

function Avatar({ initials }: { initials: string }) {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        background: colors.accentSoft,
        color: colors.accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 15,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

// A hand-built mockup of the real feed (src/components/case-card.tsx),
// styled from the app's actual design tokens — there is no live backend to
// screen-record against here.
export function FeedScreen() {
  return (
    <div style={{ padding: "70px 22px 0", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
        <Img
          src={staticFile("asyashare-logo.svg")}
          style={{ width: 18, height: 18, color: colors.accent }}
        />
        <span style={{ fontWeight: 700, fontSize: 17, color: colors.text }}>Asyashare</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar initials="AF" />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
            Dr. Amara Fields
            <VerifiedBadge />
          </div>
          <div style={{ fontSize: 12, color: colors.muted }}>
            Emergency Medicine · Cardiology · 2h
          </div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: colors.muted }}>AS-2417</div>
      </div>

      <span
        style={{
          display: "inline-block",
          marginTop: 14,
          padding: "4px 12px",
          borderRadius: 999,
          border: `1px solid ${colors.accent}66`,
          background: `${colors.accent}1a`,
          color: colors.accent,
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        What would you do?
      </span>

      <h3
        style={{
          marginTop: 10,
          fontSize: 21,
          fontWeight: 600,
          color: colors.text,
          lineHeight: 1.25,
        }}
      >
        Post-op fever on day 3 — think beyond the obvious
      </h3>
      <p style={{ marginTop: 6, fontSize: 14, color: colors.muted, lineHeight: 1.5 }}>
        Afebrile through recovery, then a spike on POD3 with a clean workup.
        What's your next move before you call it atelectasis?
      </p>

      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["postop", "fever", "differential"].map((tag) => (
          <span
            key={tag}
            style={{
              padding: "3px 10px",
              borderRadius: 999,
              border: `1px solid ${colors.line}`,
              color: colors.muted,
              fontSize: 11,
            }}
          >
            #{tag}
          </span>
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          fontSize: 14,
          fontWeight: 600,
          color: colors.accent,
        }}
      >
        Let's dive deep →
      </div>

      <div
        style={{
          marginTop: 22,
          paddingTop: 16,
          borderTop: `1px solid ${colors.line}`,
          display: "flex",
          gap: 26,
          color: colors.muted,
        }}
      >
        {[
          [CommentIcon, 34],
          [RepostIcon, 6],
          [BookmarkIcon, 51],
          [ShareIcon, null],
        ].map(([Icon, count], i) => {
          const IconComp = Icon as React.ComponentType<{ width: number; height: number }>;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <IconComp width={18} height={18} />
              {count !== null && <span style={{ fontSize: 13 }}>{count as number}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
