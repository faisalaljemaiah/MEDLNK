import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Grain } from "./Grain";

/**
 * Warm, moody, vignetted lighting with a slow-drifting glow — a stand-in for
 * the practical lighting a real set/DP would give this shot. No live-action
 * plate exists to light, so this is the closest a CSS gradient gets to that
 * feel.
 */
export function CinematicBackdrop({ warm = true }: { warm?: boolean }) {
  const frame = useCurrentFrame();
  const driftX = 50 + Math.sin(frame / 90) * 12;
  const driftY = 38 + Math.cos(frame / 110) * 8;

  const glow = warm
    ? "rgba(255, 214, 170, 0.35)"
    : "rgba(180, 200, 255, 0.28)";

  return (
    <AbsoluteFill style={{ background: "#100d0a" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 55% at ${driftX}% ${driftY}%, ${glow} 0%, rgba(30,24,18,0) 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(120% 120% at 50% 15%, #3a3128 0%, #1c1712 55%, #0a0806 100%)",
        }}
      />
      {/* Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(80% 80% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
}
