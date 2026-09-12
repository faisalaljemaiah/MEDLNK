import Link from "next/link";
import { Logo } from "@/components/brand";
import { DashIcon } from "@/components/icons";

export function TopHeader({ unreadNotifications = 0 }: { unreadNotifications?: number }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between rounded-b-2xl px-4 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] bg-bg/95 shadow-[0_1px_0_rgb(var(--shadow-tint)/0.08),0_8px_16px_-12px_rgb(var(--shadow-tint)/0.15)] backdrop-blur">
      <Link href="/" className="text-text">
        <Logo markSize={26} wordmarkClassName="text-sm" />
      </Link>
      <Link
        href="/notifications"
        aria-label="Notifications"
        title="Notifications"
        className="relative flex size-9 items-center justify-center rounded-full text-text transition-transform duration-150 ease-out active:scale-90"
      >
        <DashIcon width={22} height={22} />
        {unreadNotifications > 0 && (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent"
          />
        )}
      </Link>
    </header>
  );
}
