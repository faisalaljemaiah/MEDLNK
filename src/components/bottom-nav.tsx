"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition } from "react";
import { clsx } from "clsx";
import {
  HomeIcon,
  ReelIcon,
  LearnIcon,
  PlusSquareIcon,
  SearchIcon,
} from "@/components/icons";
import { Avatar } from "@/components/avatar";

type NavProfile = {
  handle: string | null;
  full_name: string | null;
  avatar_url: string | null;
  student_mode?: boolean | null;
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
    <nav className="animate-enter pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-4">
      <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-around rounded-full border border-line/60 bg-surface/75 px-3 py-2 shadow-lg shadow-slate-900/10 backdrop-blur-2xl backdrop-saturate-150">
        <NavLink href="/" active={pathname === "/"}>
          <HomeIcon filled={pathname === "/"} />
        </NavLink>
        {/* Student Mode swaps this one slot rather than adding a sixth: five
            targets is already the most a thumb wants at the bottom of a phone,
            and the point of the mode is what the app leads with, not more of
            it. Reel stays reachable at /reel. */}
        {profile?.student_mode ? (
          <NavLink href="/learn" active={pathname === "/learn"}>
            <LearnIcon />
          </NavLink>
        ) : (
          <NavLink href="/reel" active={pathname === "/reel"}>
            <ReelIcon />
          </NavLink>
        )}
        {/* The one nav item that creates rather than navigates gets a
            standing, subtle AI-hue ring — same visual language as the AI
            button, just idling permanently rather than reacting to a
            request in flight, since there's no "processing" state here. */}
        <span className="ai-glow ai-glow-round inline-flex">
          <NavLink href="/compose" active={pathname === "/compose"} matte>
            <PlusSquareIcon />
          </NavLink>
        </span>
        <NavLink href="/search" active={pathname === "/search"}>
          <SearchIcon />
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
  matte,
  children,
}: {
  href: string;
  active: boolean;
  /** Opaque backing so a wrapping .ai-glow's rim doesn't bleed through the
   *  center — only the compose button uses this; every other NavLink is
   *  meant to stay transparent until its own active pill renders. */
  matte?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "relative flex items-center justify-center rounded-full p-2.5 transition-[color,transform] duration-150 ease-out active:scale-90",
        matte && !active && "bg-surface",
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
