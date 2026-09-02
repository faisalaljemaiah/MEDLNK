"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { SettingsIcon, SendIcon } from "@/components/icons";

export function TopHeader({ loggedIn }: { loggedIn: boolean }) {
  // Spool is the one deliberately dark, full-bleed view — its own black
  // background (ReelView) should show straight through the header rather
  // than sitting under a light bar, so the header goes transparent and its
  // text/icons flip to white only on this route.
  const onSpool = usePathname() === "/spool";

  return (
    <header
      className={clsx(
        "sticky top-0 z-20 flex items-center justify-between px-4 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))]",
        onSpool
          ? "bg-transparent"
          // A soft shadow-tint fade instead of a hard border-b — content
          // scrolling under a translucent header should fade into it, not
          // hit a hairline.
          : "bg-bg/95 shadow-[0_1px_0_rgb(var(--shadow-tint)/0.08),0_8px_16px_-12px_rgb(var(--shadow-tint)/0.15)] backdrop-blur",
      )}
    >
      <Link
        href="/"
        className={clsx("font-headline text-lg", onSpool ? "text-white" : "text-text")}
      >
        Asyashare
      </Link>
      <div className="flex shrink-0 items-center">
        <Link
          href={loggedIn ? "/settings" : "/welcome"}
          className={clsx(
            "flex w-9 shrink-0 items-center justify-center transition-transform duration-150 ease-out active:scale-90",
            onSpool ? "text-white" : "text-text",
          )}
          aria-label="Settings"
        >
          <SettingsIcon />
        </Link>
        <Link
          href={loggedIn ? "/messages" : "/welcome"}
          className={clsx(
            "flex w-9 shrink-0 items-center justify-center transition-transform duration-150 ease-out active:scale-90",
            onSpool ? "text-white" : "text-text",
          )}
          aria-label="Messages"
        >
          <SendIcon />
        </Link>
      </div>
    </header>
  );
}
