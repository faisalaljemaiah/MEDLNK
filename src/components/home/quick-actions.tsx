import Link from "next/link";
import { FileIcon, QuestionIcon, BoltIcon } from "@/components/icons";

const QUICK_ACTIONS = [
  {
    type: "clinical_case",
    label: "Share a Case",
    icon: FileIcon,
  },
  {
    type: "what_would_you_do",
    label: "Ask a Question",
    icon: QuestionIcon,
  },
  {
    type: "saw_this_today",
    label: "Quick Update",
    icon: BoltIcon,
  },
] as const;

/**
 * Three compact entry points onto /compose?type=<case_type> — replaces the
 * single ComposerRow pill (IA redesign, this session). "Start a Discussion"
 * and "Post an Update" from the spec don't map to a distinct real case
 * type, so both fold into "Quick Update" → saw_this_today, Asyashare's
 * existing lightweight post format, rather than inventing new ones. Every
 * other format stays reachable from the full post-type picker on /compose
 * itself — this is just three extra one-tap shortcuts into it, not a new
 * content model.
 */
export function QuickActions() {
  return (
    <div className="grid grid-cols-3 gap-2 px-4">
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.type}
          href={`/compose?type=${action.type}`}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface px-2 py-3 text-center transition-colors duration-150 ease-out hover:border-accent/40 active:scale-[0.98]"
        >
          <action.icon
            width={18}
            height={18}
            strokeWidth={2}
            className="shrink-0 text-accent"
            aria-hidden="true"
          />
          <span className="text-xs font-medium leading-tight text-text">
            {action.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
