"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition } from "react";
import { clsx } from "clsx";
import { HomeIcon, CompassIcon, ReelIcon } from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { CreateMenu } from "@/components/create-menu";

type NavProfile = {
  handle: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export function BottomNav({ profile }: { profile: NavProfile | null }) {
  const pathname = usePathname();

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
      {/* border-t-white/70 over the general border color — a bright top
          edge is how light catches a floating translucent material, the
          same detail Apple's own toolbars use. */}
      <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-around rounded-full border border-line/60 border-t-white/70 bg-surface/75 px-3 py-2 shadow-[0_8px_24px_-8px_rgb(var(--shadow-tint)/0.18)] backdrop-blur-2xl backdrop-saturate-150">
        <NavLink href="/" active={pathname === "/"}>
          <HomeIcon filled={pathname === "/"} />
        </NavLink>
        {/* Discover absorbs Search — same route (/search), the page's own
            heading and content now read "Discover" (see search/page.tsx).
            Learn (Student Mode) has no nav slot of its own; it stays one tap
            away from the Discover page and the profile's action-links row. */}
        <NavLink href="/search" active={pathname === "/search"}>
          <CompassIcon />
        </NavLink>
        {/* The one nav item that creates rather than navigates gets a
            standing green/silver ring (.ai-glow-brand) — Create isn't an AI
            feature, so unlike the actual AI button this ring is static, not
            a spinning "thinking" cue seen every time someone opens the app. */}
        <span className="ai-glow ai-glow-round ai-glow-brand inline-flex">
          <CreateMenu active={pathname === "/compose"} />
        </span>
        {/* Spool (the reel/story browsing mode) took this slot back over
            Messages — Messages stays one tap away via the top header's send
            icon and the profile's action-links row, same as Settings. */}
        <NavLink href="/spool" active={pathname === "/spool"}>
          <ReelIcon />
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
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "relative flex items-center justify-center rounded-full p-2.5 transition-[color,transform] duration-150 ease-out active:scale-90",
        active ? "text-accent" : "text-muted hover:text-text",
      )}
    >
      {active && (
        // Named so it's the same element identity across the navigation that
        // switching nav items triggers — the browser glides the pill from
        // wherever it was to here instead of popping it into place.
        <ViewTransition name="nav-pill">
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-accent-soft shadow-[0_0_10px_-3px_rgba(15,118,110,0.45)]"
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
