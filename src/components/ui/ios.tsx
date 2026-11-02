"use client";

/**
 * iOS-style building blocks for the sign-up flow (signup, onboarding and its
 * steps, Settings → Interests): inset grouped lists with inline labels,
 * picker rows, a segmented control, frosted round controls, capsule buttons
 * and picture tiles. Colors come from theme.css tokens only, so dark mode
 * follows automatically. See docs/concepts/1a-signup-apple.png.
 */

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { useFormStatus } from "react-dom";

/* ---------- Screen chrome ---------- */

/** Full-height screen on the app background, content column, bottom CTA. */
export function FlowScreen({
  nav,
  children,
  footer,
  dir,
  lang,
}: {
  nav?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Only needed where the page's language differs from <html dir> — the
   *  signed-out sign-up page, whose language toggle is local state. */
  dir?: "ltr" | "rtl";
  lang?: string;
}) {
  return (
    <div dir={dir} lang={lang} className="flow-screen relative z-0 min-h-dvh bg-bg">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(0.5rem+env(safe-area-inset-top))]">
        {nav && <div className="flex h-[52px] items-center justify-between">{nav}</div>}
        <div className="flex flex-1 flex-col">{children}</div>
        {footer && <div className="mt-6 flex flex-col gap-3">{footer}</div>}
      </div>
    </div>
  );
}

const GLASS_CIRCLE =
  "glass-control flex size-11 shrink-0 items-center justify-center rounded-full text-text transition-transform duration-150 ease-out active:scale-90";

export function ChevronLeft() {
  return (
    <svg width="11" height="19" viewBox="0 0 11 19" aria-hidden className="rtl:-scale-x-100">
      <path d="M9.5 1.5 2 9.5l7.5 8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRight() {
  return (
    <svg width="8" height="13" viewBox="0 0 8 13" aria-hidden className="text-muted/60 rtl:-scale-x-100">
      <path d="M1.5 1.5 6.5 6.5l-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GlassBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} className={GLASS_CIRCLE}>
      <ChevronLeft />
    </Link>
  );
}

/** Back control that submits a server action (e.g. sign out on step 1). */
export function GlassBackButton({
  action,
  label,
}: {
  action: () => void | Promise<void>;
  label: string;
}) {
  return (
    <form action={action}>
      <button type="submit" aria-label={label} className={GLASS_CIRCLE}>
        <ChevronLeft />
      </button>
    </form>
  );
}

export function GlassPillLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="glass-control flex h-11 items-center rounded-full px-4 text-base font-semibold text-accent transition-transform duration-150 ease-out active:scale-95"
    >
      {children}
    </Link>
  );
}

export function StepProgress({ step, total = 3, label }: { step: number; total?: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={step}
      aria-label={label}
      className="flex gap-[5px]"
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={clsx("h-[5px] w-[34px] rounded-full", i < step ? "bg-accent" : "bg-text/12")}
        />
      ))}
    </div>
  );
}

/* ---------- Type ---------- */

export function StampTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h1 className={clsx("font-stamp stamp-ink text-[38px] text-accent", className)}>{children}</h1>
  );
}

export function Lede({ children }: { children: ReactNode }) {
  return <p className="mb-5 mt-2 text-[15px] leading-[1.38] text-muted">{children}</p>;
}

/* ---------- Grouped lists ---------- */

export function GroupedList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("ios-list overflow-hidden rounded-[22px] bg-surface", className)}>{children}</div>;
}

export function GroupHeader({ children }: { children: ReactNode }) {
  return <p className="px-4 pb-1.5 pt-5 text-[13px] uppercase text-muted">{children}</p>;
}

export function GroupFooter({ children }: { children: ReactNode }) {
  return <p className="px-4 pt-1.5 text-[13px] leading-snug text-muted">{children}</p>;
}

const ROW = "flex min-h-[50px] items-center px-4 text-[17px] text-text";

/** Inline-label text field: "Email   jane@…" like iOS Settings forms. */
export function InputRow({
  label,
  labelWidth = 108,
  trailing,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  labelWidth?: number;
  trailing?: ReactNode;
}) {
  return (
    <label className={clsx(ROW, "gap-2 focus-within:bg-accent-soft/40")}>
      <span className="shrink-0 whitespace-nowrap" style={{ minWidth: labelWidth }}>
        {label}
      </span>
      <input
        {...props}
        className="min-w-0 flex-1 bg-transparent py-3 text-[17px] text-text caret-accent outline-none placeholder:text-muted/55"
      />
      {trailing}
    </label>
  );
}

