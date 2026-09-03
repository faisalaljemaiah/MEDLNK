import Link from "next/link";
import { clsx } from "clsx";
import { PlusSquareIcon } from "@/components/icons";

/**
 * The bottom nav's center slot — a plain Link into the post-type picker
 * /compose already has (clinical case, question, near miss, video, ...).
 */
export function CreateMenu({
  active,
  label,
}: {
  active: boolean;
  /** Desktop sidebar row (icon + "Create") instead of the bottom nav's
   *  small round icon button — same destination, different trigger chrome. */
  label?: string;
}) {
  return (
    <Link
      href="/compose"
      aria-label="Create"
      className={clsx(
        label
          ? "flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-out"
          : "relative flex items-center justify-center rounded-full p-2.5 transition-[color,transform] duration-150 ease-out active:scale-90",
        // Opaque backing so the wrapping .ai-glow's rim doesn't bleed
        // through the center — kept even when active, otherwise the
        // active state removes the backing and the glow fills the whole
        // button instead of staying a thin rim around it.
        label ? "bg-surface-2" : "bg-surface",
        active ? "text-accent" : "text-muted hover:text-text",
      )}
    >
      <span
        className={clsx(
          !label && "relative z-[1] transition-transform duration-150 ease-out",
          !label && active && "-translate-y-0.5",
        )}
      >
        <PlusSquareIcon />
      </span>
      {label && <span>{label}</span>}
    </Link>
  );
}
