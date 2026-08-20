import { t, type TranslationKey } from "@/lib/i18n";
import type { Locale } from "@/lib/database.types";

function timeOfDayKey(): TranslationKey {
  const hour = new Date().getHours();
  if (hour < 12) return "greeting.morning";
  if (hour < 18) return "greeting.afternoon";
  return "greeting.evening";
}

export function HomeGreeting({
  firstName,
  locale,
}: {
  firstName: string | null;
  locale: Locale;
}) {
  return (
    <div className="px-4 pt-5">
      <h1 className="font-headline text-xl text-text">
        {t(locale, timeOfDayKey())}
        {firstName ? `, ${firstName}` : ""}
      </h1>
      <p className="mt-0.5 text-sm text-muted">{t(locale, "greeting.subtitle")}</p>
    </div>
  );
}
