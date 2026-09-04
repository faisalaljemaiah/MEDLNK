import type { Locale } from "@/lib/database.types";

export const LOCALES: { value: Locale; label: string; dir: "ltr" | "rtl" }[] = [
  { value: "en", label: "English", dir: "ltr" },
  { value: "ar", label: "العربية", dir: "rtl" },
];

export function localeDir(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

/**
 * A bounded translation of Asyashare's most visible chrome — Home, the settings
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
  "people.clinician": "Clinician",
  "people.follower": "follower",
  "people.followers": "followers",

  "nav.settings": "Settings",
  "nav.notifications": "Notifications",

  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.languageHint": "Changes what you see across Asyashare. Case write-ups, comments and other member-written content stay in whatever language they were written in.",
  "settings.save": "Save",
  "settings.saved": "Saved.",

  "common.unknownClinician": "Unknown clinician",
  "common.case": "case",
  "common.cases": "cases",
  "common.follow": "Follow",
  "common.following": "Following",

  "caseCard.diveDeep": "Let's dive deep",
  "caseCard.addUpdate": "+ Add an update",

  "messages.title": "Messages",
  "messages.subtitle": "Conversations and the communities you're part of.",
  "messages.tabCommunities": "Communities",
  "messages.tabDirect": "Direct Messages",
  "messages.verificationRequired": "Verification required",
  "messages.verificationRejected": "Your license verification was not approved. Contact support if you think this is a mistake.",
  "messages.verificationPending": "We manually review every license before you can message other clinicians. You'll be able to message as soon as you're approved.",
  "messages.noConversations": "No conversations yet. Message a clinician from their profile to start one.",
  "messages.noMessagesYet": "No messages yet",
  "messages.youPrefix": "You: ",

  "notifications.title": "Notifications",
  "notifications.markAllRead": "Mark all read",
  "notifications.empty": "Nothing yet. Follow a case and you'll hear when the author posts an update.",

  "search.title": "Discover",
  "search.placeholder": "Search cases, tags, specialties…",
  "search.anySpecialty": "Any specialty",
  "search.anyType": "Any type",
  "search.tagPlaceholder": "#tag",
  "search.searchButton": "Search",
  "search.browseExchange": "Browse the Global Case Exchange →",
  "search.emptyPrompt": "Search by title, tag or specialty — or narrow by specialty, post type and tag without typing anything.",
  "search.noResults": "Nothing matches those filters.",

  "profile.editProfile": "Edit profile",
  "profile.message": "Message",
  "profile.blocked": "You've blocked this account.",
  "profile.followers": "followers",
  "profile.following": "following",
  "profile.tabPosts": "Posts",
  "profile.tabMarked": "Marked",
  "profile.tabSaved": "Saved",
  "profile.emptyMarked": "Nothing marked yet. 💡 🧠 ⚠️ on a case and it collects here.",
  "profile.emptySaved": "No saved cases yet.",
  "profile.emptyPosts": "No cases shared yet.",
  "profile.noNameYet": "(no name yet)",

  "exchange.title": "Global Case Exchange",
  "exchange.subtitle": "Cases clinicians chose to share beyond their own country. Country only — never a hospital, unit or region.",
  "exchange.noCountries": "No cases have a country attached yet. Add one next time you post to put it on the map here.",
  "exchange.noneFromHere": "Nothing from here yet.",
  "exchange.from": "from",
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
  "people.clinician": "طبيب",
  "people.follower": "متابِع",
  "people.followers": "متابِعون",

  "nav.settings": "الإعدادات",
  "nav.notifications": "الإشعارات",

  "settings.title": "الإعدادات",
  "settings.language": "اللغة",
  "settings.languageHint": "يغيّر هذا ما تراه في Asyashare. تبقى الحالات والتعليقات ومحتوى الأعضاء الآخر بلغته الأصلية.",
  "settings.save": "حفظ",
  "settings.saved": "تم الحفظ.",

  "common.unknownClinician": "طبيب غير معروف",
  "common.case": "حالة",
  "common.cases": "حالات",
  "common.follow": "متابعة",
  "common.following": "متابَع",

  "caseCard.diveDeep": "لنتعمق أكثر",
  "caseCard.addUpdate": "+ أضف تحديثاً",

  "messages.title": "الرسائل",
  "messages.subtitle": "المحادثات والمجتمعات التي أنت جزء منها.",
  "messages.tabCommunities": "المجتمعات",
  "messages.tabDirect": "الرسائل المباشرة",
  "messages.verificationRequired": "التحقق مطلوب",
  "messages.verificationRejected": "لم تتم الموافقة على التحقق من ترخيصك. تواصل مع الدعم إذا كنت تعتقد أن هذا خطأ.",
  "messages.verificationPending": "نراجع كل ترخيص يدوياً قبل السماح لك بمراسلة الأطباء الآخرين. ستتمكن من المراسلة فور الموافقة عليك.",
  "messages.noConversations": "لا توجد محادثات بعد. راسل طبيباً من صفحته الشخصية لبدء واحدة.",
  "messages.noMessagesYet": "لا توجد رسائل بعد",
  "messages.youPrefix": "أنت: ",

  "notifications.title": "الإشعارات",
  "notifications.markAllRead": "تحديد الكل كمقروء",
  "notifications.empty": "لا شيء بعد. تابع حالة وستُعلَم عندما ينشر صاحبها تحديثاً.",

  "search.title": "استكشف",
  "search.placeholder": "ابحث في الحالات والوسوم والتخصصات…",
  "search.anySpecialty": "أي تخصص",
  "search.anyType": "أي نوع",
  "search.tagPlaceholder": "#وسم",
  "search.searchButton": "بحث",
  "search.browseExchange": "تصفح شبكة تبادل الحالات العالمية ←",
  "search.emptyPrompt": "ابحث بالعنوان أو الوسم أو التخصص — أو صفّ النتائج حسب التخصص أو نوع المنشور أو الوسم دون كتابة أي شيء.",
  "search.noResults": "لا يوجد ما يطابق هذه الفلاتر.",

  "profile.editProfile": "تعديل الملف الشخصي",
  "profile.message": "مراسلة",
  "profile.blocked": "لقد حظرت هذا الحساب.",
  "profile.followers": "متابِعون",
  "profile.following": "متابَعون",
  "profile.tabPosts": "المنشورات",
  "profile.tabMarked": "المحفوظة بعلامة",
  "profile.tabSaved": "المحفوظات",
  "profile.emptyMarked": "لا شيء بعلامة بعد. 💡 🧠 ⚠️ على حالة وستُجمع هنا.",
  "profile.emptySaved": "لا توجد حالات محفوظة بعد.",
  "profile.emptyPosts": "لم تتم مشاركة أي حالات بعد.",
  "profile.noNameYet": "(لا يوجد اسم بعد)",

  "exchange.title": "شبكة تبادل الحالات العالمية",
  "exchange.subtitle": "حالات اختار الأطباء مشاركتها خارج بلدهم. الدولة فقط — لا يُذكر المستشفى أو القسم أو المنطقة أبداً.",
  "exchange.noCountries": "لا توجد حالات مرتبطة بدولة بعد. أضف دولة في منشورك القادم لتظهر هنا على الخريطة.",
  "exchange.noneFromHere": "لا يوجد شيء من هنا بعد.",
  "exchange.from": "من",
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
