"use client";

import { useFormStatus } from "react-dom";
import { clsx } from "clsx";

export function SubmitButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={clsx(
        "rounded-lg bg-accent px-4 py-2.5 font-medium text-white transition-opacity disabled:opacity-60",
        className,
      )}
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}
