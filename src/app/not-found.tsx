import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <Logo size={48} />
      <div className="flex flex-col gap-2">
        <h1 className="font-headline text-2xl text-text">Page not found</h1>
        <p className="text-sm text-muted">
          This page doesn&apos;t exist, or it&apos;s no longer here.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-transform duration-150 ease-out active:scale-95"
      >
        Back to Asyashare
      </Link>
    </div>
  );
}
