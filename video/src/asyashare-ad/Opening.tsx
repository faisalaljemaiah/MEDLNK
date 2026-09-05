import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CinematicBackdrop } from "./CinematicBackdrop";
import { PhoneFrame } from "./PhoneFrame";
import { Handheld } from "./Handheld";

export function Opening() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneScale = spring({ frame, fps, config: { damping: 14, mass: 0.7 } });
  const phoneOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  const pulse = 1 + Math.sin(frame / 8) * 0.05;

  const taglineOpacity = interpolate(frame, [32, 48], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineY = interpolate(frame, [32, 48], [18, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <CinematicBackdrop warm />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ opacity: phoneOpacity, transform: `scale(${phoneScale})` }}>
          <Handheld entrance={false}>
            <PhoneFrame width={330} height={690}>
              <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
                <Img
                  src={staticFile("asyashare-logo.svg")}
                  style={{
                    width: 68,
                    transform: `scale(${pulse})`,
                    filter: "brightness(0) saturate(100%)",
                  }}
                />
              </AbsoluteFill>
            </PhoneFrame>
          </Handheld>
        </div>

        <div
          style={{
            marginTop: 52,
            fontSize: 34,
            fontWeight: 700,
            color: "#fdfaf5",
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            textAlign: "center",
            textShadow: "0 8px 30px rgba(0,0,0,0.6)",
          }}
        >
          Where verified clinicians think out loud.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
