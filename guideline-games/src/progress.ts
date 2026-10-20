// Best results per lesson, kept on this device only.
import { useSyncExternalStore } from "react";

export interface LessonProgress {
  stars: number;
  score: number;
  plays: number;
}

type Store = Record<string, LessonProgress>;
const KEY = "gg:progress:v1";
const listeners = new Set<() => void>();
let cache: Store = read();

function read(): Store {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Store;
  } catch {
    return {};
  }
}

export function recordResult(topicId: string, lessonId: string, stars: number, score: number) {
  const k = `${topicId}/${lessonId}`;
  const prev = cache[k];
  cache = {
    ...cache,
    [k]: {
      stars: Math.max(prev?.stars ?? 0, stars),
      score: Math.max(prev?.score ?? 0, score),
      plays: (prev?.plays ?? 0) + 1,
    },
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Storage full or blocked: progress just won't persist.
  }
  listeners.forEach((l) => l());
  return prev;
}

export function useProgress(): Store {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => cache,
  );
}

export const progressKey = (topicId: string, lessonId: string) => `${topicId}/${lessonId}`;
