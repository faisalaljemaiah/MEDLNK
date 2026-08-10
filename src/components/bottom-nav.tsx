"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { HomeIcon, ReelIcon, SendIcon, SearchIcon } from "@/components/icons";
import { Avatar } from "@/components/avatar";

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
    : "/login";
  const isProfileActive = profile?.handle
    ? pathname === `/u/${profile.handle}`
    : pathname === "/onboarding" || pathname === "/login";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-4 py-2">
        <NavLink href="/" active={pathname === "/"}>
          <HomeIcon filled={pathname === "/"} />
        </NavLink>
        <NavLink href="/reel" active={pathname === "/reel"}>
          <ReelIcon />
        </NavLink>
        <NavLink href="/compose" active={pathname === "/compose"}>
          <SendIcon filled={pathname === "/compose"} />
        </NavLink>
        <NavLink href="/search" active={pathname === "/search"}>
          <SearchIcon />
        </NavLink>
        <Link
          href={profileHref}
          className={clsx(
            "flex items-center justify-center rounded-full p-0.5",
            isProfileActive && "ring-2 ring-text",
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
        "flex items-center justify-center rounded-full p-2.5 transition-colors",
        active ? "text-text" : "text-muted",
      )}
    >
      {children}
    </Link>
  );
}
