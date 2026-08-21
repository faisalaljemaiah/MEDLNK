import Link from "next/link";
import { clsx } from "clsx";
import { t, type TranslationKey } from "@/lib/i18n";
import type { Locale } from "@/lib/database.types";
import {
  BoltIcon,
  CommentIcon,
  FileIcon,
  FilePlusIcon,
  QuestionIcon,
} from "@/components/icons";
import type { ComponentType, SVGProps } from "react";

/**
 * Every action below opens an existing route — either the composer
 * preselected to an existing post type (compose/page.tsx reads ?type=) or
 * Ask a Specialist, which is where MEDLNK's real "start a discussion" flow
 * already lives. Nothing here is a new page.
 *
 * hoverClass gives each icon its own tiny, distinct micro-interaction on
 * hover rather than one shared motion for all five — a document nudges up
 * (it's "being shared"), a question mark tilts (it's "being asked"), a
 * speech bubble grows (it's "opening up"), a bolt pulses once (a jolt of
 * "update"), an upload document also nudges up (same "going out" motion as
 * sharing a case, since both are documents leaving the user).
 */
const ACTIONS: {
  href: string;
  labelKey: TranslationKey;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  hoverClass: string;
}[] = [
  {
    href: "/compose",
    labelKey: "quickCreate.shareCase",
    icon: FilePlusIcon,
    hoverClass: "group-hover:-translate-y-0.5",
  },
  {
    href: "/compose?type=what_would_you_do",
    labelKey: "quickCreate.askQuestion",
    icon: QuestionIcon,
    hoverClass: "group-hover:-rotate-6",
  },
  {
    href: "/consults",
    labelKey: "quickCreate.startDiscussion",
    icon: CommentIcon,
    hoverClass: "group-hover:scale-110",
  },
  {
    href: "/compose?type=saw_this_today",
    labelKey: "quickCreate.postUpdate",
    icon: BoltIcon,
    hoverClass: "group-hover:[animation:medlnk-bolt-pulse_500ms_ease-in-out]",
  },
  {
    href: "/compose?type=research_finding",
    labelKey: "quickCreate.uploadResource",
    icon: FileIcon,
    hoverClass: "group-hover:-translate-y-0.5",
  },
];

export function QuickCreatePanel({ locale }: { locale: Locale }) {
  return (
    <section className="mx-4 mt-4 rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-slate-900/[0.03]">
      <p className="text-sm font-medium text-text">{t(locale, "quickCreate.title")}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {ACTIONS.map((a) => (
          <Link
            key={a.labelKey}
            href={a.href}
            className="group flex flex-col items-start gap-2 rounded-xl border border-line px-3 py-2.5 transition-[transform,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-accent active:scale-[0.98] sm:items-center sm:text-center"
          >
            <span
              aria-hidden
              className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent transition-colors duration-200 ease-out group-hover:bg-accent/15"
            >
              <a.icon
                width={17}
                height={17}
                strokeWidth={2}
                className={clsx("transition-transform duration-200 ease-out", a.hoverClass)}
              />
            </span>
            <span className="font-label text-xs font-medium text-text">
              {t(locale, a.labelKey)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
