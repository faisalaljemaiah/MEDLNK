"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { ReelIcon } from "@/components/icons";
import { Logo } from "@/components/brand";

export function TopHeader() {
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
      <Link href="/" className={onSpool ? "text-white" : "text-text"}>
        <Logo markSize={26} wordmarkClassName="text-sm" />
      </Link>
      {/* Settings and Messages gave up their header slot to Spool — both
          stay reachable one tap further in, from the profile page's own
          action-links row. */}
      <div className="flex items-center gap-1">
        {!onSpool && (
          <span className="flex items-center gap-1 font-label text-xs text-accent">
            Try Spool
            <span aria-hidden>→</span>
          </span>
        )}
        <Link
          href="/spool"
          className={clsx(
            "flex w-9 shrink-0 items-center justify-center transition-transform duration-150 ease-out active:scale-90",
            onSpool ? "text-white" : "text-text",
          )}
          aria-label="Spool"
        >
          <ReelIcon />
        </Link>
      </div>
    </header>
  );
}
