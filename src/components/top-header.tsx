import Link from "next/link";
import { SettingsIcon, SendIcon } from "@/components/icons";

export function TopHeader({ loggedIn }: { loggedIn: boolean }) {
  return (
    // A soft shadow-tint fade instead of a hard border-b — content scrolling
    // under a translucent header should fade into it, not hit a hairline.
    <header className="sticky top-0 z-20 flex items-center justify-between bg-bg/95 px-4 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] shadow-[0_1px_0_rgb(var(--shadow-tint)/0.08),0_8px_16px_-12px_rgb(var(--shadow-tint)/0.15)] backdrop-blur">
      <Link href="/" className="font-headline text-lg text-text">
        Asyashare
      </Link>
      <div className="flex shrink-0 items-center">
        <Link
          href={loggedIn ? "/settings" : "/welcome"}
          className="flex w-9 shrink-0 items-center justify-center text-text transition-transform duration-150 ease-out active:scale-90"
          aria-label="Settings"
        >
          <SettingsIcon />
        </Link>
        <Link
          href={loggedIn ? "/messages" : "/welcome"}
          className="flex w-9 shrink-0 items-center justify-center text-text transition-transform duration-150 ease-out active:scale-90"
          aria-label="Messages"
        >
          <SendIcon />
        </Link>
      </div>
    </header>
  );
}
