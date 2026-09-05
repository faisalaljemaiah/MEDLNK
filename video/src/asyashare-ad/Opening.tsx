import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "./tokens";
import { PhoneFrame } from "./PhoneFrame";

export function Opening() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneScale = spring({ frame, fps, config: { damping: 14, mass: 0.7 } });
  const phoneOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  const pulse = 1 + Math.sin(frame / 8) * 0.04;

  const taglineOpacity = interpolate(frame, [30, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(90% 90% at 50% 40%, ${colors.surface2} 0%, ${colors.bg} 65%)`,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          opacity: phoneOpacity,
          transform: `scale(${phoneScale})`,
        }}
      >
        <PhoneFrame width={340} height={710}>
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
            <Img
              src={staticFile("asyashare-logo.svg")}
              style={{ width: 72, transform: `scale(${pulse})`, color: colors.accent }}
            />
          </AbsoluteFill>
        </PhoneFrame>
      </div>

      <div
        style={{
          marginTop: 40,
          fontSize: 26,
          fontWeight: 600,
          color: colors.text,
          opacity: taglineOpacity,
          textAlign: "center",
        }}
      >
        Where verified clinicians think out loud.
      </div>
    </AbsoluteFill>
  );
}
