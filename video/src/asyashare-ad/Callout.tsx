import { interpolate, useCurrentFrame } from "remotion";

/** A large feature-callout burned onto the frame, in the spirit of the reference ad's "2x Photo" labels. */
export function Callout({ text, delay = 0 }: { text: string; delay?: number }) {
  const frame = useCurrentFrame();

  const local = Math.max(0, frame - delay);
  const opacity = interpolate(local, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(local, [0, 12], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        fontSize: 64,
        fontWeight: 700,
        color: "#fdfaf5",
        lineHeight: 1.05,
        maxWidth: 640,
        letterSpacing: "-0.015em",
        textShadow: "0 8px 40px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.5)",
      }}
    >
      {text}
    </div>
  );
}
