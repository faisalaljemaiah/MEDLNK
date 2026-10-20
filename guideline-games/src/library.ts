// Turns the raw JSON files under content/ into validated topics.
// Shared by the app (via import.meta.glob) and scripts/validate.ts (via fs).
import { parseLesson, parseTopic, type Lesson, type Topic } from "./schema.ts";

export interface LoadedTopic {
  topic: Topic;
  lessons: Lesson[];
}

export interface Problem {
  file: string;
  errors: string[];
}

export interface Library {
  topics: LoadedTopic[];
  problems: Problem[];
}

/** `files` maps paths like ".../content/gerd-pud/topic.json" to parsed JSON. */
export function buildLibrary(files: Record<string, unknown>): Library {
  const problems: Problem[] = [];
  type Dir = { topicFile?: string; topic?: unknown; lessons: Map<string, [string, unknown]> };
  const dirs = new Map<string, Dir>();

  for (const [path, data] of Object.entries(files)) {
    const parts = path.split("/");
    const name = parts.at(-1)!.replace(/\.json$/, "");
    const dir = parts.at(-2)!;
    const entry: Dir = dirs.get(dir) ?? { lessons: new Map() };
    dirs.set(dir, entry);
    if (name === "topic") {
      entry.topicFile = path;
      entry.topic = data;
    } else entry.lessons.set(name, [path, data]);
  }

  const topics: LoadedTopic[] = [];
  for (const [dir, entry] of dirs) {
    if (!entry.topicFile) {
      problems.push({ file: `content/${dir}/`, errors: ["folder has no topic.json"] });
      continue;
    }
    const t = parseTopic(entry.topic);
    if (!t.ok) {
      problems.push({ file: short(entry.topicFile), errors: t.errors });
      continue;
    }
    if (t.value.id !== dir)
      problems.push({ file: short(entry.topicFile), errors: [`id "${t.value.id}" must match folder name "${dir}"`] });

    const lessons: Lesson[] = [];
    for (const lid of t.value.lessons) {
      const found = entry.lessons.get(lid);
      if (!found) {
        problems.push({ file: short(entry.topicFile), errors: [`lists lesson "${lid}" but ${lid}.json is missing`] });
        continue;
      }
      const l = parseLesson(found[1]);
      if (!l.ok) problems.push({ file: short(found[0]), errors: l.errors });
      else if (l.value.id !== lid)
        problems.push({ file: short(found[0]), errors: [`id "${l.value.id}" must match file name "${lid}"`] });
      else lessons.push(l.value);
    }
    for (const [lid, [path]] of entry.lessons)
      if (!t.value.lessons.includes(lid))
        problems.push({ file: short(path), errors: [`not listed in ${dir}/topic.json "lessons", so it is hidden`] });

    if (lessons.length) topics.push({ topic: t.value, lessons });
  }

  topics.sort((a, b) => (a.topic.order ?? 100) - (b.topic.order ?? 100) || a.topic.title.localeCompare(b.topic.title));
  return { topics, problems };
}

function short(path: string) {
  const i = path.lastIndexOf("content/");
  return i >= 0 ? path.slice(i) : path;
}
