import Link from "next/link";
import { Logo } from "@/components/logo";
import { BellIcon, SendIcon } from "@/components/icons";

export function TopHeader({
  loggedIn,
  unreadNotifications = 0,
}: {
  loggedIn: boolean;
  unreadNotifications?: number;
}) {
  return (
    <header className="sticky top-0 z-20 flex items-center border-b border-line bg-bg/95 px-4 py-2.5 backdrop-blur">
      {/* Matches the width of the icon pair opposite so the wordmark stays centred. */}
      <div className="w-18 shrink-0" />
      <Link
        href="/"
        className="mx-auto flex items-center gap-1.5 font-headline text-lg text-text"
      >
        <Logo size={24} />
        MEDLNK
      </Link>
      <div className="flex w-18 shrink-0 items-center justify-end">
        <Link
          href={loggedIn ? "/notifications" : "/login"}
          className="relative flex w-9 shrink-0 items-center justify-center text-text transition-transform duration-150 ease-out active:scale-90"
          aria-label={
            unreadNotifications > 0
              ? `Notifications, ${unreadNotifications} unread`
              : "Notifications"
          }
        >
          <BellIcon />
          {unreadNotifications > 0 && (
            // A dot, not a count: the number matters far less than "something
            // happened on a case you follow", and it stays legible at any total.
            <span className="absolute right-1 top-1 size-2 rounded-full bg-accent ring-2 ring-bg" />
          )}
        </Link>
        <Link
          href={loggedIn ? "/messages" : "/login"}
          className="flex w-9 shrink-0 items-center justify-center text-text transition-transform duration-150 ease-out active:scale-90"
          aria-label="Messages"
        >
          <SendIcon />
        </Link>
      </div>
    </header>
  );
}
