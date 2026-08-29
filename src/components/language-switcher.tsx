import { clsx } from "clsx";
import { setLocaleAction } from "@/app/actions/settings";
import { LOCALES, t } from "@/lib/i18n";
import type { Locale } from "@/lib/database.types";

/**
 * A form per option, not a client-side radio group: one value, one submit,
 * nothing to keep in sync with the server — same reasoning as
 * StudentModeToggle.
 */
export function LanguageSwitcher({ current }: { current: Locale }) {
  return (
    <div>
      <p className="text-sm font-medium text-text">{t(current, "settings.language")}</p>
      <p className="mt-0.5 text-xs text-muted">{t(current, "settings.languageHint")}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {LOCALES.map((l) => (
          <form key={l.value} action={setLocaleAction.bind(null, l.value)}>
            <button
              type="submit"
              disabled={current === l.value}
              className={clsx(
                "rounded-full border px-4 py-1.5 font-label text-xs transition-[background-color,border-color,color] duration-150 ease-out",
                current === l.value
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-line text-muted hover:text-text",
              )}
            >
              {l.label}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
