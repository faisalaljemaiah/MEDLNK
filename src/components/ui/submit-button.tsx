"use client";

import { useFormStatus } from "react-dom";
import { clsx } from "clsx";

export function SubmitButton({
  children,
  className,
  disabled,
  pending: pendingOverride,
}: {
  children: React.ReactNode;
  className?: string;
  /** Extra condition to disable on, beyond the form's own pending state — e.g. an async step still running client-side before submit makes sense. */
  disabled?: boolean;
  /**
   * Overrides useFormStatus's own read below. That hook only reflects a
   * form submitted through the native action-prop wiring; a caller that
   * rewrites FormData and calls the action manually inside its own
   * transition (see onboarding-form.tsx) isn't submitting that way, so
   * useFormStatus would report `pending: false` throughout — this lets such
   * a caller supply the real pending state instead.
   */
  pending?: boolean;
}) {
  const formStatus = useFormStatus();
  const pending = pendingOverride ?? formStatus.pending;

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={clsx(
        // Press feedback was missing entirely on the app's single most-used
        // CTA — scale(0.97) on :active is emil-design-eng's baseline for
        // "buttons must feel responsive," subtle enough not to read as a
        // bounce.
        "rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-foreground transition-[opacity,transform] duration-150 ease-out active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100",
        className,
      )}
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}