/**
 * Disclosure row backed by a native <select> laid invisibly over it — tapping
 * opens the platform's own picker (the iOS wheel on iPhone), while the row
 * itself shows the label, the current value, and a chevron.
 */
export function SelectRow({
  label,
  display,
  placeholder = "Choose",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  display: string | null;
  placeholder?: string;
}) {
  return (
    <label className={clsx(ROW, "relative gap-3 focus-within:bg-accent-soft/40", props.disabled && "opacity-50")}>
      <span className="shrink-0">{label}</span>
      <span className={clsx("ms-auto flex min-w-0 items-center gap-2", display ? "text-muted" : "text-muted/60")}>
        <span className="truncate">{display || placeholder}</span>
        <ChevronRight />
      </span>
      <select {...props} aria-label={label} className="absolute inset-0 h-full w-full cursor-pointer opacity-0">
        {children}
      </select>
    </label>
  );
}

/* ---------- Controls ---------- */

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full bg-muted/15 p-[3px]">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={clsx(
              "flex-1 truncate rounded-full px-1 py-[7px] text-[13.5px] transition-[background-color,box-shadow] duration-200 ease-out",
              on
                ? "bg-surface font-semibold text-text shadow-[0_3px_8px_rgb(0_0_0/0.12),0_0_0_0.5px_rgb(0_0_0/0.04)]"
                : "font-medium text-text",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function CheckCircle({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0 text-accent">
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      <path d="m7 12.3 3.3 3.2L17 8.8" fill="none" stroke="var(--accent-foreground)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EmptyCircle({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0 text-muted/50">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** Square-ish picture tile used for roles and interests. */
export function PictureTile({
  label,
  art,
  tint,
  selected,
  onClick,
  className,
  compact = false,
}: {
  label: string;
  art: string;
  tint: string;
  selected: boolean;
  onClick: () => void;
  className?: string;
  /** Centered art above the label, for the narrower 4-up case-type row. */
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      style={{ ["--tile" as string]: tint }}
      className={clsx(
        "picture-tile relative overflow-hidden rounded-[20px] transition-transform duration-150 ease-out active:scale-[0.96]",
        selected && "ring-[2.5px] ring-inset ring-accent",
        compact
          ? "flex h-[78px] flex-col items-center justify-center gap-1 px-1 text-center"
          : "h-[72px] px-2 py-2.5 text-start",
        className,
      )}
    >
      {compact ? (
        <>
          <span aria-hidden className="text-[26px] leading-none">{art}</span>
          <span className="text-[11.5px] font-semibold leading-tight tracking-[-0.01em] text-accent">{label}</span>
          {selected && (
            <span className="absolute end-1.5 top-1.5">
              <CheckCircle size={17} />
            </span>
          )}
        </>
      ) : (
        <>
          <span className="relative z-[2] block text-[13px] font-semibold leading-tight tracking-[-0.02em] text-accent">{label}</span>
          <span aria-hidden className="absolute -end-0.5 bottom-0 z-[1] rotate-[-8deg] text-[28px] leading-none">
            {art}
          </span>
          {selected && (
            <span className="absolute bottom-2 start-2.5 z-[3]">
              <CheckCircle size={22} />
            </span>
          )}
        </>
      )}
    </button>
  );
}

/* ---------- Buttons ---------- */

const CAPSULE =
  "flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-accent text-[17px] font-semibold tracking-[-0.02em] text-accent-foreground transition-[opacity,transform] duration-150 ease-out active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100";

export function CapsuleSubmit({
  children,
  pending: pendingOverride,
  disabled,
  pendingLabel,
}: {
  children: ReactNode;
  pending?: boolean;
  disabled?: boolean;
  /** Shown while submitting, in the page's language. */
  pendingLabel: string;
}) {
  const status = useFormStatus();
  const pending = pendingOverride ?? status.pending;
  return (
    <button type="submit" disabled={pending || disabled} className={CAPSULE}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function CapsuleLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={CAPSULE}>
      {children}
    </Link>
  );
}

/** Borderless purple text button ("I'll Do It Later", "Skip"). */
export function PlainLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={clsx("text-center text-[17px] font-medium tracking-[-0.02em] text-accent-2 transition-opacity active:opacity-60", className)}
    >
      {children}
    </Link>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="px-4 pt-3 text-[13px] text-danger">
      {children}
    </p>
  );
}
