import type { ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";

/**
 * Wraps a phone mockup in a slow 3D perspective drift plus a settle-in on
 * entry, so it reads as something a camera is looking at from an angle
 * (like the reference ad's phone-in-hand shots) rather than a flat icon
 * centered on a slide.
 */
export function Handheld({
  children,
  entrance = true,
}: {
  children: ReactNode;
  entrance?: boolean;
}) {
  const frame = useCurrentFrame();

  const driftY = Math.sin(frame / 70) * 4 - 6;
  const driftX = Math.cos(frame / 95) * 3 + 8;

  const settleIn = entrance
    ? interpolate(frame, [0, 20], [18, 0], { extrapolateRight: "clamp" })
    : 0;

  const rotateY = driftX + settleIn * 0.6;
  const rotateX = driftY + settleIn * 0.3;

  return (
    <div style={{ perspective: 1600 }}>
      <div
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** A soft diagonal light sweep, as if catching the glass — sits over a phone screen. */
export function ScreenGlare() {
  const frame = useCurrentFrame();
  const pos = interpolate(frame % 140, [0, 140], [-40, 140]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `linear-gradient(115deg, transparent ${pos - 18}%, rgba(255,255,255,0.14) ${pos}%, transparent ${pos + 18}%)`,
      }}
    />
  );
}
