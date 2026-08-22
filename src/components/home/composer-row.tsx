import Link from "next/link";
import { PlusSquareIcon, ImageIcon } from "@/components/icons";

/**
 * The single quick-create entry point on Home — replaced the five-tile
 * "What would you like to share?" panel (requested directly). Every format
 * that panel linked to is still reachable from the post-type picker on
 * /compose itself; this is just one tap target instead of five.
 */
export function ComposerRow() {
  return (
    <Link
      href="/compose"
      className="mx-4 flex items-center gap-2.5 rounded-full border border-line bg-surface px-4 py-2.5 text-muted transition-colors duration-150 ease-out hover:border-accent/40 hover:text-text active:scale-[0.99]"
    >
      <PlusSquareIcon
        width={18}
        height={18}
        strokeWidth={2}
        className="shrink-0 text-accent"
        aria-hidden="true"
      />
      <span className="flex-1 truncate text-sm">
        Share a case or ask a question
      </span>
      <ImageIcon
        width={18}
        height={18}
        strokeWidth={2}
        className="shrink-0"
        aria-hidden="true"
      />
    </Link>
  );
}
