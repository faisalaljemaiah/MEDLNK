import Link from "next/link";

/**
 * Every action below opens an existing route — either the composer
 * preselected to an existing post type (compose/page.tsx reads ?type=) or
 * Ask a Specialist, which is where MEDLNK's real "start a discussion" flow
 * already lives. Nothing here is a new page.
 */
const ACTIONS = [
  {
    href: "/compose",
    label: "Share a Case",
    hint: "The standard write-up",
    emoji: "🩺",
  },
  {
    href: "/compose?type=what_would_you_do",
    label: "Ask a Question",
    hint: "Readers answer before the reveal",
    emoji: "❓",
  },
  {
    href: "/consults",
    label: "Start a Discussion",
    hint: "Ask a specialist",
    emoji: "💬",
  },
  {
    href: "/compose?type=saw_this_today",
    label: "Post an Update",
    hint: "A quick, short-form post",
    emoji: "⚡",
  },
  {
    href: "/compose?type=research_finding",
    label: "Upload a Resource",
    hint: "Share a paper or finding",
    emoji: "📄",
  },
] as const;

export function QuickCreatePanel() {
  return (
    <section className="mx-4 mt-4 rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-slate-900/[0.03]">
      <p className="text-sm font-medium text-text">
        What would you like to share?
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {ACTIONS.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex flex-col items-start gap-1.5 rounded-xl border border-line px-3 py-2.5 transition-[transform,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-accent active:scale-[0.98] sm:items-center sm:text-center"
          >
            <span aria-hidden className="text-lg">
              {a.emoji}
            </span>
            <span className="font-label text-xs font-medium text-text">
              {a.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
