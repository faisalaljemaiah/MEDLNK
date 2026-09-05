import type { ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";

/** Slow scale+drift over `durationInFrames`, like a handheld product shot. */
export function KenBurns({
  children,
  durationInFrames,
  fromScale = 1,
  toScale = 1.08,
  fromY = 0,
  toY = -20,
}: {
  children: ReactNode;
  durationInFrames: number;
  fromScale?: number;
  toScale?: number;
  fromY?: number;
  toY?: number;
}) {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationInFrames], [fromScale, toScale], {
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [0, durationInFrames], [fromY, toY], {
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ transform: `scale(${scale}) translateY(${y}px)`, height: "100%" }}>
      {children}
    </div>
  );
}
