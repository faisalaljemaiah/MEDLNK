import { buildLibrary } from "./library.ts";

// Every content/<topic>/*.json file is bundled at build time and validated here.
const files = import.meta.glob("../content/*/*.json", { eager: true, import: "default" });

export const library = buildLibrary(files);

export function findLesson(topicId: string, lessonId: string) {
  const t = library.topics.find((x) => x.topic.id === topicId);
  const index = t?.lessons.findIndex((l) => l.id === lessonId) ?? -1;
  if (!t || index < 0) return null;
  return { topic: t.topic, lesson: t.lessons[index], index, total: t.lessons.length, next: t.lessons[index + 1] };
}
