import Link from "next/link";
import { Logo } from "@/components/brand";

export function TopHeader() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-4 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] bg-bg/95 shadow-[0_1px_0_rgb(var(--shadow-tint)/0.08),0_8px_16px_-12px_rgb(var(--shadow-tint)/0.15)] backdrop-blur">
      <Link href="/" className="text-text">
        <Logo markSize={26} wordmarkClassName="text-sm" />
      </Link>
    </header>
  );
}
