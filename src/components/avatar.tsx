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
  className,
}: {
  avatarUrl: string | null | undefined;
  name: string | null | undefined;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const initial = (name ?? "?").charAt(0).toUpperCase();

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name ?? "Profile picture"}
        width={size === "lg" ? 80 : 36}
        height={size === "lg" ? 80 : 36}
        className={clsx(
          "shrink-0 rounded-full object-cover",
          SIZES[size],
          className,
        )}
      />
    );
  }

  return (
    <div
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-full bg-surface-2 font-label text-muted",
        SIZES[size],
        className,
      )}
    >
      {initial}
    </div>
  );
}
