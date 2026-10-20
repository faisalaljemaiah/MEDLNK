import type { ReactNode } from "react";
import { href } from "../router.ts";

export function TopBar({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <header className="topbar">
      <a className="icon-btn" href={href.home()} aria-label="Back to topics">
        ‹
      </a>
      <div className="topbar-title">
        {sub && <div className="topbar-sub">{sub}</div>}
        <h1>{title}</h1>
      </div>
      {right}
    </header>
  );
}
