import Link from "next/link";
import { SettingsIcon, SendIcon } from "@/components/icons";

export function TopHeader({ loggedIn }: { loggedIn: boolean }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/95 px-4 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] backdrop-blur">
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
