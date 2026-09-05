import { Img, staticFile } from "remotion";
import { colors } from "./tokens";
import { VerifiedBadge } from "./icons";

function Avatar({ initials, tone }: { initials: string; tone: "accent" | "positive" }) {
  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        background: tone === "accent" ? colors.accentSoft : `${colors.positive}22`,
        color: tone === "accent" ? colors.accent : colors.positive,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 13,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function Bubble({
  children,
  align,
}: {
  children: React.ReactNode;
  align: "left" | "right";
}) {
  return (
    <div
      style={{
        maxWidth: "78%",
        alignSelf: align === "right" ? "flex-end" : "flex-start",
        background: align === "right" ? colors.accent : colors.surface,
        color: align === "right" ? colors.accentForeground : colors.text,
        border: align === "right" ? "none" : `1px solid ${colors.line}`,
        borderRadius: 16,
        padding: "12px 14px",
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

// A hand-built mockup of the "Ask a Specialist" consult thread — same
// caveat as FeedScreen: no live backend to record from, so this is styled
// from the app's real tokens rather than a literal screen capture.
export function SpecialistScreen() {
  return (
    <div
      style={{
        padding: "70px 20px 0",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Img
          src={staticFile("asyashare-logo.svg")}
          style={{ width: 16, height: 16 }}
        />
        <span style={{ fontWeight: 700, fontSize: 15, color: colors.text }}>
          Ask a Specialist
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Bubble align="right">
          Any reason to suspect Brugada before the echo, given the family
          history?
        </Bubble>

        <div style={{ display: "flex", gap: 10, alignSelf: "flex-start" }}>
          <Avatar initials="RK" tone="positive" />
          <Bubble align="left">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 4,
                fontSize: 12,
                fontWeight: 600,
                color: colors.positive,
              }}
            >
              Dr. Rhea Kagiso
              <VerifiedBadge color={colors.positive} size={13} />
              <span style={{ color: colors.muted, fontWeight: 400 }}>
                · Cardiology
              </span>
            </div>
            Yes — a type-1 pattern plus that history is enough to order one
            before symptoms, not after.
          </Bubble>
        </div>
      </div>

      <div style={{ marginTop: "auto", paddingBottom: 26 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            borderRadius: 999,
            background: `${colors.positive}18`,
            color: colors.positive,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          Verified specialist reply
        </span>
      </div>
    </div>
  );
}
