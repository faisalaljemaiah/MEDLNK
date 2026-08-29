import Link from "next/link";
import { Logo } from "@/components/logo";
import { SettingsIcon, SendIcon } from "@/components/icons";

export function TopHeader({ loggedIn }: { loggedIn: boolean }) {
  return (
    <header className="sticky top-0 z-20 flex items-center border-b border-line bg-bg/95 px-4 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] backdrop-blur">
      {/* Matches the width of the icon pair opposite so the wordmark stays centred. */}
      <div className="w-18 shrink-0" />
      <Link
        href="/"
        className="mx-auto flex items-center gap-1.5 font-headline text-lg text-text"
      >
        <Logo size={24} />
        Asyashare
      </Link>
      <div className="flex w-18 shrink-0 items-center justify-end">
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
