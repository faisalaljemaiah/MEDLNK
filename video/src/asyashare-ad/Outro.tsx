import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "./tokens";
import { Grain } from "./Grain";

export function Outro() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, mass: 0.6 } });
  const logoOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  const textOpacity = interpolate(frame, [22, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const textY = interpolate(frame, [22, 40], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 120% at 50% 30%, #3a332c 0%, ${colors.accent} 70%)`,
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      <Img
        src={staticFile("asyashare-logo.svg")}
        style={{
          width: 110,
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          filter: "brightness(0) invert(1) drop-shadow(0 0 40px rgba(255,255,255,0.35))",
        }}
      />
      <div
        style={{
          marginTop: 28,
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 52,
            fontWeight: 600,
            color: colors.accentForeground,
            letterSpacing: "-0.01em",
          }}
        >
          Asyashare
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 20,
            color: "#c9beae",
          }}
        >
          A clinical knowledge network for verified medical professionals.
        </div>
      </div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
}
