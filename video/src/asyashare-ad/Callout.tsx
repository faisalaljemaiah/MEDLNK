import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "./tokens";

/** A large feature-callout line, in the spirit of the reference ad's "2x Photo" labels. */
export function Callout({ text, delay = 0 }: { text: string; delay?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const x = interpolate(progress, [0, 1], [-40, 0]);

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${x}px)`,
        fontSize: 56,
        fontWeight: 600,
        color: colors.text,
        lineHeight: 1.1,
        maxWidth: 520,
        letterSpacing: "-0.01em",
      }}
    >
      {text}
    </div>
  );
}
