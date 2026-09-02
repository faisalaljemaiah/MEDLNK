"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@/components/icons";

/**
 * router.back() rather than a fixed href — this is used on pages reached
 * from many different places (feed, profile, search, Spool...), so there's
 * no single "back to X" destination to hardcode the way onboarding's
 * back arrow can.
 */
export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Back"
      className="-ml-2 flex size-9 items-center justify-center rounded-full text-text transition-transform duration-150 ease-out active:scale-90"
    >
      <ArrowLeftIcon />
    </button>
  );
}
