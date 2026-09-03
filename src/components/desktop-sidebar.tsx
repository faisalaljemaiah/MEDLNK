"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { HomeIcon, CompassIcon, SendIcon } from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { CreateMenu } from "@/components/create-menu";
import { Logo } from "@/components/brand";

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
 * `fixed left-0 top-0`, not a flex sibling of the content column — the
 * layout shell (`src/app/(app)/layout.tsx`) centers that column inside the
 * page, and a sidebar living inside that same centered wrapper would leave
 * a wide empty margin in front of it on any screen wider than the content
 * itself. Fixed positioning pins it to the browser's actual left edge
 * instead, independent of how the content column is centered; the content
 * column reserves the sidebar's width with `md:pl-56` so nothing sits
 * underneath it. Height is intrinsic to its own content, not the viewport —
 * four nav items don't come close to filling a typical screen, and forcing
 * full height (stretching the profile row down via `mt-auto`) just left a
 * large dead gap above it.
 */
export function DesktopSidebar({ profile }: { profile: NavProfile | null }) {
  const pathname = usePathname();
  const onSpool = pathname === "/spool";
  const profileHref = profile
    ? profile.handle
      ? `/u/${profile.handle}`
      : "/onboarding"
    : "/welcome";
  const isProfileActive = profile?.handle
    ? pathname === `/u/${profile.handle}`
    : pathname === "/onboarding" || pathname === "/welcome" || pathname === "/login";

  return (
    <aside
      className={clsx(
        "fixed left-0 top-0 z-10 hidden max-h-dvh w-56 flex-col gap-1 overflow-y-auto px-4 py-6 transition-colors duration-200 md:flex",
        onSpool ? "border-transparent bg-transparent" : "border-r border-line bg-bg",
      )}
    >
      <Link
        href="/"
        className={clsx("mb-6 flex items-center px-3", onSpool ? "text-white" : "text-text")}
      >
        <Logo markSize={26} wordmarkClassName="text-sm" />
      </Link>

      <SidebarLink href="/" label="Home" active={pathname === "/"} onSpool={onSpool}>
        <HomeIcon filled={pathname === "/"} />
      </SidebarLink>
      <SidebarLink href="/search" label="Discover" active={pathname === "/search"} onSpool={onSpool}>
        <CompassIcon />
      </SidebarLink>

      <div className="px-3 py-1">
        <span className="ai-glow ai-glow-round ai-glow-brand inline-flex w-full">
          <CreateMenu active={pathname === "/compose"} label="Create" />
        </span>
      </div>

      {/* Spool gave this slot back to Messages — Spool itself stays one tap
          away via the top header's button and the Discover page. */}
      <SidebarLink
        href="/messages"
        label="Messages"
        active={pathname.startsWith("/messages")}
        onSpool={onSpool}
      >
        <SendIcon />
      </SidebarLink>

      <div
        className={clsx(
          "mt-2 border-t pt-2",
          onSpool ? "border-white/10" : "border-line",
        )}
      >
        <Link
          href={profileHref}
          className={clsx(
            "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-out",
            isProfileActive
              ? onSpool
                ? "bg-white/15 text-white"
                : "bg-accent-soft text-accent"
              : onSpool
                ? "text-white/70 hover:text-white"
                : "text-muted hover:text-text",
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
  onSpool,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  /** Spool's transparent rail needs its own idle/active colors — the
   *  light-surface pair (text-muted, bg-accent-soft) would wash out on a
   *  black backdrop. */
  onSpool: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-out",
        active
          ? onSpool
            ? "bg-white/15 text-white"
            : "bg-accent-soft text-accent"
          : onSpool
            ? "text-white/70 hover:text-white"
            : "text-muted hover:text-text",
      )}
    >
      {children}
      {label}
    </Link>
  );
}
