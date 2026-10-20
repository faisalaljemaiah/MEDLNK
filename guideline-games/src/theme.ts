import { useEffect, useState } from "react";

export type ThemeChoice = "system" | "light" | "dark";
const KEY = "gg:theme";

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(() => {
    try {
      return (localStorage.getItem(KEY) as ThemeChoice) || "system";
    } catch {
      return "system";
    }
  });
  useEffect(() => {
    apply(choice);
    try {
      localStorage.setItem(KEY, choice);
    } catch {
      // ignore
    }
  }, [choice]);
  const cycle = () => setChoice((c) => (c === "system" ? "light" : c === "light" ? "dark" : "system"));
  return { choice, cycle };
}
