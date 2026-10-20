import { useSyncExternalStore } from "react";

// Hash routes keep the app working offline from any start URL:
//   #/                     home
//   #/play/<topic>/<lesson>
//   #/review/<topic>/<lesson>
export type Route =
  | { name: "home" }
  | { name: "play"; topic: string; lesson: string }
  | { name: "review"; topic: string; lesson: string };

function parse(hash: string): Route {
  const [name, topic, lesson] = hash.replace(/^#\/?/, "").split("/");
  if ((name === "play" || name === "review") && topic && lesson) return { name, topic, lesson };
  return { name: "home" };
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(
    (l) => {
      window.addEventListener("hashchange", l);
      return () => window.removeEventListener("hashchange", l);
    },
    () => location.hash,
  );
  return parse(hash);
}

export const href = {
  home: () => "#/",
  play: (t: string, l: string) => `#/play/${t}/${l}`,
  review: (t: string, l: string) => `#/review/${t}/${l}`,
};
