import type { Locale } from "@/lib/database.types";

export const LOCALES: { value: Locale; label: string; dir: "ltr" | "rtl" }[] = [
  { value: "en", label: "English", dir: "ltr" },
  { value: "ar", label: "العربية", dir: "rtl" },
];

export function localeDir(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

/**
 * A bounded translation of MEDLNK's most visible chrome — Home, the settings
 * page itself, primary navigation — not the whole app. Case bodies, comments,
 * admin tooling and the rest stay English regardless of locale; translating
 * user-generated clinical content is a different, much larger project than
 * "does switching language actually change what you see." This proves the
 * mechanism (a real persisted preference, RTL layout, real translated
 * strings) on the screens a reader hits first.
 *
 * Flat key → string per locale, looked up through t(). A key missing from a
 * non-English dict falls back to English rather than showing the raw key, so
 * an incomplete translation degrades to "wrong language" instead of
 * "visibly broken."
 */
const en = {
  "greeting.morning": "Good morning",
  "greeting.afternoon": "Good afternoon",
  "greeting.evening": "Good evening",
  "greeting.subtitle": "Here's what's happening in your healthcare network today.",
  "greeting.personalized": "Personalized for {specialty}",

  "tabs.forYou": "For You",
  "tabs.following": "Following",
  "tabs.trending": "Trending",

  "stats.reputation": "Your reputation",
  "stats.connections": "Connections",
  "stats.casesShared": "Cases shared",
  "stats.communities": "Communities",
  "stats.specialtiesActive": "Specialties active",
  "stats.noChange": "No change this week",
  "stats.newThisWeek": "new",
  "stats.thisWeek": "this week",

  "quickCreate.title": "What would you like to share?",
  "quickCreate.shareCase": "Share a Case",
  "quickCreate.askQuestion": "Ask a Question",
  "quickCreate.startDiscussion": "Start a Discussion",
  "quickCreate.postUpdate": "Post an Update",
  "quickCreate.uploadResource": "Upload a Resource",

  "activity.title": "Your weekly activity",
  "activity.posts": "Posts created",
  "activity.comments": "Comments",
  "activity.reactions": "Reactions given",

  "communities.title": "Trending communities",
  "discussions.title": "Active discussions",
  "people.title": "People you may know",

  "nav.settings": "Settings",
  "nav.notifications": "Notifications",

  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.languageHint": "Changes what you see across MEDLNK. Case write-ups, comments and other member-written content stay in whatever language they were written in.",
  "settings.save": "Save",
  "settings.saved": "Saved.",
} as const;

export type TranslationKey = keyof typeof en;

const ar: Partial<Record<TranslationKey, string>> = {
  "greeting.morning": "صباح الخير",
  "greeting.afternoon": "مساء الخير",
  "greeting.evening": "مساء الخير",
  "greeting.subtitle": "إليك آخر مستجدات شبكتك الطبية اليوم.",
  "greeting.personalized": "مخصص لتخصص {specialty}",

  "tabs.forYou": "لك",
  "tabs.following": "المتابَعون",
  "tabs.trending": "الأكثر تداولاً",

  "stats.reputation": "سمعتك",
  "stats.connections": "الروابط",
  "stats.casesShared": "الحالات المشاركة",
  "stats.communities": "المجتمعات",
  "stats.specialtiesActive": "تخصصات نشطة",
  "stats.noChange": "لا تغيير هذا الأسبوع",
  "stats.newThisWeek": "جديد",
  "stats.thisWeek": "هذا الأسبوع",

  "quickCreate.title": "ماذا تود أن تشارك؟",
  "quickCreate.shareCase": "شارك حالة",
  "quickCreate.askQuestion": "اطرح سؤالاً",
  "quickCreate.startDiscussion": "ابدأ نقاشاً",
  "quickCreate.postUpdate": "انشر تحديثاً",
  "quickCreate.uploadResource": "ارفع مصدراً",

  "activity.title": "نشاطك الأسبوعي",
  "activity.posts": "منشورات",
  "activity.comments": "تعليقات",
  "activity.reactions": "تفاعلات",

  "communities.title": "مجتمعات رائجة",
  "discussions.title": "نقاشات نشطة",
  "people.title": "أشخاص قد تعرفهم",

  "nav.settings": "الإعدادات",
  "nav.notifications": "الإشعارات",

  "settings.title": "الإعدادات",
  "settings.language": "اللغة",
  "settings.languageHint": "يغيّر هذا ما تراه في MEDLNK. تبقى الحالات والتعليقات ومحتوى الأعضاء الآخر بلغته الأصلية.",
  "settings.save": "حفظ",
  "settings.saved": "تم الحفظ.",
};

const DICTS: Record<Locale, Partial<Record<TranslationKey, string>>> = { en, ar };

export function t(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string>,
): string {
  const raw = DICTS[locale]?.[key] ?? en[key] ?? key;
  if (!vars) return raw;
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, v),
    raw,
  );
}
