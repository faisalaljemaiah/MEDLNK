"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { HomeIcon, CompassIcon, SendIcon, SettingsIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { Avatar } from "@/components/avatar";
import { CreateMenu } from "@/components/create-menu";

type NavProfile = {
  handle: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

/**
 * Left nav rail for tablet/desktop widths — hidden below `md:` (768px,
 * roughly iPad-portrait and up), where the floating BottomNav (unchanged)
 * still owns navigation. Same four destinations as the bottom nav plus the
 * profile row, just vertical instead of a floating pill; the mobile shell
 * is untouched by this, it's a parallel nav for wider viewports.
 *
 * Height is intrinsic to its content (no `h-dvh` + `mt-auto` push) — five
 * nav items don't come close to filling a typical viewport, and stretching
 * the profile row down to the bottom of the screen just left a large dead
 * gap above it. `sticky top-0` still keeps it in view while the page
 * scrolls, it just doesn't force full-height any more.
 */
export function DesktopSidebar({ profile }: { profile: NavProfile | null }) {
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
    <aside className="sticky top-0 hidden w-56 shrink-0 flex-col gap-1 border-r border-line py-6 pr-4 md:flex">
      <Link
        href="/"
        className="mb-6 flex items-center gap-2 px-3 font-headline text-lg text-text"
      >
        <Logo size={28} />
        MEDLNK
      </Link>

      <SidebarLink href="/" label="Home" active={pathname === "/"}>
        <HomeIcon filled={pathname === "/"} />
      </SidebarLink>
      <SidebarLink href="/search" label="Discover" active={pathname === "/search"}>
        <CompassIcon />
      </SidebarLink>

      <div className="px-3 py-1">
        <span className="ai-glow ai-glow-round inline-flex w-full">
          <CreateMenu active={pathname === "/compose"} label="Create" />
        </span>
      </div>

      <SidebarLink
        href="/messages"
        label="Messages"
        active={pathname.startsWith("/messages")}
      >
        <SendIcon />
      </SidebarLink>
      <SidebarLink href="/settings" label="Settings" active={pathname === "/settings"}>
        <SettingsIcon />
      </SidebarLink>

      <div className="mt-2 border-t border-line pt-2">
        <Link
          href={profileHref}
          className={clsx(
            "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-out",
            isProfileActive ? "bg-accent-soft text-accent" : "text-muted hover:text-text",
          )}
        >
          <Avatar avatarUrl={profile?.avatar_url} name={profile?.full_name} size="sm" />
          <span className="truncate">{profile?.full_name ?? "Profile"}</span>
        </Link>
      </div>
    </aside>
  );
}

function SidebarLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-out",
        active ? "bg-accent-soft text-accent" : "text-muted hover:text-text",
      )}
    >
      {children}
      {label}
    </Link>
  );
}
