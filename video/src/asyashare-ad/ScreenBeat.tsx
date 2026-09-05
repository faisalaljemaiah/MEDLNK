import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { PhoneFrame } from "./PhoneFrame";
import { KenBurns } from "./KenBurns";
import { Callout } from "./Callout";
import { Handheld } from "./Handheld";
import { CinematicBackdrop } from "./CinematicBackdrop";

export function ScreenBeat({
  screen,
  calloutText,
  durationInFrames,
  calloutDelay = 14,
  warm = true,
}: {
  screen: ReactNode;
  calloutText: string;
  durationInFrames: number;
  calloutDelay?: number;
  warm?: boolean;
}) {
  const frame = useCurrentFrame();
  const cutOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ opacity: Math.min(cutOpacity, fadeOut) }}>
      <CinematicBackdrop warm={warm} />
      <AbsoluteFill
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "0 140px 0 100px",
        }}
      >
        <div style={{ position: "absolute", left: 110, bottom: 130, zIndex: 5 }}>
          <Callout text={calloutText} delay={calloutDelay} />
        </div>
        <Handheld>
          <PhoneFrame width={400} height={830}>
            <KenBurns durationInFrames={durationInFrames} fromScale={1.1} toScale={1.22} fromY={0} toY={-30}>
              {screen}
            </KenBurns>
          </PhoneFrame>
        </Handheld>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
