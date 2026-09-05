import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { colors } from "./tokens";
import { PhoneFrame } from "./PhoneFrame";
import { KenBurns } from "./KenBurns";
import { Callout } from "./Callout";

export function ScreenBeat({
  screen,
  calloutText,
  durationInFrames,
  calloutDelay = 20,
}: {
  screen: ReactNode;
  calloutText: string;
  durationInFrames: number;
  calloutDelay?: number;
}) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: colors.bg,
        opacity,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 90,
        padding: "0 100px",
      }}
    >
      <Callout text={calloutText} delay={calloutDelay} />
      <div style={{ overflow: "hidden", borderRadius: 56 }}>
        <PhoneFrame width={380} height={790}>
          <KenBurns durationInFrames={durationInFrames}>{screen}</KenBurns>
        </PhoneFrame>
      </div>
    </AbsoluteFill>
  );
}
