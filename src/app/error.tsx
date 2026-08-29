"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <p className="font-headline text-lg text-text">Asyashare</p>
      <div className="flex flex-col gap-2">
        <h1 className="font-headline text-2xl text-text">
          Something went wrong
        </h1>
        <p className="text-sm text-muted">
          An unexpected error occurred. You can try again, or head back home.
        </p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-transform duration-150 ease-out active:scale-95"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-text transition-[border-color,color] duration-150 ease-out hover:border-accent hover:text-accent active:scale-95"
        >
          Back to Asyashare
        </Link>
      </div>
    </div>
  );
}
