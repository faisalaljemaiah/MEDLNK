"use client";

import { useFormStatus } from "react-dom";
import { clsx } from "clsx";

export function SubmitButton({
  children,
  className,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  /** Extra condition to disable on, beyond the form's own pending state — e.g. an async step still running client-side before submit makes sense. */
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={clsx(
        "rounded-lg bg-accent px-4 py-2.5 font-medium text-on-accent transition-opacity disabled:opacity-60",
        className,
      )}
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}
