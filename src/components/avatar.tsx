import Image from "next/image";
import { clsx } from "clsx";

const SIZES = {
  sm: "h-9 w-9 text-xs",
  lg: "h-20 w-20 text-2xl",
} as const;

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
        width={size === "lg" ? 80 : 36}
        height={size === "lg" ? 80 : 36}
        className={clsx("shrink-0 object-cover", shape, SIZES[size], className)}
      />
    );
  }

  return (
    <div
      className={clsx(
        "flex shrink-0 items-center justify-center bg-surface-2 font-label text-muted",
        shape,
        SIZES[size],
        className,
      )}
    >
      {initial}
    </div>
  );
}
