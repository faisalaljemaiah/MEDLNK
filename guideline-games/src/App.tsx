import { useEffect } from "react";
import { findLesson } from "./content.ts";
import { useRoute } from "./router.ts";
import { useTheme } from "./theme.ts";
import { Home } from "./screens/Home.tsx";
import { Play } from "./screens/Play.tsx";
import { Review } from "./screens/Review.tsx";

export function App() {
  const route = useRoute();
  const { choice, cycle } = useTheme();

  useEffect(() => window.scrollTo(0, 0), [route.name, route.name !== "home" && route.lesson]);

  if (route.name !== "home") {
    const found = findLesson(route.topic, route.lesson);
    if (found) return route.name === "play" ? <Play {...found} /> : <Review topic={found.topic} lesson={found.lesson} />;
  }
  return <Home theme={choice} onTheme={cycle} />;
}
