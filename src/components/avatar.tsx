import Image from "next/image";
import { clsx } from "clsx";

/**
 * Every placeholder avatar used to render the exact same flat bg-surface-2
 * circle regardless of who it was — a row of three people with no photo
 * yet (very common right after signup) looked like three copies of one
 * template. iOS does the same thing this does for a contact with no photo:
 * a deterministic color per person, not a single neutral default. Same
 * lightness/saturation family as the rest of the app's status colors
 * (--positive, --danger, --badge-*) rather than raw saturated hues, so a
 * grid of placeholders reads as "a set of people" and not as new brand
 * colors competing with --accent.
 */
const PLACEHOLDER_PALETTE = [
  { bg: "#2563eb", fg: "#ffffff" }, // blue
  { bg: "#0b7c44", fg: "#ffffff" }, // green
  { bg: "#7c3aed", fg: "#ffffff" }, // violet
  { bg: "#b45309", fg: "#ffffff" }, // amber
  { bg: "#be185d", fg: "#ffffff" }, // pink
  { bg: "#0e7490", fg: "#ffffff" }, // teal
  { bg: "#4338ca", fg: "#ffffff" }, // indigo
  { bg: "#a16207", fg: "#ffffff" }, // gold
] as const;

function placeholderColors(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return PLACEHOLDER_PALETTE[Math.abs(hash) % PLACEHOLDER_PALETTE.length];
}

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-9 w-9 text-xs",
  lg: "h-20 w-20 text-2xl",
  xl: "h-24 w-24 text-3xl",
} as const;

const PIXELS: Record<keyof typeof SIZES, number> = {
  xs: 24,
  sm: 36,
  lg: 80,
  xl: 96,
};

export function Avatar({
  avatarUrl,
  name,
  size = "sm",
  square = false,
  className,
}: {
  avatarUrl: string | null | undefined;
  name: string | null | undefined;
  size?: keyof typeof SIZES;
  /** Rounded-square instead of circular — every existing caller stays
   *  circular by default, this is opt-in per usage. */
  square?: boolean;
  className?: string;
}) {
  const initial = (name ?? "?").charAt(0).toUpperCase();
  const shape = square ? "rounded-xl" : "rounded-full";

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name ?? "Profile picture"}
        width={PIXELS[size]}
        height={PIXELS[size]}
        className={clsx("shrink-0 object-cover", shape, SIZES[size], className)}
      />
    );
  }

  // No name at all (a fully anonymous "?") stays the neutral surface tone —
  // assigning it a color from the palette would suggest an identity that
  // isn't there. Everyone with an actual name gets their own color.
  const colors = name ? placeholderColors(name) : null;

  return (
    <div
      className={clsx(
        "flex shrink-0 items-center justify-center font-label",
        !colors && "bg-surface-2 text-muted",
        shape,
        SIZES[size],
        className,
      )}
      style={colors ? { backgroundColor: colors.bg, color: colors.fg } : undefined}
    >
      {initial}
    </div>
  );
}
