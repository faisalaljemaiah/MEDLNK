import Link from "next/link";
import { Logo } from "@/components/logo";
import { SendIcon } from "@/components/icons";

export function TopHeader({ loggedIn }: { loggedIn: boolean }) {
  return (
    <header className="sticky top-0 z-20 flex items-center border-b border-line bg-bg/95 px-4 py-2.5 backdrop-blur">
      <div className="w-9" />
      <Link
        href="/"
        className="mx-auto flex items-center gap-1.5 font-headline text-lg text-text"
      >
        <Logo size={24} />
        MEDLNK
      </Link>
      <Link
        href={loggedIn ? "/messages" : "/login"}
        className="flex w-9 shrink-0 items-center justify-center text-text"
        aria-label="Messages"
      >
        <SendIcon />
      </Link>
    </header>
  );
}
