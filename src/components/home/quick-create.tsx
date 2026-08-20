import Link from "next/link";
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
 */
const ACTIONS: {
  href: string;
  labelKey: TranslationKey;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  {
    href: "/compose",
    labelKey: "quickCreate.shareCase",
    icon: FilePlusIcon,
  },
  {
    href: "/compose?type=what_would_you_do",
    labelKey: "quickCreate.askQuestion",
    icon: QuestionIcon,
  },
  {
    href: "/consults",
    labelKey: "quickCreate.startDiscussion",
    icon: CommentIcon,
  },
  {
    href: "/compose?type=saw_this_today",
    labelKey: "quickCreate.postUpdate",
    icon: BoltIcon,
  },
  {
    href: "/compose?type=research_finding",
    labelKey: "quickCreate.uploadResource",
    icon: FileIcon,
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
            className="flex flex-col items-start gap-2 rounded-xl border border-line px-3 py-2.5 transition-[transform,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-accent active:scale-[0.98] sm:items-center sm:text-center"
          >
            <span
              aria-hidden
              className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent"
            >
              <a.icon width={17} height={17} strokeWidth={2} />
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
