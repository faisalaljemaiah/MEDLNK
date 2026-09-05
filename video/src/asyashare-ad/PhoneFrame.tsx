import type { ReactNode } from "react";
import { colors } from "./tokens";

/**
 * A stylized phone bezel, not a literal device screenshot — this ad has no
 * live app backend to screen-record against, so the screens inside are
 * hand-built mockups using the real app's design tokens and copy instead.
 */
export function PhoneFrame({
  children,
  width = 430,
  height = 900,
}: {
  children: ReactNode;
  width?: number;
  height?: number;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 56,
        background: colors.accent,
        padding: 14,
        boxShadow: "0 60px 120px -30px rgba(16, 32, 58, 0.45)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 42,
          overflow: "hidden",
          background: colors.bg,
          position: "relative",
        }}
      >
        {/* Notch */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            width: 120,
            height: 28,
            borderRadius: 20,
            background: colors.accent,
            zIndex: 20,
          }}
        />
        {children}
      </div>
    </div>
  );
}
