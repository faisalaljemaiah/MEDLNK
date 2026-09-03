"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition, useEffect, useState } from "react";
import { clsx } from "clsx";
import { HomeIcon, CompassIcon, SendIcon } from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { CreateMenu } from "@/components/create-menu";

type NavProfile = {
  handle: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

/**
 * Scrolling down past the very top means "reading, give me the room back" —
 * shrinking the nav a touch (not hiding it, this is the app's only way to
 * reach Create/Messages/Search) reclaims a little vertical space without
 * losing the affordance. Scrolling back up means "I want to navigate,"
 * which restores full size immediately. A small +/-4px deadband against
 * the last known position avoids flipping state on sub-pixel scroll
 * jitter (momentum scrolling, elastic bounce).
 */
function useShrinkOnScrollDown() {
  const [shrunk, setShrunk] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      const delta = y - lastY;
      if (y > 80 && delta > 4) setShrunk(true);
      else if (delta < -4 || y < 80) setShrunk(false);
      lastY = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return shrunk;
}

export function BottomNav({ profile }: { profile: NavProfile | null }) {
  const pathname = usePathname();
  const onSpool = pathname === "/spool";
  const shrunk = useShrinkOnScrollDown();

  const profileHref = profile
    ? profile.handle
      ? `/u/${profile.handle}`
      : "/onboarding"
    : "/welcome";
  const isProfileActive = profile?.handle
    ? pathname === `/u/${profile.handle}`
    : pathname === "/onboarding" || pathname === "/welcome" || pathname === "/login";

  return (
    <nav className="animate-enter pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div
        style={{ transformOrigin: "center bottom" }}
        className={clsx(
          "pointer-events-auto mx-auto flex max-w-md items-center justify-around rounded-full px-3 py-2 transition-[color,background-color,transform] duration-200 ease-out",
          shrunk && "scale-90",
          onSpool
            ? "bg-transparent"
            // border-t-white/70 over the general border color — a bright top
            // edge is how light catches a floating translucent material, the
            // same detail Apple's own toolbars use.
            : "border border-line/60 border-t-white/70 bg-surface/75 shadow-[0_8px_24px_-8px_rgb(var(--shadow-tint)/0.18)] backdrop-blur-2xl backdrop-saturate-150",
        )}
      >
        <NavLink href="/" active={pathname === "/"} onSpool={onSpool}>
          <HomeIcon filled={pathname === "/"} />
        </NavLink>
        {/* Discover absorbs Search — same route (/search), the page's own
            heading and content now read "Discover" (see search/page.tsx).
            Learn (Student Mode) has no nav slot of its own; it stays one tap
            away from the Discover page and the profile's action-links row. */}
        <NavLink href="/search" active={pathname === "/search"} onSpool={onSpool}>
          <CompassIcon />
        </NavLink>
        {/* The one nav item that creates rather than navigates gets a
            standing green/silver ring (.ai-glow-brand) — Create isn't an AI
            feature, so unlike the actual AI button this ring is static, not
            a spinning "thinking" cue seen every time someone opens the app. */}
        <span className="ai-glow ai-glow-round ai-glow-brand inline-flex">
          <CreateMenu active={pathname === "/compose"} />
        </span>
        {/* Spool gave this slot back to Messages — Spool itself stays one
            tap away via the top header's button and the Discover page. */}
        <NavLink href="/messages" active={pathname.startsWith("/messages")} onSpool={onSpool}>
          <SendIcon />
        </NavLink>
        <Link
          href={profileHref}
          className={clsx(
            "flex items-center justify-center rounded-full p-0.5 transition-transform duration-150 ease-out active:scale-90",
            isProfileActive && "ring-2 ring-accent",
          )}
        >
          <Avatar
            avatarUrl={profile?.avatar_url}
            name={profile?.full_name}
            size="sm"
          />
        </Link>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  active,
  onSpool,
  children,
}: {
  href: string;
  active: boolean;
  /** Spool's transparent pill needs its own idle/active colors — the
   *  light-surface pair (text-muted, bg-accent-soft) would wash out on a
   *  black backdrop. */
  onSpool: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "relative flex items-center justify-center rounded-full p-2.5 transition-[color,transform] duration-150 ease-out active:scale-90",
        active
          ? "text-accent"
          : onSpool
            ? "text-white/70 hover:text-white"
            : "text-muted hover:text-text",
      )}
    >
      {active && (
        // Named so it's the same element identity across the navigation that
        // switching nav items triggers — the browser glides the pill from
        // wherever it was to here instead of popping it into place.
        <ViewTransition name="nav-pill">
          <span
            aria-hidden
            className={clsx(
              "absolute inset-0 rounded-full shadow-[0_0_10px_-3px_rgba(15,118,110,0.45)]",
              onSpool ? "bg-white/15" : "bg-accent-soft",
            )}
          />
        </ViewTransition>
      )}
      <span
        className={clsx(
          "relative z-[1] transition-transform duration-150 ease-out",
          active && "-translate-y-0.5",
        )}
      >
        {children}
      </span>
    </Link>
  );
}
